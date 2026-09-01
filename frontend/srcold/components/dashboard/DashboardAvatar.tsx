import React from "react";
import {
  dashboardAssets,
  DashboardRole,
  GenderType,
} from "./dashboardAssets";

interface DashboardAvatarProps {
  role?: DashboardRole;
  gender?: string | null;
  profilePhotoUrl?: string | null;
  className?: string;
  alt?: string;
}

function normalizeGender(
  gender?: string | null
): GenderType {
  const value = gender?.toLowerCase().trim();

  if (
    value === "male" ||
    value === "boy" ||
    value === "m"
  ) {
    return "boy";
  }

  if (
    value === "female" ||
    value === "girl" ||
    value === "f"
  ) {
    return "girl";
  }

  return "neutral";
}

export default function DashboardAvatar({
  role = "patient",
  gender,
  profilePhotoUrl,
  className = "",
  alt = "Profile",
}: DashboardAvatarProps) {
  const normalizedGender =
    normalizeGender(gender);

  const fallback =
    dashboardAssets[role].avatars[
      normalizedGender
    ];

  const imageSource =
    profilePhotoUrl || fallback;

  return (
    <img
      src={imageSource}
      alt={alt}
      className={className}
      onError={(event) => {
        if (
          event.currentTarget.src !== fallback
        ) {
          event.currentTarget.src = fallback;
        }
      }}
    />
  );
}