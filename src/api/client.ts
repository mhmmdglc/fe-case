/**
 * Single error model for every failed request.
 * - status 0: the request never got a response (network failure).
 * - errors: 422 validation messages (string[]).
 * - conflicts: 409 conflict messages (string[]).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly errors: string[];
  readonly conflicts: string[];

  constructor(status: number, message: string, errors: string[] = [], conflicts: string[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.conflicts = conflicts;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

async function readBody(response: Response): Promise<unknown> {
  // 204 (DELETE) and other empty responses have no JSON to parse.
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    if (response.ok) throw new ApiError(response.status, "The server returned an invalid response.");
    return undefined;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;
  // Absolute URL so the same client works in the browser and in Node-based tests.
  const url = new URL(path, window.location.origin);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }

  const payload = await readBody(response);

  if (!response.ok) {
    const data = (payload ?? {}) as Record<string, unknown>;
    const message =
      typeof data.error === "string" ? data.error : `Request failed with status ${response.status}.`;
    throw new ApiError(response.status, message, stringArray(data.errors), stringArray(data.conflicts));
  }

  return payload as T;
}
