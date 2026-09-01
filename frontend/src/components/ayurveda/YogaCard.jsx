import React from "react";
import {
  Sparkles,
  PlayCircle,
  Wind,
  Moon,
  Activity,
  Info,
  Clock,
  Leaf,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";


const getPracticeIcon = (type) => {
  switch (type) {
    case "pranayama":
      return Wind;

    case "meditation":
      return Moon;

    case "sequence":
      return Activity;

    case "asana":
    default:
      return Activity;
  }
};


export const YogaCard = ({
  yogaPlan,
  loading,
}) => {

  /*
   * Loading state
   */
  if (loading) {
    return (
      <Card
        className="
          border-slate-200/70
          bg-white
          shadow-sm
          dark:border-slate-800
          dark:bg-slate-950
        "
      >
        <CardContent className="p-6">

          <div className="animate-pulse space-y-4">

            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />

            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />

            <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded" />

            <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded" />

            <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded" />

          </div>

        </CardContent>
      </Card>
    );
  }


  /*
   * Required profile information is missing.
   */
  if (!yogaPlan) {
    return (
      <Card
        className="
          border-slate-200/70
          bg-white
          shadow-sm
          dark:border-slate-800
          dark:bg-slate-950
        "
      >
        <CardContent className="p-8 text-center">

          <div
            className="
              mx-auto mb-4
              flex size-12
              items-center justify-center
              rounded-xl
              bg-purple-50
              text-purple-600
              dark:bg-purple-950/40
              dark:text-purple-400
            "
          >
            <Sparkles className="size-6" />
          </div>

          <h3 className="text-base font-bold">
            Complete your health profile first
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            Complete the Prakriti Quiz and run a health
            prediction so MediGuard AI can generate your
            personalized yoga plan.
          </p>

        </CardContent>
      </Card>
    );
  }


  const schedule =
    yogaPlan.weekly_schedule || {};

  const tips =
    yogaPlan.tips || [];


  /*
   * Convert backend object into an array.
   */
  const days = Object.entries(schedule);


  return (
    <Card
      className="
        h-full
        overflow-hidden
        border-slate-200/70
        bg-white
        shadow-sm
        dark:border-slate-800
        dark:bg-slate-950
      "
    >

      {/* HEADER */}

      <CardHeader
        className="
          border-b
          border-slate-100
          px-5 py-5
          dark:border-slate-800
        "
      >

        <div className="flex items-start justify-between gap-4">

          <div className="flex items-start gap-3">

            <div
              className="
                flex size-10 shrink-0
                items-center justify-center
                rounded-xl
                bg-purple-50
                text-purple-600
                dark:bg-purple-950/40
                dark:text-purple-400
              "
            >
              <Sparkles className="size-5" />
            </div>


            <div>

              <div className="flex items-center gap-2">

                <CardTitle className="text-base font-bold tracking-tight">
                  Personalized Yoga & Pranayama
                </CardTitle>

                <Sparkles className="size-3.5 text-purple-500" />

              </div>

              <p className="mt-1 text-xs text-muted-foreground">

                {yogaPlan.dosha
                  ? `${yogaPlan.dosha
                      .charAt(0)
                      .toUpperCase()}${yogaPlan.dosha.slice(1)}-balanced weekly plan`
                  : "Ayurvedic personalized movement plan"}

              </p>

            </div>

          </div>


          <div
            className="
              hidden items-center gap-1.5
              rounded-full
              border border-purple-200
              bg-purple-50
              px-2.5 py-1
              text-[9px] font-semibold
              text-purple-700
              sm:flex
              dark:border-purple-900
              dark:bg-purple-950/30
              dark:text-purple-400
            "
          >
            <PlayCircle className="size-3" />
            {days.length}-day plan
          </div>

        </div>

      </CardHeader>


      <CardContent className="space-y-6 p-5">


        {/* WEEKLY PLAN */}

        <section>

          <div className="mb-3 flex items-center gap-2">

            <div
              className="
                flex size-7
                items-center justify-center
                rounded-lg
                bg-purple-50
                text-purple-600
                dark:bg-purple-950/40
                dark:text-purple-400
              "
            >
              <Clock className="size-3.5" />
            </div>


            <div>

              <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Weekly Yoga Schedule
              </h5>

              <p className="text-[9px] text-muted-foreground">
                Generated according to your health profile
              </p>

            </div>

          </div>


          <div className="space-y-3">

            {days.map(([day, session]) => (

              <div
                key={day}
                className="
                  rounded-xl
                  border
                  border-purple-100
                  bg-purple-50/40
                  p-3.5
                  dark:border-purple-950
                  dark:bg-purple-950/15
                "
              >

                {/* DAY HEADER */}

                <div className="flex items-center justify-between gap-3">

                  <div>

                    <p className="text-[11px] font-bold text-purple-700 dark:text-purple-400">
                      {day}
                    </p>

                    <p className="mt-0.5 text-[9px] text-muted-foreground">
                      {session.session_type}
                    </p>

                  </div>


                  <div
                    className="
                      rounded-full
                      border
                      border-purple-200
                      bg-white
                      px-2 py-1
                      text-[9px]
                      font-semibold
                      text-purple-600
                      dark:border-purple-900
                      dark:bg-slate-950
                      dark:text-purple-400
                    "
                  >
                    {session.total_duration}
                  </div>

                </div>


                {/* PRACTICES */}

                <div className="mt-3 space-y-2">

                  {(session.practices || []).map(
                    (practice, index) => {

                      const Icon =
                        getPracticeIcon(
                          practice.type
                        );

                      return (
                        <div
                          key={`${practice.name}-${index}`}
                          className="
                            rounded-lg
                            border
                            border-slate-200/70
                            bg-white/70
                            p-2.5
                            dark:border-slate-800
                            dark:bg-slate-950/50
                          "
                        >

                          <div className="flex items-start gap-2.5">

                            <div
                              className="
                                flex size-7 shrink-0
                                items-center justify-center
                                rounded-lg
                                bg-purple-100
                                text-purple-600
                                dark:bg-purple-950
                                dark:text-purple-400
                              "
                            >
                              <Icon className="size-3.5" />
                            </div>


                            <div className="min-w-0 flex-1">

                              <div className="flex items-start justify-between gap-2">

                                <div>

                                  <p className="text-[10px] font-bold text-slate-900 dark:text-slate-100">
                                    {practice.emoji}{" "}
                                    {practice.name}
                                  </p>

                                  <p className="mt-0.5 text-[9px] capitalize text-muted-foreground">
                                    {practice.type} •{" "}
                                    {practice.difficulty} •{" "}
                                    {practice.duration}
                                  </p>

                                </div>

                              </div>


                              {/* BENEFITS */}

                              {practice.benefits?.length > 0 && (

                                <div className="mt-2 flex flex-wrap gap-1.5">

                                  {practice.benefits.map(
                                    (benefit) => (

                                      <span
                                        key={benefit}
                                        className="
                                          rounded-full
                                          bg-purple-50
                                          px-2 py-0.5
                                          text-[8px]
                                          text-purple-700
                                          dark:bg-purple-950/40
                                          dark:text-purple-400
                                        "
                                      >
                                        {benefit}
                                      </span>

                                    )
                                  )}

                                </div>

                              )}


                              {/* CONTRAINDICATIONS */}

                              {practice.contraindications?.length > 0 && (

                                <div className="mt-2">

                                  <p className="text-[8px] font-semibold text-amber-600 dark:text-amber-400">
                                    Caution:
                                  </p>

                                  <p className="mt-0.5 text-[8px] leading-relaxed text-muted-foreground">
                                    {practice.contraindications.join(
                                      " • "
                                    )}
                                  </p>

                                </div>

                              )}

                            </div>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              </div>

            ))}

          </div>

        </section>


        {/* TIPS */}

        {tips.length > 0 && (

          <section>

            <div className="mb-3 flex items-center gap-2">

              <div
                className="
                  flex size-7
                  items-center justify-center
                  rounded-lg
                  bg-purple-50
                  text-purple-600
                  dark:bg-purple-950/40
                  dark:text-purple-400
                "
              >
                <Leaf className="size-3.5" />
              </div>

              <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Practice Guidelines
              </h5>

            </div>


            <div className="space-y-2">

              {tips.map((tip, index) => (

                <div
                  key={index}
                  className="flex items-start gap-2"
                >

                  <span
                    className="
                      mt-1.5
                      size-1.5
                      shrink-0
                      rounded-full
                      bg-purple-500
                    "
                  />

                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    {tip}
                  </p>

                </div>

              ))}

            </div>

          </section>

        )}


        {/* DISCLAIMER */}

        <div
          className="
            flex items-start gap-2
            rounded-xl
            border
            border-slate-200/70
            bg-slate-50/70
            px-3 py-2.5
            dark:border-slate-800
            dark:bg-slate-900/40
          "
        >

          <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />

          <p className="text-[9px] leading-relaxed text-muted-foreground">
            {yogaPlan.disclaimer ||
              "These activities are complementary wellness guidance. Consult your physician before starting a new exercise program, especially if you have a cardiac or musculoskeletal condition."}
          </p>

        </div>

      </CardContent>

    </Card>
  );
};


export default YogaCard;