import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { SettingsForm } from "../../components/profile/SettingsForm";
import { InviteAdminForm } from "../../components/admin/InviteAdminForm";

export const SettingsPage = () => {
  return (
    <div>
      <PageHeader
        title="Platform & Compliance Settings"
        description="Configure FHIR integration parameters, security policies, and live notifications."
      />
      <div className="flex flex-col gap-6">
        <InviteAdminForm />
        <SettingsForm />
      </div>
    </div>
  );
};