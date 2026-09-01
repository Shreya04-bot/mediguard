import api from "./api";

/**
 * Notification service — per-user notification feed.
 *
 * ------------------------------------------------------------------
 * GET /notifications
 * ------------------------------------------------------------------
 * Returns the current user's notifications, newest first.
 *
 * Response 200:
 *   {
 *     notifications: Array<{
 *       id: string,
 *       title: string,
 *       message: string,
 *       createdAt: string,        // ISO 8601 timestamp
 *       type: "success" | "warning" | "info" | "error",
 *       read: boolean
 *     }>
 *   }
 *
 * Error responses:
 *   401 { error: "Authentication required" }
 *
 * ------------------------------------------------------------------
 * PATCH /notifications/:id/read
 * ------------------------------------------------------------------
 * Marks a single notification as read.
 * Response 200: { id: string, read: true }
 * Error responses:
 *   404 { error: "Notification not found" }
 *   403 { error: "Notification does not belong to the current user" }
 *
 * ------------------------------------------------------------------
 * PATCH /notifications/read-all
 * ------------------------------------------------------------------
 * Marks every notification for the current user as read.
 * Response 200: { updated: number }
 */

/** @typedef {{ id: string, title: string, message: string, createdAt: string, type: "success"|"warning"|"info"|"error", read: boolean }} AppNotification */

/** @returns {Promise<{ notifications: AppNotification[] }>} */
export const fetchNotificationsApi = () => api.get("/notifications");

/**
 * @param {string} id
 * @returns {Promise<{ id: string, read: true }>}
 */
export const markNotificationReadApi = (id) => api.patch(`/notifications/${id}/read`);

/** @returns {Promise<{ updated: number }>} */
export const markAllNotificationsReadApi = () => api.patch("/notifications/read-all");
