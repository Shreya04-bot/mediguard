import React from "react";
import { Bell, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Card } from "@/components/ui/card";

export const NotificationItem = ({ notification, onMarkRead }) => {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    warning: <AlertCircle className="h-5 w-5 text-amber-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  return (
    <Card className={`p-4 transition-all ${!notification.read ? "border-l-4 border-l-teal-500 bg-teal-500/5" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{icons[notification.type] || <Bell className="h-5 w-5 text-teal-500" />}</div>
          <div>
            <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">{notification.title}</h5>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{notification.message}</p>
            <span className="text-[10px] text-muted-foreground mt-2 block">{notification.time}</span>
          </div>
        </div>
        {!notification.read && (
          <button
            onClick={() => onMarkRead(notification.id)}
            className="text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
          >
            Mark read
          </button>
        )}
      </div>
    </Card>
  );
};
