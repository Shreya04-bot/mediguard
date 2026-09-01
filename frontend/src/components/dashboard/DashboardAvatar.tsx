import React from "react";
import { dashboardAssets, resolveAvatarSrc, type DashboardRole } from "./dashboardAssets";

interface DashboardAvatarProps {
  role?: DashboardRole;
  gender?: string | null;
  avatarKey?: string | null;
  profilePhotoUrl?: string | null;
  className?: string;
  alt?: string;
}

/**
 * Thin dashboard-hero-specific wrapper around the same resolution logic
 * as ProfileAvatar (components/profile/ProfileAvatar.tsx) — kept as a
 * separate component only because DashboardHero passes loose props
 * rather than a full `user` object. Both delegate to
 * `resolveAvatarSrc` in dashboardAssets.ts, so there is exactly one
 * place the priority order (photo > avatar_key > gender > neutral)
 * is implemented.
 */
export default function DashboardAvatar({
  role = "patient",
  gender,
  avatarKey,
  profilePhotoUrl,
  className = "",
  alt = "Profile",
}: DashboardAvatarProps) {
  const src = resolveAvatarSrc(role, {
    gender,
    avatar_key: avatarKey,
    profile_photo_url: profilePhotoUrl,
  });
  const fallback = dashboardAssets[role].avatars.neutral;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(event) => {
        if (event.currentTarget.src !== fallback) {
          event.currentTarget.src = fallback;
        }
      }}
    />
  );
}
