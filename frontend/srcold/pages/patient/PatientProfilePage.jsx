import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { UserProfileCard } from "../../components/profile/UserProfileCard";
import { SettingsForm } from "../../components/profile/SettingsForm";

export const PatientProfilePage = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Health Profile"
        description="View personal details, blood group, emergency contacts, and privacy preferences."
      />
      <UserProfileCard />
      <SettingsForm />
    </div>
  );
};
