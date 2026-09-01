import React from "react";
import {
  dashboardAssets,
  resolveAvatarSrc,
  type DashboardRole,
} from "@/components/dashboard/dashboardAssets";

type ProfileAvatarProps = {
  user: {
    role?: string;
    name?: string;
    gender?: string | null;
    avatar_key?: string | null;
    avatarKey?: string | null;
    profile_photo_url?: string | null;
    profilePhotoUrl?: string | null;
    profilePhoto?: string | null;
    avatar?: string | null;
  } | null;
  className?: string;
  size?: number; // optional pixel size shortcut; className still wins if it sets width/height
};

const VALID_ROLES: DashboardRole[] = ["patient", "doctor", "admin"];

function resolveRole(role?: string): DashboardRole {
  return (VALID_ROLES as string[]).includes(role || "") ? (role as DashboardRole) : "patient";
}

/**
 * Single reusable source of truth for displaying a user's avatar,
 * anywhere in the app (sidebar, navbar, dashboards, profile pages,
 * appointments, notifications). Priority, per spec:
 *   1. Uploaded profile photo
 *   2. User-selected avatar (avatar_key)
 *   3. Gender-based default avatar
 *   4. Neutral avatar
 *
 * Do not duplicate this resolution logic elsewhere — import this
 * component (or, for non-<img> use-cases, `resolveAvatarSrc` from
 * dashboardAssets) instead.
 */
export default function ProfileAvatar({ user, className = "h-12 w-12", size }: ProfileAvatarProps) {
  const role = resolveRole(user?.role);
  const src = resolveAvatarSrc(role, user);
  const fallback = dashboardAssets[role].avatars.neutral;

  const style = size ? { width: size, height: size } : undefined;

  return (
    <img
      src={src}
      alt={`${user?.name || "User"} profile`}
      style={style}
      className={`${className} rounded-full object-cover border border-border/60 bg-muted shadow-sm`}
      onError={(event) => {
        if (event.currentTarget.src !== fallback) {
          event.currentTarget.src = fallback;
        }
      }}
    />
  );
}
