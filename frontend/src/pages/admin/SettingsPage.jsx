import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { SettingsForm } from "../../components/profile/SettingsForm";

export const SettingsPage = () => {
  return (
    <div>
      <PageHeader
        title="Platform & Compliance Settings"
        description="Configure FHIR integration parameters, security policies, and live notifications."
      />
      <SettingsForm />
    </div>
  );
};
