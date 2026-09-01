import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  fetchNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from "@/services/notificationService";

const NotificationContext = createContext();

function withRelativeTime(notification) {
  return {
    ...notification,
    time: formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }),
  };
}

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchNotificationsApi()
      .then(({ notifications: fetched }) => {
        if (!cancelled) setNotifications(fetched.map(withRelativeTime));
      })
      .catch(() => {
        // No backend yet / request failed — start with an empty feed
        // rather than showing fabricated notifications.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    markNotificationReadApi(id).catch(() => {
      // Revert the optimistic update if the server rejected the request.
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    markAllNotificationsReadApi().catch(() => {
      setNotifications(previous);
    });
  }, [notifications]);

  // Client-local addition for real-time pushes (e.g. a future websocket
  // handler) — not persisted via the API by itself.
  const addNotification = useCallback((item) => {
    setNotifications((prev) => [
      { id: `n_${Date.now()}`, read: false, createdAt: new Date().toISOString(), time: "Just now", ...item },
      ...prev,
    ]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
