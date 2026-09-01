import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import {
  Activity,
  ArrowRight,
  Brain,
  CalendarDays,
  ChevronRight,
  FileText,
  Heart,
  Loader2,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Link } from "react-router-dom";

import { StatCard } from "@/components/dashboard/StatCard";
import { HealthTimeline } from "@/components/timeline/HealthTimeline";

import { useAuth } from "@/context/AuthContext";

import {
  formatDate,
  getRiskColor,
} from "@/lib/utils";

import {
  fetchHealthScoreApi,
  fetchPredictionHistoryApi,
  fetchPatientReportsApi,
  fetchPatientTimelineApi,
} from "@/services/patientService";

/* =========================================================
   PATIENT AVATARS
   ========================================================= */

import boyAvatar from "@/assets/patient/avatars/boy-avatar.png";
import boyAvatar2 from "@/assets/patient/avatars/boy-avatar-2.png";

import girlAvatar from "@/assets/patient/avatars/girl-avatar.png";
import girlAvatar2 from "@/assets/patient/avatars/girl-avatar-2.png";
import girlAvatar3 from "@/assets/patient/avatars/girl-avatar-3.png";

import neutralAvatar from "@/assets/patient/avatars/neutral-avatar.png";

/* =========================================================
   PATIENT HERO IMAGES
   ========================================================= */

import boyHealth from "@/assets/patient/hero/boy-health.png";
import girlHealth from "@/assets/patient/hero/girl-health.png";
import neutralHealth from "@/assets/patient/hero/neutral-health.png";


/* =========================================================
   TYPES
   ========================================================= */

type GenderType = "boy" | "girl" | "neutral";


/* =========================================================
   GENDER NORMALIZER
   ========================================================= */

function getGender(gender?: string | null): GenderType {
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


/* =========================================================
   FALLBACK AVATAR
   ========================================================= */

function getFallbackAvatar(
  gender?: string | null
) {
  const normalizedGender = getGender(gender);

  switch (normalizedGender) {
    case "boy":
      return boyAvatar;

    case "girl":
      return girlAvatar;

    default:
      return neutralAvatar;
  }
}


/* =========================================================
   HERO IMAGE
   ========================================================= */

function getHeroImage(
  gender?: string | null
) {
  const normalizedGender = getGender(gender);

  switch (normalizedGender) {
    case "boy":
      return boyHealth;

    case "girl":
      return girlHealth;

    default:
      return neutralHealth;
  }
}


/* =========================================================
   PROFILE PHOTO
   ========================================================= */

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


/* =========================================================
   PATIENT DASHBOARD
   ========================================================= */

export default function PatientDashboard() {
  const { user } = useAuth();

  const [healthScore, setHealthScore] =
    useState<any>(null);

  const [predictions, setPredictions] =
    useState<any[]>([]);

  const [reportsCount, setReportsCount] =
    useState(0);

  const [timeline, setTimeline] =
    useState<any[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [hasError, setHasError] =
    useState(false);


  /* =======================================================
     LOAD DASHBOARD DATA
     ======================================================= */

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        const [
          score,
          preds,
          reports,
          tl,
        ] = await Promise.all([
          fetchHealthScoreApi(),
          fetchPredictionHistoryApi(),
          fetchPatientReportsApi(),
          fetchPatientTimelineApi(),
        ]);

        if (!mounted) return;

        setHealthScore(score);

        setPredictions(
          Array.isArray(preds)
            ? preds
            : []
        );

        setReportsCount(
          Array.isArray(reports)
            ? reports.length
            : 0
        );

        setTimeline(
          tl?.items ??
            (Array.isArray(tl)
              ? tl
              : [])
        );
      } catch (error) {
        console.error(
          "Patient dashboard loading error:",
          error
        );

        if (mounted) {
          setHasError(true);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);


  /* =======================================================
     USER DATA
     ======================================================= */

  const firstName =
    user?.name?.split(" ")[0] ||
    "there";

  const gender = getGender(
    user?.gender
  );

  const profilePhoto =
    getProfilePhoto(user);

  const fallbackAvatar =
    getFallbackAvatar(user?.gender);

  const heroImage =
    getHeroImage(user?.gender);


  /* =======================================================
     PREDICTION DATA
     ======================================================= */

  const latestPrediction =
    predictions[0];


  /* =======================================================
     HEALTH SCORE COLOR
     ======================================================= */

  const scoreColor = useMemo(() => {
    const score =
      healthScore?.score;

    if (score == null) {
      return "text-muted-foreground";
    }

    if (score >= 80) {
      return "text-emerald-500";
    }

    if (score >= 60) {
      return "text-amber-500";
    }

    return "text-destructive";
  }, [healthScore]);


  /* =======================================================
     SCORE PROGRESS
     ======================================================= */

  const score =
    Number(healthScore?.score ?? 0);

  const scoreProgress =
    Math.min(
      Math.max(score, 0),
      100
    );


  /* =======================================================
     LOADING
     ======================================================= */

  if (isLoading) {
    return (
      <div
        className="
          flex
          min-h-[65vh]
          items-center
          justify-center
        "
      >
        <div
          className="
            flex
            items-center
            gap-3
            rounded-2xl
            border
            border-border/60
            bg-card
            px-5
            py-4
            shadow-sm
          "
        >
          <Loader2
            className="
              h-5
              w-5
              animate-spin
              text-primary
            "
          />

          <span
            className="
              text-sm
              text-muted-foreground
            "
          >
            Loading your health dashboard...
          </span>
        </div>
      </div>
    );
  }


  /* =======================================================
     MAIN DASHBOARD
     ======================================================= */

  return (
    <div
      className="
        mx-auto
        w-full
        max-w-[1500px]
        space-y-6
        pb-8
      "
    >

      {/* ===================================================
          HERO SECTION
          =================================================== */}

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
          duration: 0.5,
        }}
        className="
          relative
          overflow-hidden
          rounded-[30px]
          border
          border-border/60
          bg-card
          shadow-sm
        "
      >

        {/* Background decoration */}

        <div
          className="
            absolute
            -right-20
            -top-24
            h-72
            w-72
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
            h-64
            w-64
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
            min-h-[330px]
            lg:grid-cols-[1fr_370px]
          "
        >

          {/* =============================================
              HERO CONTENT
          ============================================= */}

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

            {/* Label */}

            <div
              className="
                mb-5
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  flex
                  h-11
                  w-11
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
                    tracking-[0.16em]
                    text-muted-foreground
                  "
                >
                  AI Health Dashboard
                </p>

                <p
                  className="
                    text-sm
                    text-muted-foreground
                  "
                >
                  Your personal health companion
                </p>
              </div>

            </div>


            {/* Greeting */}

            <h1
              className="
                max-w-2xl
                text-3xl
                font-bold
                tracking-tight
                text-foreground
                sm:text-4xl
                lg:text-[42px]
                lg:leading-[1.1]
              "
            >
              Good morning,{" "}
              {firstName}! 👋
            </h1>


            {/* Subtitle */}

            <p
              className="
                mt-3
                max-w-xl
                text-sm
                leading-6
                text-muted-foreground
                sm:text-base
              "
            >
              {healthScore?.score != null
                ? healthScore?.label ||
                  "Your latest AI health assessment is ready."
                : "Run your first AI prediction to understand your health risks and get personalized insights."}
            </p>


            {/* Buttons */}

            <div
              className="
                mt-7
                flex
                flex-wrap
                gap-3
              "
            >

              <Button
                asChild
                className="
                  rounded-xl
                  px-5
                  gap-2
                "
              >
                <Link
                  to="/dashboard/patient/predict"
                >
                  <Brain className="h-4 w-4" />

                  Run AI Prediction

                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>


              <Button
                asChild
                variant="outline"
                className="
                  rounded-xl
                  px-5
                "
              >
                <Link
                  to="/dashboard/patient/reports"
                >
                  View Reports
                </Link>
              </Button>

            </div>


            {/* Mini health score */}

            {healthScore?.score != null && (
              <div
                className="
                  mt-7
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
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-xl
                    bg-rose-500/10
                    text-rose-500
                  "
                >
                  <Heart className="h-5 w-5" />
                </div>

                <div>
                  <p
                    className="
                      text-[11px]
                      text-muted-foreground
                    "
                  >
                    Current Health Score
                  </p>

                  <p
                    className="
                      text-sm
                      font-bold
                      text-foreground
                    "
                  >
                    {healthScore.score}/100
                    {healthScore.label
                      ? ` · ${healthScore.label}`
                      : ""}
                  </p>
                </div>

              </div>
            )}

          </div>


          {/* =============================================
              HERO IMAGE
          ============================================= */}

          <div
            className="
              relative
              hidden
              min-h-[330px]
              items-end
              justify-center
              lg:flex
            "
          >

            {/* Circle behind illustration */}

            <div
              className="
                absolute
                bottom-4
                h-64
                w-64
                rounded-full
                bg-primary/10
                blur-2xl
              "
            />

            {/* Gender-specific health image */}

            <motion.img
              key={gender}
              initial={{
                opacity: 0,
                scale: 0.9,
                y: 15,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              transition={{
                duration: 0.55,
              }}
              src={heroImage}
              alt="Personalized health illustration"
              className="
                relative
                z-10
                max-h-[320px]
                max-w-[350px]
                object-contain
                drop-shadow-xl
              "
            />
            {/* =========================================
                AI STATUS
            ========================================= */}

            <div
              className="
                absolute
                right-6
                top-6
                z-20
                flex
                items-center
                gap-2
                rounded-2xl
                border
                border-border/60
                bg-background/85
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
                <Activity className="h-4 w-4" />
              </div>

              <div>
                <p
                  className="
                    text-[10px]
                    text-muted-foreground
                  "
                >
                  AI Monitoring
                </p>

                <p
                  className="
                    text-xs
                    font-semibold
                  "
                >
                  Active
                </p>
              </div>

            </div>

          </div>

        </div>

      </motion.section>


      {/* ===================================================
          ERROR MESSAGE
          =================================================== */}

      {hasError && (
        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="
            rounded-2xl
            border
            border-destructive/20
            bg-destructive/5
            px-4
            py-3
            text-sm
            text-destructive
          "
        >
          Some health information could not
          be loaded. Please refresh and try
          again.
        </motion.div>
      )}


      {/* ===================================================
          STAT CARDS
          =================================================== */}

      <div
        className="
          grid
          grid-cols-2
          gap-3
          md:grid-cols-4
          md:gap-4
        "
      >

        <StatCard
          title="Health Score"
          value={
            healthScore?.score != null
              ? `${healthScore.score}/100`
              : "—"
          }
          icon={Heart}
          iconBg="
            bg-rose-100
            dark:bg-rose-500/10
          "
          iconColor="text-rose-500"
          index={0}
        />


        <StatCard
          title="Diabetes Risk"
          value={
            latestPrediction
              ?.diabetes_risk_level ??
            "No data"
          }
          icon={Brain}
          iconBg="
            bg-amber-100
            dark:bg-amber-500/10
          "
          iconColor="text-amber-500"
          index={1}
        />


        <StatCard
          title="Medical Reports"
          value={reportsCount}
          icon={FileText}
          iconBg="
            bg-blue-100
            dark:bg-blue-500/10
          "
          iconColor="text-blue-500"
          index={2}
        />


        <StatCard
          title="AI Predictions"
          value={predictions.length}
          icon={Activity}
          iconBg="
            bg-violet-100
            dark:bg-violet-500/10
          "
          iconColor="text-violet-500"
          index={3}
        />

      </div>


      {/* ===================================================
          MAIN CONTENT
          =================================================== */}

      <div
        className="
          grid
          gap-6
          lg:grid-cols-[1.05fr_0.95fr]
        "
      >

        {/* =================================================
            HEALTH SCORE CARD
            ================================================= */}

        <Card
          className="
            overflow-hidden
            rounded-[28px]
            border-border/60
            shadow-sm
          "
        >

          <CardHeader
            className="
              flex
              flex-row
              items-center
              justify-between
              space-y-0
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-rose-500/10
                  text-rose-500
                "
              >
                <Heart className="h-5 w-5" />
              </div>

              <div>
                <CardTitle>
                  Health Overview
                </CardTitle>

                <p
                  className="
                    mt-0.5
                    text-xs
                    text-muted-foreground
                  "
                >
                  Your latest health assessment
                </p>
              </div>

            </div>


            <Badge
              variant="secondary"
              className="rounded-full"
            >
              AI Powered
            </Badge>

          </CardHeader>


          <CardContent>

            {/* =========================================
                SCORE
            ========================================= */}

            <div
              className="
                flex
                flex-col
                items-center
                py-4
              "
            >

              <div
                className="
                  relative
                  flex
                  h-44
                  w-44
                  items-center
                  justify-center
                "
              >

                {/* SVG progress circle */}

                <svg
                  className="
                    absolute
                    inset-0
                    h-full
                    w-full
                    -rotate-90
                  "
                  viewBox="0 0 100 100"
                >

                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="
                      text-muted
                    "
                  />

                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="263.89"
                    strokeDashoffset={
                      263.89 -
                      (263.89 *
                        scoreProgress) /
                        100
                    }
                    className="
                      text-primary
                      transition-all
                      duration-700
                    "
                  />

                </svg>


                <div className="text-center">

                  <div
                    className={`
                      text-5xl
                      font-extrabold
                      tracking-tight
                      ${scoreColor}
                    `}
                  >
                    {healthScore?.score ??
                      "—"}
                  </div>

                  <p
                    className="
                      text-xs
                      text-muted-foreground
                    "
                  >
                    out of 100
                  </p>

                </div>

              </div>


              <Badge
                variant="secondary"
                className="
                  mt-3
                  rounded-full
                  px-4
                  py-1
                "
              >
                {healthScore?.label ??
                  "No predictions yet"}
              </Badge>

            </div>


            {/* =========================================
                RISK GRID
            ========================================= */}

            {latestPrediction ? (
              <div
                className="
                  grid
                  grid-cols-1
                  gap-3
                  sm:grid-cols-3
                "
              >

                <RiskBox
                  icon={Brain}
                  label="Diabetes"
                  value={
                    latestPrediction
                      .diabetes_risk_level
                  }
                  color="amber"
                />

                <RiskBox
                  icon={Heart}
                  label="Cardiovascular"
                  value={
                    latestPrediction
                      .cvd_risk_level
                  }
                  color="rose"
                />

                <RiskBox
                  icon={Activity}
                  label="Hypertension"
                  value={
                    latestPrediction
                      .hypertension_risk_level ??
                    "N/A"
                  }
                  color="blue"
                />

              </div>
            ) : (
              <div
                className="
                  rounded-2xl
                  border
                  border-dashed
                  border-border
                  p-5
                  text-center
                "
              >

                <Brain
                  className="
                    mx-auto
                    mb-2
                    h-6
                    w-6
                    text-muted-foreground
                  "
                />

                <p
                  className="
                    text-sm
                    font-medium
                  "
                >
                  No health prediction yet
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-muted-foreground
                  "
                >
                  Run an AI prediction to
                  start tracking your health.
                </p>

              </div>
            )}

          </CardContent>

        </Card>


        {/* =================================================
            AI PREDICTIONS
            ================================================= */}

        <Card
          className="
            rounded-[28px]
            border-border/60
            shadow-sm
          "
        >

          <CardHeader
            className="
              flex
              flex-row
              items-center
              justify-between
              space-y-0
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-primary/10
                  text-primary
                "
              >
                <Brain className="h-5 w-5" />
              </div>

              <div>

                <CardTitle>
                  Recent Predictions
                </CardTitle>

                <p
                  className="
                    mt-0.5
                    text-xs
                    text-muted-foreground
                  "
                >
                  Your recent AI assessments
                </p>

              </div>

            </div>


            <Button
              asChild
              size="sm"
              variant="outline"
              className="rounded-xl"
            >
              <Link
                to="/dashboard/patient/predict"
              >
                New
              </Link>
            </Button>

          </CardHeader>


          <CardContent
            className="
              space-y-3
            "
          >

            {predictions.length === 0 ? (

              <div
                className="
                  flex
                  flex-col
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-dashed
                  p-8
                  text-center
                "
              >

                <div
                  className="
                    mb-3
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-2xl
                    bg-primary/10
                    text-primary
                  "
                >
                  <Brain className="h-5 w-5" />
                </div>

                <p
                  className="
                    text-sm
                    font-semibold
                  "
                >
                  No predictions yet
                </p>

                <p
                  className="
                    mt-1
                    max-w-xs
                    text-xs
                    text-muted-foreground
                  "
                >
                  Run your first AI prediction
                  to start tracking your health.
                </p>

                <Button
                  asChild
                  size="sm"
                  className="
                    mt-4
                    rounded-xl
                  "
                >
                  <Link
                    to="/dashboard/patient/predict"
                  >
                    Start Prediction
                  </Link>
                </Button>

              </div>

            ) : (

              predictions
                .slice(0, 4)
                .map((pred, index) => (

                  <motion.div
                    key={pred.id ?? index}
                    initial={{
                      opacity: 0,
                      x: 10,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      delay:
                        index * 0.05,
                    }}
                    className="
                      group
                      flex
                      items-center
                      justify-between
                      gap-3
                      rounded-2xl
                      border
                      border-border/50
                      bg-muted/20
                      p-3
                      transition-all
                      hover:bg-muted/50
                    "
                  >

                    <div
                      className="
                        flex
                        min-w-0
                        items-center
                        gap-3
                      "
                    >

                      <div
                        className="
                          flex
                          h-10
                          w-10
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-primary/10
                          text-primary
                        "
                      >
                        <Activity className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">

                        <p
                          className="
                            truncate
                            text-sm
                            font-medium
                          "
                        >
                          Health Risk Assessment
                        </p>

                        <p
                          className="
                            truncate
                            text-xs
                            text-muted-foreground
                          "
                        >
                          {formatDate(
                            pred.created_at
                          )}

                          {pred.model_version
                            ? ` · ${pred.model_version}`
                            : ""}
                        </p>

                      </div>

                    </div>


                    <div
                      className="
                        shrink-0
                        text-right
                      "
                    >

                      <p
                        className={`
                          text-sm
                          font-bold
                          ${getRiskColor(
                            pred.diabetes_risk_level
                          )}
                        `}
                      >
                        {
                          pred.diabetes_risk_level
                        }
                      </p>

                      <p
                        className="
                          text-[11px]
                          text-muted-foreground
                        "
                      >
                        {pred.diabetes_probability !=
                        null
                          ? `${Math.round(
                              pred.diabetes_probability *
                                100
                            )}% probability`
                          : "Assessment"}
                      </p>

                    </div>

                  </motion.div>

                ))

            )}

          </CardContent>

        </Card>

      </div>


      {/* ===================================================
          QUICK ACTIONS
          =================================================== */}

      <section>

        <div
          className="
            mb-4
            flex
            items-center
            justify-between
          "
        >

          <div>

            <h2
              className="
                text-lg
                font-bold
              "
            >
              Quick Actions
            </h2>

            <p
              className="
                text-xs
                text-muted-foreground
              "
            >
              Everything you need in one place
            </p>

          </div>

        </div>


        <div
          className="
            grid
            grid-cols-1
            gap-4
            sm:grid-cols-2
            lg:grid-cols-4
          "
        >

          <QuickAction
            icon={Brain}
            title="AI Prediction"
            description="Check your health risks"
            href="/dashboard/patient/predict"
            iconClass="bg-primary/10 text-primary"
          />

          <QuickAction
            icon={FileText}
            title="Medical Reports"
            description="View your reports"
            href="/dashboard/patient/reports"
            iconClass="bg-blue-500/10 text-blue-500"
          />

          <QuickAction
            icon={CalendarDays}
            title="Appointments"
            description="Manage your appointments"
            href="/dashboard/patient/appointments"
            iconClass="bg-violet-500/10 text-violet-500"
          />

          <QuickAction
            icon={ShieldCheck}
            title="Health History"
            description="Review your timeline"
            href="/dashboard/patient/timeline"
            iconClass="bg-emerald-500/10 text-emerald-500"
          />

        </div>

      </section>


      {/* ===================================================
          HEALTH TIMELINE
          =================================================== */}

      <section>

        <HealthTimeline
          items={timeline}
        />

      </section>


      {/* ===================================================
          HEALTH TIP
          =================================================== */}

      <motion.div
        initial={{
          opacity: 0,
          y: 15,
        }}
        whileInView={{
          opacity: 1,
          y: 0,
        }}
        viewport={{
          once: true,
        }}
        className="
          relative
          overflow-hidden
          rounded-[26px]
          border
          border-border/60
          bg-gradient-to-r
          from-primary/10
          via-card
          to-health/10
          p-5
          sm:p-6
        "
      >

        <div
          className="
            flex
            flex-col
            gap-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >

          <div
            className="
              flex
              items-start
              gap-4
            "
          >

            <div
              className="
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                rounded-2xl
                bg-amber-500/10
                text-amber-500
              "
            >
              <Sparkles className="h-5 w-5" />
            </div>

            <div>

              <p
                className="
                  text-sm
                  font-semibold
                "
              >
                Your health journey starts
                with small steps ✨
              </p>

              <p
                className="
                  mt-1
                  max-w-2xl
                  text-xs
                  leading-5
                  text-muted-foreground
                "
              >
                Keep your health information
                updated and regularly review
                your AI-generated insights.
              </p>

            </div>

          </div>


          <Link
            to="/dashboard/patient/profile"
            className="
              inline-flex
              shrink-0
              items-center
              gap-1
              text-sm
              font-medium
              text-primary
              hover:underline
            "
          >
            Update Profile

            <ChevronRight className="h-4 w-4" />
          </Link>

        </div>

      </motion.div>

    </div>
  );
}


/* =========================================================
   RISK BOX
   ========================================================= */

function RiskBox({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: "amber" | "rose" | "blue";
}) {
  const colorClasses = {
    amber:
      "bg-amber-500/10 text-amber-500",

    rose:
      "bg-rose-500/10 text-rose-500",

    blue:
      "bg-blue-500/10 text-blue-500",
  };

  return (
    <div
      className="
        rounded-2xl
        border
        border-border/50
        bg-muted/20
        p-3
      "
    >

      <div
        className="
          flex
          items-center
          gap-2
        "
      >

        <div
          className={`
            flex
            h-8
            w-8
            items-center
            justify-center
            rounded-xl
            ${colorClasses[color]}
          `}
        >
          <Icon className="h-4 w-4" />
        </div>

        <span
          className="
            text-xs
            text-muted-foreground
          "
        >
          {label}
        </span>

      </div>

      <p
        className={`
          mt-2
          text-sm
          font-bold
          ${getRiskColor(value)}
        `}
      >
        {value}
      </p>

    </div>
  );
}


/* =========================================================
   QUICK ACTION
   ========================================================= */

function QuickAction({
  icon: Icon,
  title,
  description,
  href,
  iconClass,
}: {
  icon: any;
  title: string;
  description: string;
  href: string;
  iconClass: string;
}) {
  return (
    <Link to={href}>

      <motion.div
        whileHover={{
          y: -4,
        }}
        transition={{
          duration: 0.2,
        }}
        className="
          group
          h-full
          rounded-[22px]
          border
          border-border/60
          bg-card
          p-5
          shadow-sm
          transition-all
          hover:shadow-md
        "
      >

        <div
          className={`
            mb-4
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-2xl
            ${iconClass}
            transition-transform
            group-hover:scale-105
          `}
        >
          <Icon className="h-5 w-5" />
        </div>


        <div
          className="
            flex
            items-center
            justify-between
            gap-2
          "
        >

          <div>

            <p
              className="
                text-sm
                font-semibold
              "
            >
              {title}
            </p>

            <p
              className="
                mt-1
                text-xs
                leading-5
                text-muted-foreground
              "
            >
              {description}
            </p>

          </div>

          <ChevronRight
            className="
              h-4
              w-4
              shrink-0
              text-muted-foreground
              transition-transform
              group-hover:translate-x-1
            "
          />

        </div>

      </motion.div>

    </Link>
  );
}