import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { NotificationCenter } from "../../components/notifications/NotificationCenter";

export const AdminNotificationsPage = () => {
  return (
    <div>
      <PageHeader
        title="Notifications & Alerts"
        description="Updates on doctor verifications, system logs, and platform activity."
      />
      <NotificationCenter />
    </div>
  );
};
