import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { UserProfileCard } from "../../components/profile/UserProfileCard";
import { SettingsForm } from "../../components/profile/SettingsForm";
import ProfileSettingsCard from "../../components/profile/ProfileSettingsCard";
import PatientHealthProfileForm from "../../components/patient/PatientHealthProfileForm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const PatientProfilePage = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Health Profile"
        description="View personal details, blood group, emergency contacts, and privacy preferences."
      />
      <UserProfileCard />
      <ProfileSettingsCard />
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Health Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <PatientHealthProfileForm />
        </CardContent>
      </Card>
      <SettingsForm />
    </div>
  );
};