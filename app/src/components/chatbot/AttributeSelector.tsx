
import { Check, Sparkles } from "lucide-react";

type Props = {
  attributes: string[];
  selected: string[];
  disabled?: boolean;
  onToggle: (attribute: string) => void;
  onSubmit: () => void;
};

export function formatAttribute(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AttributeSelector({
  attributes,
  selected,
  disabled = false,
  onToggle,
  onSubmit,
}: Props) {
  return (
    <div className="attribute-section">
      <div className="attribute-heading">
        Suggested enrichment attributes
      </div>

      <div className="attribute-list">
        {attributes.map((attribute) => {
          const isSelected = selected.includes(attribute);

          return (
            <button
              key={attribute}
              type="button"
              disabled={disabled}
              className={
                "attribute-chip " +
                (isSelected ? "selected" : "")
              }
              onClick={() => onToggle(attribute)}
              aria-pressed={isSelected}
            >
              {isSelected && <Check size={13} />}

              {formatAttribute(attribute)}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="enrich-button"
        onClick={onSubmit}
        disabled={disabled || selected.length === 0}
      >
        <Sparkles size={16} />
        Enrich all entries ({selected.length})
      </button>
    </div>
  );
}
