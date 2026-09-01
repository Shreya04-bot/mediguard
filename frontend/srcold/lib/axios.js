import axios from "axios";

/**
 * Shared HTTP client for all MediGuard AI service modules.
 *
 * Base URL resolution:
 *   VITE_API_BASE_URL env var, falling back to "/api" (same-origin
 *   reverse proxy). See .env.example.
 *
 * Auth:
 *   Every request automatically attaches `Authorization: Bearer <token>`
 *   when a token is present in localStorage under "mediguard_token"
 *   (set by services/authService.js on successful login/register).
 *
 * Error shape:
 *   Every rejected promise from this client is a normalized ApiError
 *   with the following fields, regardless of whether the failure was
 *   a network error, a timeout, or an HTTP error response:
 *     - message  {string}  human-readable message safe to show a user
 *     - status   {number|null}  HTTP status code, or null for network/timeout errors
 *     - code     {string|null}  backend-defined error code (e.g. "INVALID_CREDENTIALS"),
 *                                when the backend includes one in its error body
 *     - details  {unknown}  raw backend error payload, for logging/debugging only
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("mediguard_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error?.response?.status ?? null;
    const body = error?.response?.data;

    let message;
    if (status === null && error.code === "ECONNABORTED") {
      message = "The request timed out. Please try again.";
    } else if (status === null) {
      message = "Unable to reach the server. Check your connection and try again.";
    } else if (status === 401) {
      message = body?.error || "Your session has expired. Please sign in again.";
    } else if (status === 422 || status === 400) {
      message = body?.error || "Some of the submitted information is invalid.";
    } else if (status >= 500) {
      message = "The server ran into a problem. Please try again shortly.";
    } else {
      message = body?.error || error.message || "Request failed.";
    }

    const apiError = new Error(message);
    apiError.status = status;
    apiError.code = body?.code ?? null;
    apiError.details = body ?? null;
    return Promise.reject(apiError);
  }
);

/**
 * Retries an async request function on network/timeout failures only
 * (status === null) — never retries on 4xx/5xx responses, since those
 * are deterministic and retrying would just repeat the same failure.
 *
 * @template T
 * @param {() => Promise<T>} requestFn
 * @param {{ retries?: number, delayMs?: number }} [options]
 * @returns {Promise<T>}
 */
export async function withRetry(requestFn, { retries = 2, delayMs = 600 } = {}) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await requestFn();
    } catch (err) {
      const isNetworkError = err?.status === null || err?.status === undefined;
      if (!isNetworkError || attempt >= retries) throw err;
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}

export default api;
