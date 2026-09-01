import { useNotifications as useNotifFromContext } from "../context/NotificationContext";

export const useNotifications = () => {
  return useNotifFromContext();
};
