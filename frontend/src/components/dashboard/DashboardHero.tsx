import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Brain,
  Heart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

import {
  dashboardAssets,
  normalizeGender,
  type DashboardRole,
} from "./dashboardAssets";

import DashboardAvatar from "./DashboardAvatar";

interface DashboardHeroProps {
  user: any;
  role: DashboardRole;

  title?: string;
  subtitle?: string;

  primaryLabel?: string;
  primaryHref?: string;

  secondaryLabel?: string;
  secondaryHref?: string;

  score?: number | null;
  scoreLabel?: string;
}

export default function DashboardHero({
  user,
  role,

  title,
  subtitle,

  primaryLabel = "Get Started",
  primaryHref = "#",

  secondaryLabel,
  secondaryHref,

  score,
  scoreLabel,
}: DashboardHeroProps) {
  const firstName =
    user?.name?.split(" ")[0] ||
    "there";

  // Hero illustration depends ONLY on role + gender — never on the
  // user's chosen avatar_key. It's a separate visual system from the
  // profile avatar shown bottom-left.
  const gender = normalizeGender(
    user?.gender
  );

  const heroImage =
    dashboardAssets[role].hero[
      gender
    ];

  const profilePhoto =
    user?.profile_photo_url ??
    user?.profilePhotoUrl ??
    user?.profilePhoto ??
    null;

  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.45,
      }}
      className="
        relative
        overflow-hidden
        rounded-[28px]
        border
        border-border/60
        bg-card
        shadow-sm
      "
    >
      {/* Background decorations */}

      <div
        className="
          absolute
          -right-20
          -top-20
          h-64
          w-64
          rounded-full
          bg-primary/10
          blur-3xl
        "
      />

      <div
        className="
          absolute
          -bottom-24
          left-1/3
          h-52
          w-52
          rounded-full
          bg-health/10
          blur-3xl
        "
      />

      <div
        className="
          relative
          z-10
          grid
          min-h-[290px]
          lg:grid-cols-[1fr_320px]
        "
      >
        {/* LEFT */}

        <div
          className="
            flex
            flex-col
            justify-center
            p-6
            sm:p-8
            lg:p-10
          "
        >
          {/* Top label */}

          <div className="mb-4 flex items-center gap-3">
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-2xl
                bg-primary/10
                text-primary
              "
            >
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <p
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.15em]
                  text-muted-foreground
                "
              >
                {role === "patient"
                  ? "AI Health Dashboard"
                  : role === "doctor"
                    ? "Clinical Dashboard"
                    : "MediGuard Dashboard"}
              </p>

              <p className="text-sm text-muted-foreground">
                Personalized overview
              </p>
            </div>
          </div>

          {/* Greeting */}

          <h1
            className="
              text-2xl
              font-bold
              tracking-tight
              text-foreground
              sm:text-3xl
              lg:text-4xl
            "
          >
            {title ??
              `Good morning, ${firstName}!`}
          </h1>

          <p
            className="
              mt-2
              max-w-xl
              text-sm
              leading-6
              text-muted-foreground
            "
          >
            {subtitle ??
              "Stay informed, track your health and make better decisions with MediGuard AI."}
          </p>

          {/* Actions */}

          <div className="mt-6 flex flex-wrap gap-3">
            {primaryHref !== "#" && (
              <Button
                asChild
                className="
                  rounded-xl
                  gap-2
                "
              >
                <Link to={primaryHref}>
                  <Brain className="h-4 w-4" />

                  {primaryLabel}

                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}

            {secondaryLabel &&
              secondaryHref && (
                <Button
                  asChild
                  variant="outline"
                  className="rounded-xl"
                >
                  <Link
                    to={secondaryHref}
                  >
                    {secondaryLabel}
                  </Link>
                </Button>
              )}
          </div>

          {/* Score */}

          {score != null && (
            <div
              className="
                mt-6
                flex
                w-fit
                items-center
                gap-3
                rounded-2xl
                border
                border-border/60
                bg-background/70
                px-4
                py-3
                backdrop-blur
              "
            >
              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-xl
                  bg-rose-500/10
                  text-rose-500
                "
              >
                <Heart className="h-4 w-4" />
              </div>

              <div>
                <p className="text-[11px] text-muted-foreground">
                  Health Score
                </p>

                <p className="text-sm font-bold">
                  {score}/100
                  {scoreLabel
                    ? ` · ${scoreLabel}`
                    : ""}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}

        <div
          className="
            relative
            hidden
            min-h-[290px]
            items-end
            justify-center
            lg:flex
          "
        >
          {/* Hero image */}

          <div
            className="
              absolute
              bottom-0
              h-56
              w-56
              rounded-full
              bg-primary/10
              blur-2xl
            "
          />

          <motion.img
            src={heroImage}
            alt={`${gender} health illustration`}
            initial={{
              opacity: 0,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              duration: 0.55,
            }}
            className="
              relative
              z-10
              max-h-[280px]
              max-w-[300px]
              object-contain
              drop-shadow-xl
            "
          />

          {/* Profile avatar */}

          <div
            className="
              absolute
              bottom-5
              left-5
              z-20
              rounded-2xl
              border
              border-border/60
              bg-background/80
              p-1.5
              shadow-lg
              backdrop-blur
            "
          >
            <DashboardAvatar
              role={role}
              gender={user?.gender}
              avatarKey={user?.avatar_key ?? user?.avatarKey}
              profilePhotoUrl={profilePhoto}
              className="
                h-14
                w-14
                rounded-xl
                object-cover
              "
              alt={`${firstName}'s profile`}
            />
          </div>

          {/* Floating status */}

          <div
            className="
              absolute
              right-5
              top-5
              z-20
              flex
              items-center
              gap-2
              rounded-2xl
              border
              border-border/60
              bg-background/80
              px-3
              py-2
              shadow-lg
              backdrop-blur
            "
          >
            <div
              className="
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-xl
                bg-emerald-500/10
                text-emerald-500
              "
            >
              {role === "admin" ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <Activity className="h-4 w-4" />
              )}
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground">
                System Status
              </p>

              <p className="text-xs font-semibold">
                Active
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}