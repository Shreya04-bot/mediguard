import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { SettingsForm } from "../../components/profile/SettingsForm";

export const DoctorSettingsPage = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor Settings"
        description="Manage your notification and application preferences."
      />

      <SettingsForm />
    </div>
  );
};