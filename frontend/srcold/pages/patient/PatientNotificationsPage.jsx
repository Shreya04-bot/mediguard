import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { NotificationCenter } from "../../components/notifications/NotificationCenter";

export const PatientNotificationsPage = () => {
  return (
    <div>
      <PageHeader
        title="Notifications & Alerts"
        description="Updates regarding your OCR lab report analyses, risk alerts, and Ayurvedic plans."
      />
      <NotificationCenter />
    </div>
  );
};
