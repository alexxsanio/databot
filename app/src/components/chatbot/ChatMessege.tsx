
import {
  Bot,
  Download,
  FileSpreadsheet,
  UserRound,
} from "lucide-react";

export type ChatFile = {
  filename: string;
  url: string;
  count?: number | null;
};

export type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  file?: ChatFile;
};

type Props = {
  message: Message;
};

export default function ChatMessage({ message }: Props) {
  return (
    <div className={`message ${message.role}`}>
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
              <strong>{message.file.filename}</strong>

              <span>
                {message.file.count != null
                  ? `${message.file.count} entries · `
                  : ""}
                CSV file
              </span>
            </div>

            <Download size={19} />
          </a>
        )}
      </div>
    </div>
  );
}
