import { sendChatMessageApi } from "./chatbotService";

/**
 * Voice assistant service. The speech-to-text transcript is sent
 * through the same /ai/chat contract used by the text chat UI (see
 * chatbotService.js) — voice input has no server-side contract of
 * its own beyond that. Text-to-speech playback of the reply happens
 * client-side via the Web Speech API in the voice UI components.
 *
 * @param {string} transcript - text produced by the browser's speech recognition
 * @param {"admin"|"doctor"|"patient"} userRole
 * @returns {Promise<{ reply: string }>}
 */
export const processVoiceQueryApi = (transcript, userRole) => sendChatMessageApi(transcript, [], userRole);
