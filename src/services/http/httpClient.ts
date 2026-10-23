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

let onUnreachable: (() => Promise<void>) | null = null;

/**
 * Called when a request never reached the API (network failure, or a non-JSON response where
 * JSON was expected). The request is then retried once. In mock mode this re-attaches MSW
 * (see app/mockApi.ts); without a handler the error is reported right away.
 */
export function setUnreachableApiHandler(handler: (() => Promise<void>) | null) {
  onUnreachable = handler;
}

/** null when the request did not reach the API. */
async function send(url: URL, init: RequestInit): Promise<Response | null> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (isAbortError(error)) throw error;
    return null;
  }
  // The API answers JSON or a bodiless 204. Anything else means the request bypassed it:
  // GET gets the SPA fallback (text/html), POST/DELETE a 404 with no content type.
  if (response.status === 204) return response;
  return response.headers.get("content-type")?.includes("application/json") ? response : null;
}

/**
 * Where the API lives. Default "": paths like /api/products stay relative to this origin,
 * which is what the MSW mock API intercepts. A real backend sets VITE_API_BASE_URL.
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

/** `path` is an endpoint path such as "/api/products"; endpoint paths live in the service files. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;
  // Absolute URL so the same client works in the browser and in Node-based tests.
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  const init: RequestInit = {
    method,
    signal,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  };

  let response = await send(url, init);
  if (!response && onUnreachable) {
    await onUnreachable();
    response = await send(url, init);
  }
  if (!response) {
    throw new ApiError(0, "Could not reach the API. Check your connection, or reload the page and try again.");
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
