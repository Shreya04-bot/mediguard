import React from "react";
import { useNotifications } from "../../hooks/useNotifications";
import { NotificationItem } from "./NotificationItem";
import { Button } from "@/components/ui/button";

export const NotificationCenter = () => {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Live Alert Feed</h3>
        <Button size="sm" variant="outline" onClick={markAllAsRead}>
          Mark All Read
        </Button>
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} onMarkRead={markAsRead} />
        ))}
      </div>
    </div>
  );
};
