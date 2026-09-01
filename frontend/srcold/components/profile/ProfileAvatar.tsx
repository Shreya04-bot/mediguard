import React from "react";

import boyAvatar from "@/assets/patient/avatars/boy-avatar.png";
import girlAvatar from "@/assets/patient/avatars/girl-avatar.png";
import neutralAvatar from "@/assets/patient/avatars/neutral-avatar.png";

type ProfileAvatarProps = {
  user: any;
  className?: string;
};

function getGender(gender?: string | null) {
  const value = gender?.toLowerCase()?.trim();

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

function getFallbackAvatar(gender?: string | null) {
  const normalizedGender = getGender(gender);

  if (normalizedGender === "boy") {
    return boyAvatar;
  }

  if (normalizedGender === "girl") {
    return girlAvatar;
  }

  return neutralAvatar;
}

function getProfilePhoto(user: any) {
  return (
    user?.profile_photo_url ??
    user?.profilePhotoUrl ??
    user?.profilePhoto ??
    user?.avatar ??
    user?.photoURL ??
    null
  );
}

export default function ProfileAvatar({
  user,
  className = "h-12 w-12",
}: ProfileAvatarProps) {
  const fallbackAvatar = getFallbackAvatar(
    user?.gender
  );

  const profilePhoto = getProfilePhoto(user);

  return (
    <img
      src={profilePhoto || fallbackAvatar}
      alt={`${user?.name || "User"} profile`}
      className={`
        ${className}
        rounded-full
        object-cover
        border
        border-border/60
        bg-muted
        shadow-sm
      `}
      onError={(event) => {
        event.currentTarget.src = fallbackAvatar;
      }}
    />
  );
}