/**
 * Central API base URL and fetch helper.
 * Adds ngrok-skip-browser-warning so ngrok free tier forwards to the backend instead of the interstitial.
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function apiFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const url = input.startsWith("http") ? input : `${API_BASE}${input}`;
  const headers = new Headers(init?.headers);
  headers.set("ngrok-skip-browser-warning", "true");
  return fetch(url, { ...init, headers });
}
