
"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ArrowRight,
  ArrowUp,
  Bot,
  FileSpreadsheet,
  Globe2,
  LoaderCircle,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import {
  initSearch,
  expandSearch,
  searchEntries,
  type CSVResponse,
} from "@/lib/routes";

import ChatMessage, {
  type Message,
  type ChatFile,
} from "@/components/chatbot/ChatMessege";

import AttributeSelector, {
  formatAttribute,
} from "@/components/chatbot/AttributeSelector";


type Stage =
  | "initial"
  | "scraping"
  | "ready_to_expand"
  | "expanding"
  | "selecting"
  | "enriching";

const welcome: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello! Share a webpage URL and briefly describe " +
    "what you're looking for. I'll scrape the webpage, " +
    "return an initial CSV, and suggest attributes " +
    "for further research.",
};

function extractInput(text: string) {
  const match = text.match(/https?:\/\/[^\s<>]+/i);

  if (!match) return null;

  const url = match[0].replace(/[),.;]+$/, "");

  try {
    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }
  } catch {
    return null;
  }

  return {
    url,
    description: text.replace(match[0], "").trim(),
  };
}

function getError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred.";
}

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([
    welcome,
  ]);

  const [stage, setStage] = useState<Stage>("initial");
  const [input, setInput] = useState("");

  const [datasetId, setDatasetId] = useState<
    string | null
  >(null);

  const [availableAttributes, setAvailableAttributes] =
    useState<string[]>([]);

  const [selectedAttributes, setSelectedAttributes] =
    useState<string[]>([]);

  const [researchDescription, setResearchDescription] = useState("");

  const [sampleSize] = useState(10);
  const scrollRef = useRef<HTMLDivElement>(null);
  const objectUrls = useRef<string[]>([]);
  const busyRef = useRef(false);

  const isLoading =
    stage === "scraping" ||
    stage === "expanding" ||
    stage === "enriching";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, stage, selectedAttributes]);

  useEffect(() => {
    return () => {
      objectUrls.current.forEach(URL.revokeObjectURL);
    };
  }, []);

  function addMessage(
    role: Message["role"],
    content: string,
    file?: ChatFile
  ) {
    setMessages((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        role,
        content,
        file,
      },
    ]);
  }

  function createFile(
    response: CSVResponse,
    filename: string
  ): ChatFile {
    const url = URL.createObjectURL(response.blob);

    objectUrls.current.push(url);

    return {
      filename,
      url,
      count: response.entryCount,
    };
  }

  function reset() {
    if (busyRef.current) return;

    setMessages([welcome]);
    setStage("initial");
    setInput("");
    setDatasetId(null);
    setAvailableAttributes([]);
    setSelectedAttributes([]);
  }

  async function handleInitial(text: string) {
    const parsed = extractInput(text);

    if (!parsed) {
      addMessage(
        "assistant",
        "Please provide a valid webpage URL beginning with " +
          "https:// or http://."
      );
      return;
    }
    console.log("scraping")
    busyRef.current = true;
    setStage("scraping");

    try {
      console.log("initSearch started")
      const initial = await initSearch([text]);

      console.log("initSearch complete")

      if (!initial.datasetId) {
        throw new Error("Missing dataset ID.");
      }

      const id = initial.datasetId;

      setDatasetId(id);
      setResearchDescription(parsed.description);

      const initialFile = createFile(
        initial,
        "initial.csv"
      );

      addMessage(
        "assistant",
        "I've completed the initial webpage scraping. " +
          "You can download the initial CSV below. " +
          "Review the entries before continuing.",
        initialFile
      );

      addMessage(
        "assistant",
        "When you're ready, click Proceed to research " +
          "a sample of entries and discover enrichment attributes."
      );

      // Wait for the user to click Proceed.
      setStage("ready_to_expand");

    } catch (error) {
      addMessage(
        "assistant",
        `Initial scraping failed: ${getError(error)}`
      );

      setStage("initial");

    } finally {
      busyRef.current = false;
    }
  }

  async function handleProceed() {
    if (!datasetId || busyRef.current) return;

    busyRef.current = true;
    setStage("expanding");

    addMessage(
      "user",
      "Proceed to attribute discovery."
    );

    try {
      const expanded = await expandSearch(
        datasetId,
        researchDescription,
        sampleSize
      );

      const sampleFile = createFile(
        expanded,
        "expanded_sample.csv"
      );

      const attributes = expanded.availableAttributes;

      setAvailableAttributes(attributes);
      setSelectedAttributes([]);

      addMessage(
        "assistant",
        "I've researched a sample of entries. " +
          "You can download the sample results below.",
        sampleFile
      );

      if (attributes.length === 0) {
        addMessage(
          "assistant",
          "No enrichment attributes were discovered. " +
            "You can try another webpage."
        );

        setStage("initial");
        return;
      }

      addMessage(
        "assistant",
        "Here are the suggested enrichment attributes. " +
          "Select the ones you'd like to research, or " +
          "type their names in the chat."
      );

      setStage("selecting");

    } catch (error) {
      addMessage(
        "assistant",
        `Attribute discovery failed: ${getError(error)}`
      );

      // Allow retry without rescraping.
      setStage("ready_to_expand");

    } finally {
      busyRef.current = false;
    }
  }

  function toggleAttribute(attribute: string) {
    setSelectedAttributes((current) =>
      current.includes(attribute)
        ? current.filter((item) => item !== attribute)
        : [...current, attribute]
    );
  }

  function resolveAttributes(text: string) {
    const normalized = text.toLowerCase();

    const requested = text
      .split(/[,;\n]+/)
      .map((item) =>
        item
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "_")
      );

    const exact = requested.filter((attr) =>
      availableAttributes.includes(attr)
    );

    if (exact.length > 0) {
      return [...new Set(exact)];
    }

    return availableAttributes.filter((attr) =>
      normalized.includes(
        attr.replaceAll("_", " ")
      ) || normalized.includes(attr)
    );
  }

  async function handleEnrichment(
    attributes: string[]
  ) {
    if (!datasetId) {
      addMessage(
        "assistant",
        "No dataset is active. Please start with a webpage."
      );
      return;
    }

    if (attributes.length === 0) {
      addMessage(
        "assistant",
        "Please select at least one suggested attribute."
      );
      return;
    }

    busyRef.current = true;
    setStage("enriching");

    try {
      // 3. Enrich every entry.
      const completed = await searchEntries(
        datasetId,
        attributes
      );

      const file = createFile(
        completed,
        "enriched.csv"
      );

      addMessage(
        "assistant",
        "Your full research dataset is complete! " +
          "The selected attributes are: " +
          attributes.map(formatAttribute).join(", ") +
          ". Download the completed CSV below.",
        file
      );

      addMessage(
        "assistant",
        "Would you like to research another webpage? " +
          "Send me another URL and a short description."
      );

      // Prepare for another research cycle.
      setDatasetId(null);
      setAvailableAttributes([]);
      setSelectedAttributes([]);
      setStage("initial");
    } catch (error) {
      addMessage(
        "assistant",
        "Full enrichment failed: " +
          getError(error) +
          " You can adjust the attributes and retry."
      );

      setStage("selecting");
    } finally {
      busyRef.current = false;
    }
  }

  async function handleSend() {
    const text = input.trim();

    if (!text || busyRef.current) return;

    if (stage === "ready_to_expand") {
      addMessage(
        "assistant",
        "Please click Proceed to continue to attribute discovery."
      );
      return;
    }

    setInput("");
    addMessage("user", text);

    if (stage === "initial") {
      await handleInitial(text);
      return;
    }

    if (stage === "selecting") {
      const requested = resolveAttributes(text);

      if (requested.length > 0) {
        setSelectedAttributes((previous) => [
          ...new Set([...previous, ...requested])
        ]);

        addMessage(
          "assistant",
          "I've selected the following attributes: " +
            requested.map(formatAttribute).join(", ") +
            ". Click Enrich all entries to begin the final search."
        );

        // Do NOT start enrichment automatically.
        return;
      }

      addMessage(
        "assistant",
        "I couldn't match those attributes. " +
          "Please enter names from the suggested list."
      );
    }
  }

  function submitSelected() {
    if (
      busyRef.current ||
      stage !== "selecting" ||
      selectedAttributes.length === 0
    ) {
      return;
    }

    addMessage(
      "user",
      "Enrich all entries with: " +
        selectedAttributes.map(formatAttribute).join(", ")
    );

    void handleEnrichment(selectedAttributes);
  }

  const loadingText = {
    scraping: "Scraping the initial webpage...",
    expanding: "Researching sample entries...",
    enriching: "Enriching the complete dataset...",
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Globe2 size={20} />
          </div>

          <div>
            <div className="brand-title">
              Databot
            </div>

            <div className="brand-subtitle">
              Scrape webpage data
            </div>
          </div>
        </div>

        <button
          className="new-chat-button"
          onClick={reset}
          disabled={isLoading}
        >
          <Plus size={17} />
          New research
        </button>

        <div className="sidebar-section">
          <span className="sidebar-label">
            WORKFLOW
          </span>

          <div className="workflow-item">
            <Globe2 size={16} />
            Initial scraping
          </div>

          <div className="workflow-item">
            <Sparkles size={16} />
            Attribute discovery
          </div>

          <div className="workflow-item">
            <FileSpreadsheet size={16} />
            Complete dataset
          </div>
        </div>

        <div className="sidebar-footer">
          Research assistant
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-title">
            <Bot size={20} />
            Research Assistant
          </div>

          <button
            className="reset-button"
            onClick={reset}
            disabled={isLoading}
          >
            <RotateCcw size={17} />
          </button>
        </header>

        <div
          className="messages-container"
          ref={scrollRef}
        >
          <div className="messages-inner">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
              />
            ))}

            {stage === "ready_to_expand" && (
              <div className="message assistant">
                <div className="avatar">
                  <Bot size={19} />
                </div>

                <div className="message-content">
                  <button
                    type="button"
                    className="proceed-button"
                    onClick={handleProceed}
                    disabled={isLoading}
                  >
                    <Sparkles size={16} />
                    Proceed to attribute discovery
                    <ArrowRight size={17} />
                  </button>
                </div>
              </div>
            )}

            {stage === "selecting" && (
              <div className="message assistant">
                <div className="avatar">
                  <Bot size={19} />
                </div>

                <div className="message-content">
                  <AttributeSelector
                    attributes={availableAttributes}
                    selected={selectedAttributes}
                    onToggle={toggleAttribute}
                    onSubmit={submitSelected}
                  />
                </div>
              </div>
            )}

            {isLoading && (
              <div
                className="message assistant"
                role="status"
              >
                <div className="avatar">
                  <Bot size={19} />
                </div>

                <div className="message-content">
                  <div className="loading-message">
                    <LoaderCircle
                      size={18}
                      className="spin"
                    />

                    {loadingText[
                      stage as keyof typeof loadingText
                    ]}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="composer-area">
          {stage === "selecting" && (
            <div className="selection-indicator">
              {selectedAttributes.length} attributes selected
            </div>
          )}

          <div className="composer">
            <textarea
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              disabled={isLoading || stage === "ready_to_expand"}
              placeholder={
                stage === "ready_to_expand"
                  ? "Click Proceed above to continue..."
                  : stage === "selecting"
                    ? "Enter requested attributes..."
                    : "Paste a webpage URL and describe your research..."
              }
              rows={2}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
            />

            <div className="composer-bottom">
              <span className="composer-hint">
                Enter to send · Shift+Enter for newline
              </span>

              <button
                className="send-button"
                onClick={() => void handleSend()}
                disabled={!input.trim() || isLoading}
                aria-label="Send"
              >
                {isLoading ? (
                  <LoaderCircle
                    size={18}
                    className="spin"
                  />
                ) : (
                  <ArrowUp size={20} />
                )}
              </button>
            </div>
          </div>

          <p className="footer-note">
            AI-generated research results should be verified
            against their sources.
          </p>
        </div>
      </main>
    </div>
  );
}
