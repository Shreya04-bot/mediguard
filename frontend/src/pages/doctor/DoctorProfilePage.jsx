import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { UserProfileCard } from "../../components/profile/UserProfileCard";
import { SettingsForm } from "../../components/profile/SettingsForm";
import ProfileSettingsCard from "../../components/profile/ProfileSettingsCard";

export const DoctorProfilePage = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor Profile & Credentials"
        description="View medical credentials, hospital affiliations, and notification settings."
      />
      <UserProfileCard />
      <ProfileSettingsCard />
      <SettingsForm />
    </div>
  );
};
