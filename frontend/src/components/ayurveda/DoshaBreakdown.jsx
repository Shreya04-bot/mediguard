import React from "react";
import {
  Sparkles,
  Leaf,
  Sun,
  Wind,
  CircleDot,
  Info,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

const DOSHAS = [
  {
    key: "pittaPercentage",
    name: "Pitta",
    description: "Fire & Transformation",
    icon: Sun,
    color: "amber",
    bar: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    soft: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-900",
  },
  {
    key: "vataPercentage",
    name: "Vata",
    description: "Air & Vital Movement",
    icon: Wind,
    color: "blue",
    bar: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    soft: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-900",
  },
  {
    key: "kaphaPercentage",
    name: "Kapha",
    description: "Earth & Structure",
    icon: Leaf,
    color: "emerald",
    bar: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    soft: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-900",
  },
];

export const DoshaBreakdown = ({
  scores = {
    vataPercentage: 25,
    pittaPercentage: 55,
    kaphaPercentage: 20,
  },
}) => {
  const normalizedScores = {
    vataPercentage: Number(scores?.vataPercentage) || 0,
    pittaPercentage: Number(scores?.pittaPercentage) || 0,
    kaphaPercentage: Number(scores?.kaphaPercentage) || 0,
  };

  const dominantDosha = DOSHAS.reduce((highest, current) => {
    return normalizedScores[current.key] > normalizedScores[highest.key]
      ? current
      : highest;
  }, DOSHAS[0]);

  const dominantValue = normalizedScores[dominantDosha.key];

  return (
    <Card
      className="
        mb-6
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className="
                flex size-10 shrink-0
                items-center justify-center
                rounded-xl
                bg-amber-50
                text-amber-600
                dark:bg-amber-950/40
                dark:text-amber-400
              "
            >
              <Sparkles className="size-5" />
            </div>

            <div>
              <CardTitle className="text-base font-bold tracking-tight">
                Ayurvedic Prakriti Profile
              </CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Personalized dosha composition based on your current profile
              </p>
            </div>
          </div>

          <div
            className="
              flex w-fit items-center gap-1.5
              rounded-full
              border border-amber-200
              bg-amber-50
              px-2.5 py-1
              text-[9px] font-semibold
              text-amber-700
              dark:border-amber-900
              dark:bg-amber-950/30
              dark:text-amber-400
            "
          >
            <CircleDot className="size-3" />
            Dominant: {dominantDosha.name}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {/* DOMINANT DOSHA SUMMARY */}

        <div
          className={`
            mb-5
            flex items-center justify-between gap-4
            rounded-xl
            border
            ${dominantDosha.border}
            ${dominantDosha.soft}
            px-4 py-3
          `}
        >
          <div className="flex items-center gap-3">
            <div
              className={`
                flex size-9
                items-center justify-center
                rounded-lg
                bg-white/70
                ${dominantDosha.text}
                dark:bg-slate-950/40
              `}
            >
              <dominantDosha.icon className="size-4" />
            </div>

            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Primary Prakriti
              </p>

              <p
                className={`text-sm font-bold ${dominantDosha.text}`}
              >
                {dominantDosha.name}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {dominantValue}%
            </p>

            <p className="text-[9px] text-muted-foreground">
              profile share
            </p>
          </div>
        </div>

        {/* DOSHA BREAKDOWN */}

        <div className="space-y-4">
          {DOSHAS.map((dosha) => {
            const value = Math.min(
              100,
              Math.max(0, normalizedScores[dosha.key])
            );

            const Icon = dosha.icon;

            return (
              <div key={dosha.key} className="group">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className={`
                        flex size-7 shrink-0
                        items-center justify-center
                        rounded-lg
                        ${dosha.soft}
                        ${dosha.text}
                      `}
                    >
                      <Icon className="size-3.5" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {dosha.name}
                      </p>

                      <p className="truncate text-[9px] text-muted-foreground">
                        {dosha.description}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`
                      shrink-0
                      text-sm font-bold
                      ${dosha.text}
                    `}
                  >
                    {value}%
                  </span>
                </div>

                <div className="relative h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`
                      h-full
                      rounded-full
                      ${dosha.bar}
                      transition-all
                      duration-700
                      ease-out
                    `}
                    style={{
                      width: `${value}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* FOOTER */}

        <div
          className="
            mt-5
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
            Your dosha profile represents the relative contribution of Vata,
            Pitta and Kapha. Use this information as complementary wellness
            guidance alongside professional healthcare advice.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DoshaBreakdown;