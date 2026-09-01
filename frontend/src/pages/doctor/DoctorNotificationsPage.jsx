import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { NotificationCenter } from "../../components/notifications/NotificationCenter";

export const DoctorNotificationsPage = () => {
  return (
    <div>
      <PageHeader
        title="Notifications & Alerts"
        description="Updates on patient risk alerts, link requests, and report reviews."
      />
      <NotificationCenter />
    </div>
  );
};
