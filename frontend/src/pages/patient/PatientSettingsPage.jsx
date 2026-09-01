import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { SettingsForm } from "../../components/profile/SettingsForm";

export const PatientSettingsPage = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Settings"
        description="Manage your notification and application preferences."
      />

      <SettingsForm />
    </div>
  );
};