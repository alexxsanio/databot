
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ArrowUp,
  Bot,
  Check,
  Download,
  FileSpreadsheet,
  Globe2,
  LoaderCircle,
  Plus,
  RotateCcw,
  Sparkles,
  UserRound,
} from "lucide-react";

type Stage =
  | "initial"
  | "loading_initial"
  | "loading_expand"
  | "selecting"
  | "loading_search";

type CsvFile = {
  filename: string;
  url: string;
  count?: number;
};

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  file?: CsvFile;
  attributes?: string[];
};

type ExpandResponse = {
  dataset_id: string;
  sample_size: number;
  available_attributes: string[];
  sample_results: Record<string, unknown>[];
};

const initialMessage: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello! I'm your web research assistant. " +
    "Share a webpage URL and briefly describe what " +
    "you're looking for. I'll scrape the initial " +
    "entries and suggest additional attributes " +
    "that we can research.",
};

function createMessage(
  role: Message["role"],
  content: string,
  extra: Partial<Message> = {}
): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    ...extra,
  };
}

function formatAttribute(attribute: string) {
  return attribute
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseInitialInput(text: string) {
  const match = text.match(/https?:\/\/[^\s<>]+/i);

  if (!match) {
    return null;
  }

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

async function postApi(
  endpoint: string,
  payload: unknown
): Promise<Response> {
  const response = await fetch(`/api/backend/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const error = await response.json();

      if (typeof error.detail === "string") {
        message = error.detail;
      } else if (error.detail) {
        message = JSON.stringify(error.detail);
      }
    } catch {
      // Retain fallback error.
    }

    throw new Error(message);
  }

  return response;
}

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([
    initialMessage,
  ]);

  const [stage, setStage] = useState<Stage>("initial");
  const [input, setInput] = useState("");

  const [datasetId, setDatasetId] = useState<string | null>(
    null
  );

  const [availableAttributes, setAvailableAttributes] =
    useState<string[]>([]);

  const [selectedAttributes, setSelectedAttributes] =
    useState<string[]>([]);

  const [description, setDescription] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const objectUrls = useRef<string[]>([]);

  const isLoading =
    stage === "loading_initial" ||
    stage === "loading_expand" ||
    stage === "loading_search";

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

  const registerDownload = useCallback(
    (blob: Blob, filename: string, count?: number): CsvFile => {
      const url = URL.createObjectURL(blob);
      objectUrls.current.push(url);

      return { filename, url, count };
    },
    []
  );

  function addMessage(
    role: Message["role"],
    content: string,
    extra: Partial<Message> = {}
  ) {
    setMessages((previous) => [
      ...previous,
      createMessage(role, content, extra),
    ]);
  }

  function toggleAttribute(attribute: string) {
    if (isLoading) return;

    setSelectedAttributes((previous) =>
      previous.includes(attribute)
        ? previous.filter((item) => item !== attribute)
        : [...previous, attribute]
    );
  }

  function resetConversation() {
    if (isLoading) return;

    setDatasetId(null);
    setAvailableAttributes([]);
    setSelectedAttributes([]);
    setDescription("");
    setInput("");
    setStage("initial");

    setMessages([initialMessage]);

    textareaRef.current?.focus();
  }

  async function handleInitialSearch(text: string) {
    const parsed = parseInitialInput(text);

    if (!parsed) {
      addMessage(
        "assistant",
        "Please provide a valid HTTP or HTTPS webpage URL. " +
          "You can include a description after the link."
      );
      return;
    }

    setDescription(parsed.description);
    setStage("loading_initial");

    try {
      // Step 1: Scrape the webpage.
      const initialResponse = await postApi("init_search", {
        webpages: [parsed.url],
      });

      const newDatasetId =
        initialResponse.headers.get("x-dataset-id");

      if (!newDatasetId) {
        throw new Error(
          "The backend did not return a dataset ID."
        );
      }

      const count = Number(
        initialResponse.headers.get("x-entry-count") || 0
      );

      const initialBlob = await initialResponse.blob();

      const initialFile = registerDownload(
        initialBlob,
        "initial.csv",
        count
      );

      setDatasetId(newDatasetId);

      addMessage(
        "assistant",
        `I found ${count} entries on this webpage. ` +
          "Here's the initial dataset. " +
          "I'll now examine a random sample of up to " +
          "10 entries to discover useful enrichment attributes.",
        { file: initialFile }
      );

      // Step 2: Search sample and discover attributes.
      setStage("loading_expand");

      const expandResponse = await postApi(
        "expand_search",
        {
          dataset_id: newDatasetId,
          sample_size: 10,
          description: parsed.description,
        }
      );

      const expanded: ExpandResponse =
        await expandResponse.json();

      setAvailableAttributes(expanded.available_attributes);
      setSelectedAttributes([]);

      addMessage(
        "assistant",
        `I researched ${expanded.sample_size} sampled entries. ` +
          "Here are the additional attributes I found. " +
          "Select the ones you want, or type their names " +
          "into the chat. Then I'll enrich every entry " +
          "in your initial CSV.",
        { attributes: expanded.available_attributes }
      );

      setStage("selecting");
    } catch (error) {
      addMessage(
        "assistant",
        error instanceof Error
          ? `I encountered an error: ${error.message}`
          : "Something went wrong during scraping."
      );

      // A successful initial CSV may already exist.
      setStage("initial");
    }
  }

  function resolveRequestedAttributes(text: string) {
    const normalized = text.toLowerCase();

    // Accept comma-separated names:
    // e.g. industry, founding year, location
    const candidates = text
      .split(/[,;\n]+/)
      .map((part) =>
        part
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "_")
      )
      .filter(Boolean);

    const exact = candidates.filter((candidate) =>
      availableAttributes.includes(candidate)
    );

    if (exact.length > 0) {
      return [...new Set(exact)];
    }

    // Also recognize attribute names mentioned naturally.
    return availableAttributes.filter((attribute) =>
      normalized.includes(
        attribute.replaceAll("_", " ")
      ) || normalized.includes(attribute)
    );
  }

  async function handleFullSearch(attributes: string[]) {
    if (!datasetId || attributes.length === 0) {
      addMessage(
        "assistant",
        "Please select at least one available attribute."
      );
      return;
    }

    setStage("loading_search");

    try {
      const response = await postApi("search", {
        dataset_id: datasetId,
        attributes,
      });

      const count = Number(
        response.headers.get("x-entry-count") || 0
      );

      const blob = await response.blob();

      const file = registerDownload(
        blob,
        "enriched.csv",
        count
      );

      addMessage(
        "assistant",
        `Your enrichment is complete! I processed ` +
          `${count} entries with these attributes: ` +
          attributes.map(formatAttribute).join(", ") +
          ". Download the full CSV below.",
        { file }
      );

      addMessage(
        "assistant",
        "Would you like to research another webpage? " +
          "Share a new URL and describe what you're looking for."
      );

      setDatasetId(null);
      setAvailableAttributes([]);
      setSelectedAttributes([]);
      setDescription("");
      setStage("initial");
    } catch (error) {
      addMessage(
        "assistant",
        error instanceof Error
          ? `Enrichment failed: ${error.message}. ` +
              "You can adjust your attributes and try again."
          : "Enrichment failed. Please try again."
      );

      setStage("selecting");
    }
  }

  async function sendMessage() {
    const text = input.trim();

    if (!text || isLoading) return;

    setInput("");
    addMessage("user", text);

    if (stage === "initial") {
      await handleInitialSearch(text);
      return;
    }

    if (stage === "selecting") {
      const requested = resolveRequestedAttributes(text);

      if (requested.length === 0) {
        if (
          /^(search|start|enrich|continue|go|run)$/i.test(text)
        ) {
          await handleFullSearch(selectedAttributes);
        } else {
          addMessage(
            "assistant",
            "I couldn't match those attributes. " +
              "Please select from the suggested attributes " +
              "or enter their names separated by commas."
          );
        }
        return;
      }

      setSelectedAttributes(requested);
      await handleFullSearch(requested);
    }
  }

  function submitSelection() {
    if (selectedAttributes.length === 0 || isLoading) {
      return;
    }

    addMessage(
      "user",
      "Enrich all entries with: " +
        selectedAttributes.map(formatAttribute).join(", ")
    );

    void handleFullSearch(selectedAttributes);
  }

  const placeholder =
    stage === "selecting"
      ? "Enter attributes, e.g. industry, location..."
      : "Paste a webpage URL and describe your research...";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Globe2 size={20} />
          </div>

          <div>
            <div className="brand-title">Web Research</div>
            <div className="brand-subtitle">
              Scrape & enrich data
            </div>
          </div>
        </div>

        <button
          className="new-chat-button"
          onClick={resetConversation}
          disabled={isLoading}
        >
          <Plus size={17} />
          New research
        </button>

        <div className="sidebar-section">
          <span className="sidebar-label">WORKFLOW</span>

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
          <span className="status-dot" />
          Connected to research API
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
            onClick={resetConversation}
            disabled={isLoading}
            title="Start a new conversation"
          >
            <RotateCcw size={17} />
          </button>
        </header>

        <div className="messages-container" ref={scrollRef}>
          <div className="messages-inner">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.role}`}
              >
                <div className="avatar">
                  {message.role === "assistant" ? (
                    <Bot size={19} />
                  ) : (
                    <UserRound size={18} />
                  )}
                </div>

                <div className="message-content">
                  {message.role === "assistant" && (
                    <div className="message-author">
                      Research Assistant
                    </div>
                  )}

                  <div className="message-text">
                    {message.content}
                  </div>

                  {message.file && (
                    <a
                      className="file-card"
                      href={message.file.url}
                      download={message.file.filename}
                    >
                      <div className="file-icon">
                        <FileSpreadsheet size={23} />
                      </div>

                      <div className="file-details">
                        <strong>
                          {message.file.filename}
                        </strong>
                        <span>
                          {message.file.count ?? 0} entries
                          {" · "}CSV file
                        </span>
                      </div>

                      <Download size={19} />
                    </a>
                  )}

                  {message.attributes &&
                    message.attributes.length > 0 && (
                      <div className="attribute-section">
                        <div className="attribute-heading">
                          Suggested attributes
                        </div>

                        <div className="attribute-list">
                          {message.attributes.map((attribute) => {
                            const selected =
                              selectedAttributes.includes(
                                attribute
                              );

                            return (
                              <button
                                key={attribute}
                                className={
                                  "attribute-chip " +
                                  (selected ? "selected" : "")
                                }
                                onClick={() =>
                                  toggleAttribute(attribute)
                                }
                                disabled={
                                  stage !== "selecting"
                                }
                              >
                                {selected && <Check size={13} />}
                                {formatAttribute(attribute)}
                              </button>
                            );
                          })}
                        </div>

                        {stage === "selecting" && (
                          <button
                            className="enrich-button"
                            onClick={submitSelection}
                            disabled={
                              selectedAttributes.length === 0
                            }
                          >
                            <Sparkles size={16} />
                            Enrich all entries
                            {selectedAttributes.length > 0 &&
                              ` (${selectedAttributes.length})`}
                          </button>
                        )}
                      </div>
                    )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message assistant">
                <div className="avatar">
                  <Bot size={19} />
                </div>

                <div className="message-content">
                  <div className="message-author">
                    Research Assistant
                  </div>

                  <div className="loading-message">
                    <LoaderCircle
                      size={17}
                      className="spin"
                    />
                    {stage === "loading_initial" &&
                      "Scraping the webpage..."}

                    {stage === "loading_expand" &&
                      "Researching sample entries and discovering attributes..."}

                    {stage === "loading_search" &&
                      "Researching all entries and preparing your CSV..."}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="composer-area">
          {stage === "selecting" &&
            selectedAttributes.length > 0 && (
              <div className="selection-indicator">
                {selectedAttributes.length} attributes selected
              </div>
            )}

          <div className="composer">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              placeholder={placeholder}
              rows={2}
              disabled={isLoading}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
            />

            <div className="composer-bottom">
              <span className="composer-hint">
                Enter to send · Shift+Enter for newline
              </span>

              <button
                className="send-button"
                onClick={() => void sendMessage()}
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
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
            Research results may contain missing or
            inaccurate information. Verify important facts.
          </p>
        </div>
      </main>
    </div>
  );
}
