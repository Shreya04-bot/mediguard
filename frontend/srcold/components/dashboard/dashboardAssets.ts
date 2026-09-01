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