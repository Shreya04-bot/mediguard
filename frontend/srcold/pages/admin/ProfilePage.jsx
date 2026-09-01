import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { UserProfileCard } from "../../components/profile/UserProfileCard";
import { SettingsForm } from "../../components/profile/SettingsForm";

export const ProfilePage = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Administrator Profile"
        description="View credentials, role authorizations, and personal account configurations."
      />
      <UserProfileCard />
      <SettingsForm />
    </div>
  );
};
