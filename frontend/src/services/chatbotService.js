import api from "./api";

/**
 * AI symptom/clinical chat service, shared by the text chat UI
 * (SymptomChatbot) and the voice assistant (voiceService.js).
 *
 * ------------------------------------------------------------------
 * POST /ai/chat
 * ------------------------------------------------------------------
 * Request body:
 *   {
 *     message: string,
 *     history: Array<{ role: "user" | "assistant", content: string }>,
 *     userRole: "admin" | "doctor" | "patient"
 *   }
 *
 * Response 200:
 *   { reply: string }
 *
 * Validation rules:
 *   - message must be non-empty, max ~2000 characters
 *   - history is used for conversational context only; the backend is
 *     the source of truth for any patient data referenced in the reply
 *
 * Error responses:
 *   400 { error: "message is required" }
 *   429 { error: "Rate limit exceeded, please wait before sending another message" }
 *   503 { error: "AI assistant temporarily unavailable" }
 */

/** @typedef {{ role: "user"|"assistant", content: string }} ChatTurn */

/**
 * @param {string} message
 * @param {ChatTurn[]} history
 * @param {"admin"|"doctor"|"patient"} userRole
 * @returns {Promise<{ reply: string }>}
 */
export const sendChatMessageApi = (message, history, userRole) =>
  api.post("/ai/chat", {
    message,
    history,
    userRole,
  });