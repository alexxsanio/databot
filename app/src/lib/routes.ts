
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

export type CSVResponse = {
  blob: Blob;
  datasetId: string | null;
  availableAttributes: string[];
  entryCount: number | null;
};

function parseAttributes(header: string | null): string[] {
  if (!header) return [];

  try {
    const parsed: unknown = JSON.parse(header);

    if (
      Array.isArray(parsed) &&
      parsed.every((value) => typeof value === "string")
    ) {
      return parsed;
    }
  } catch {
    throw new Error(
      "Invalid X-Available-Attributes header"
    );
  }

  return [];
}

export async function postCSV(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<CSVResponse> {
  const response = await fetch(`${API_URL}${endpoint}`, {
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

      message =
        typeof error.detail === "string"
          ? error.detail
          : typeof error.error === "string"
            ? error.error
            : typeof error.message === "string"
              ? error.message
              : message;
    } catch {
      // Keep the HTTP status as the fallback error.
    }

    throw new Error(message);
  }

  const countHeader = response.headers.get("X-Entry-Count");
  const entryCount = countHeader === null
    ? null
    : Number(countHeader);

  return {
    blob: await response.blob(),
    datasetId: response.headers.get("X-Dataset-ID"),
    availableAttributes: parseAttributes(
      response.headers.get("X-Available-Attributes")
    ),
    entryCount:
      entryCount !== null && Number.isFinite(entryCount)
        ? entryCount
        : null,
  };
}

export function initSearch(
  webpages: string[]
): Promise<CSVResponse> {
  return postCSV("/init_search", { webpages });
}

export function expandSearch(
  datasetId: string,
  description: string,
  sampleSize = 10
): Promise<CSVResponse> {
  return postCSV("/expand_search", {
    dataset_id: datasetId,
    description,
    sample_size: sampleSize,
  });
}

export function searchEntries(
  datasetId: string,
  attributes: string[]
): Promise<CSVResponse> {
  return postCSV("/search", {
    dataset_id: datasetId,
    attributes,
  });
}
