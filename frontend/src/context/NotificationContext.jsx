import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { formatDistanceToNow } from "date-fns";
import {
  fetchNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from "@/services/notificationService";
import { useAuth } from "@/context/AuthContext";

const NotificationContext = createContext();

function withRelativeTime(notification) {
  return {
    ...notification,
    time: formatDistanceToNow(new Date(notification.createdAt), {
      addSuffix: true,
    }),
  };
}

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const {
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();

  useEffect(() => {
    // Wait until AuthProvider has finished restoring/checking the session.
    if (authLoading) {
      return;
    }

    // User is not logged in.
    // Do NOT call /notifications because it requires authentication.
    if (!isAuthenticated) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    setIsLoading(true);

    fetchNotificationsApi()
      .then(({ notifications: fetched }) => {
        if (!cancelled) {
          setNotifications(fetched.map(withRelativeTime));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotifications([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading]);

  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
    );

    markNotificationReadApi(id).catch(() => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read: false } : n
        )
      );
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    const previous = notifications;

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );

    markAllNotificationsReadApi().catch(() => {
      setNotifications(previous);
    });
  }, [notifications]);

  const addNotification = useCallback((item) => {
    setNotifications((prev) => [
      {
        id: `n_${Date.now()}`,
        read: false,
        createdAt: new Date().toISOString(),
        time: "Just now",
        ...item,
      },
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

export const useNotifications = () =>
  useContext(NotificationContext);