import patientBoyAvatar from "@/assets/patient/avatars/boy-avatar.png";
import patientBoyAvatar2 from "@/assets/patient/avatars/boy-avatar-2.png";
import patientGirlAvatar from "@/assets/patient/avatars/girl-avatar.png";
import patientGirlAvatar2 from "@/assets/patient/avatars/girl-avatar-2.png";
import patientGirlAvatar3 from "@/assets/patient/avatars/girl-avatar-3.png";
import patientNeutralAvatar from "@/assets/patient/avatars/neutral-avatar.png";

import patientBoyHero from "@/assets/patient/hero/boy-health.png";
import patientGirlHero from "@/assets/patient/hero/girl-health.png";
import patientNeutralHero from "@/assets/patient/hero/neutral-health.png";

import doctorBoyAvatar from "@/assets/doctor/avatars/boy-avatar.png";
import doctorBoyAvatar2 from "@/assets/doctor/avatars/boy-avatar-2.png";
import doctorGirlAvatar from "@/assets/doctor/avatars/girl-avatar.png";
import doctorGirlAvatar2 from "@/assets/doctor/avatars/girl-avatar-2.png";
import doctorGirlAvatar3 from "@/assets/doctor/avatars/girl-avatar-3.png";
import doctorNeutralAvatar from "@/assets/doctor/avatars/neutral-avatar.png";

import doctorBoyHero from "@/assets/doctor/hero/boy-health.png";
import doctorGirlHero from "@/assets/doctor/hero/girl-health.png";
import doctorNeutralHero from "@/assets/doctor/hero/neutral-health.png";

import adminBoyAvatar from "@/assets/admin/avatars/boy-avatar.png";
import adminBoyAvatar2 from "@/assets/admin/avatars/boy-avatar-2.png";
import adminGirlAvatar from "@/assets/admin/avatars/girl-avatar.png";
import adminGirlAvatar2 from "@/assets/admin/avatars/girl-avatar-2.png";
import adminGirlAvatar3 from "@/assets/admin/avatars/girl-avatar-3.png";
import adminNeutralAvatar from "@/assets/admin/avatars/neutral-avatar.png";

import adminBoyHero from "@/assets/admin/hero/boy-health.png";
import adminGirlHero from "@/assets/admin/hero/girl-health.png";
import adminNeutralHero from "@/assets/admin/hero/neutral-health.png";

export type DashboardRole =
  | "patient"
  | "doctor"
  | "admin";

export type GenderType =
  | "boy"
  | "girl"
  | "neutral";

// Bundled avatar identifiers persisted as `avatar_key` in the backend
// (e.g. "girl-avatar-2"). Kept separate from GenderType because a
// gender has *several* selectable avatars (girl-avatar, girl-avatar-2,
// girl-avatar-3), not just one.
export type AvatarKey =
  | "boy-avatar"
  | "boy-avatar-2"
  | "girl-avatar"
  | "girl-avatar-2"
  | "girl-avatar-3"
  | "neutral-avatar";

export const dashboardAssets = {
  patient: {
    avatars: {
      boy: patientBoyAvatar,
      boy2: patientBoyAvatar2,
      girl: patientGirlAvatar,
      girl2: patientGirlAvatar2,
      girl3: patientGirlAvatar3,
      neutral: patientNeutralAvatar,
    },

    hero: {
      boy: patientBoyHero,
      girl: patientGirlHero,
      neutral: patientNeutralHero,
    },
  },

  doctor: {
    avatars: {
      boy: doctorBoyAvatar,
      boy2: doctorBoyAvatar2,
      girl: doctorGirlAvatar,
      girl2: doctorGirlAvatar2,
      girl3: doctorGirlAvatar3,
      neutral: doctorNeutralAvatar,
    },

    hero: {
      boy: doctorBoyHero,
      girl: doctorGirlHero,
      neutral: doctorNeutralHero,
    },
  },

  admin: {
    avatars: {
      boy: adminBoyAvatar,
      boy2: adminBoyAvatar2,
      girl: adminGirlAvatar,
      girl2: adminGirlAvatar2,
      girl3: adminGirlAvatar3,
      neutral: adminNeutralAvatar,
    },

    hero: {
      boy: adminBoyHero,
      girl: adminGirlHero,
      neutral: adminNeutralHero,
    },
  },
};

// Flat avatar_key -> image lookup per role. Keys match what's persisted
// on the backend (User.avatar_key), e.g. "girl-avatar-2".
export const avatarsByKey: Record<DashboardRole, Record<AvatarKey, string>> = {
  patient: {
    "boy-avatar": dashboardAssets.patient.avatars.boy,
    "boy-avatar-2": dashboardAssets.patient.avatars.boy2,
    "girl-avatar": dashboardAssets.patient.avatars.girl,
    "girl-avatar-2": dashboardAssets.patient.avatars.girl2,
    "girl-avatar-3": dashboardAssets.patient.avatars.girl3,
    "neutral-avatar": dashboardAssets.patient.avatars.neutral,
  },
  doctor: {
    "boy-avatar": dashboardAssets.doctor.avatars.boy,
    "boy-avatar-2": dashboardAssets.doctor.avatars.boy2,
    "girl-avatar": dashboardAssets.doctor.avatars.girl,
    "girl-avatar-2": dashboardAssets.doctor.avatars.girl2,
    "girl-avatar-3": dashboardAssets.doctor.avatars.girl3,
    "neutral-avatar": dashboardAssets.doctor.avatars.neutral,
  },
  admin: {
    "boy-avatar": dashboardAssets.admin.avatars.boy,
    "boy-avatar-2": dashboardAssets.admin.avatars.boy2,
    "girl-avatar": dashboardAssets.admin.avatars.girl,
    "girl-avatar-2": dashboardAssets.admin.avatars.girl2,
    "girl-avatar-3": dashboardAssets.admin.avatars.girl3,
    "neutral-avatar": dashboardAssets.admin.avatars.neutral,
  },
};

// Which avatar_key choices to offer for a given gender — this is what
// AvatarSelector renders as pickable options.
export const avatarKeysByGender: Record<GenderType, AvatarKey[]> = {
  boy: ["boy-avatar", "boy-avatar-2"],
  girl: ["girl-avatar", "girl-avatar-2", "girl-avatar-3"],
  neutral: ["neutral-avatar"],
};

export function normalizeGender(gender?: string | null): GenderType {
  const value = gender?.toLowerCase().trim();
  if (value === "male" || value === "boy" || value === "m") return "boy";
  if (value === "female" || value === "girl" || value === "f") return "girl";
  return "neutral";
}

// Priority: uploaded photo > selected avatar_key > gender default > neutral.
export function resolveAvatarSrc(
  role: DashboardRole,
  user?: {
    gender?: string | null;
    avatar_key?: string | null;
    avatarKey?: string | null;
    profile_photo_url?: string | null;
    profilePhotoUrl?: string | null;
    profilePhoto?: string | null;
    avatar?: string | null;
  } | null
): string {
  const photo =
    user?.profile_photo_url ??
    user?.profilePhotoUrl ??
    user?.profilePhoto ??
    user?.avatar ??
    null;
  if (photo) return photo;

  const key = (user?.avatar_key ?? user?.avatarKey ?? null) as AvatarKey | null;
  if (key && avatarsByKey[role][key]) return avatarsByKey[role][key];

  const gender = normalizeGender(user?.gender);
  return dashboardAssets[role].avatars[gender === "boy" ? "boy" : gender === "girl" ? "girl" : "neutral"];
}