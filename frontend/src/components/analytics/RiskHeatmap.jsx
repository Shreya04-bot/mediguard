import React from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

const LEVEL_CONFIG = {
  low: {
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    icon: CheckCircle2,
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900",
  },

  moderate: {
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    icon: Activity,
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900",
  },

  high: {
    dot: "bg-rose-500",
    bar: "bg-rose-500",
    icon: AlertCircle,
    badge:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900",
  },

  critical: {
    dot: "bg-purple-600",
    bar: "bg-purple-600",
    icon: ShieldAlert,
    badge:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900",
  },
};

function levelFromName(name = "") {
  const match = name.match(/—\s*(\w+)/);
  return (match ? match[1] : "low").toLowerCase();
}

function getConditionName(name = "") {
  return name.replace(/\s*—\s*(low|moderate|high|critical)\s*$/i, "");
}

/**
 * Condition × severity breakdown from real prediction data.
 *
 * This component intentionally uses prediction data instead of
 * geographic information because patient location is not tracked
 * in the current system.
 *
 * @param {{
 *   diseaseDistribution: Array<{
 *     name: string,
 *     count: number
 *   }>
 * }} props
 */
export const RiskHeatmap = ({ diseaseDistribution = [] }) => {
  const total =
    diseaseDistribution.reduce((sum, item) => sum + item.count, 0) || 1;

  const sortedDistribution = [...diseaseDistribution].sort(
    (a, b) => b.count - a.count
  );

  const highestRisk =
    sortedDistribution.length > 0
      ? sortedDistribution.reduce((highest, current) => {
          const currentLevel = levelFromName(current.name);
          const highestLevel = levelFromName(highest.name);

          const weight = {
            low: 1,
            moderate: 2,
            high: 3,
            critical: 4,
          };

          return weight[currentLevel] > weight[highestLevel]
            ? current
            : highest;
        })
      : null;

  return (
    <Card
      className="
        overflow-hidden
        border-slate-200/70
        bg-white
        shadow-sm
        dark:border-slate-800
        dark:bg-slate-950
      "
    >
      {/* HEADER */}

      <CardHeader className="border-b border-slate-100 px-5 py-5 dark:border-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className="
                flex size-10 shrink-0 items-center justify-center
                rounded-xl bg-primary/10 text-primary
              "
            >
              <Activity className="size-5" />
            </div>

            <div>
              <CardTitle className="text-base font-bold tracking-tight">
                Condition Risk Breakdown
              </CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Distribution of recorded predictions by condition and severity
              </p>
            </div>
          </div>

          {diseaseDistribution.length > 0 && (
            <div
              className="
                flex w-fit items-center gap-1.5
                rounded-full
                border border-slate-200
                bg-slate-50
                px-2.5 py-1
                text-[9px] font-medium
                text-muted-foreground
                dark:border-slate-800
                dark:bg-slate-900
              "
            >
              <span className="size-1.5 rounded-full bg-primary" />
              {diseaseDistribution.length} risk categories
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {/* EMPTY STATE */}

        {diseaseDistribution.length === 0 ? (
          <div
            className="
              flex min-h-[220px]
              flex-col items-center justify-center
              rounded-xl
              border border-dashed
              border-slate-200
              bg-slate-50/50
              px-6
              text-center
              dark:border-slate-800
              dark:bg-slate-900/30
            "
          >
            <div
              className="
                flex size-11 items-center justify-center
                rounded-xl bg-slate-100
                text-slate-400
                dark:bg-slate-900
                dark:text-slate-500
              "
            >
              <Activity className="size-5" />
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              No predictions recorded yet
            </p>

            <p className="mt-1 max-w-sm text-[10px] leading-relaxed text-muted-foreground">
              Condition risk distribution will appear here once patient
              predictions are available.
            </p>
          </div>
        ) : (
          <>
            {/* SUMMARY */}

            {highestRisk && (
              <div
                className="
                  mb-4 flex flex-col gap-2
                  rounded-xl
                  border border-slate-200/70
                  bg-slate-50/60
                  px-4 py-3
                  dark:border-slate-800
                  dark:bg-slate-900/40
                  sm:flex-row sm:items-center sm:justify-between
                "
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="
                      flex size-8 shrink-0 items-center justify-center
                      rounded-lg bg-primary/10 text-primary
                    "
                  >
                    <ShieldAlert className="size-4" />
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold text-slate-800 dark:text-slate-200">
                      Risk distribution snapshot
                    </p>

                    <p className="text-[9px] text-muted-foreground">
                      {total.toLocaleString()} total prediction records
                    </p>
                  </div>
                </div>

                <p className="text-[9px] text-muted-foreground">
                  Highest severity:{" "}
                  <span className="font-semibold capitalize text-slate-700 dark:text-slate-300">
                    {levelFromName(highestRisk.name)}
                  </span>
                </p>
              </div>
            )}

            {/* RISK GRID */}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sortedDistribution.map((d, idx) => {
                const level = levelFromName(d.name);

                const config =
                  LEVEL_CONFIG[level] || {
                    dot: "bg-slate-400",
                    bar: "bg-slate-400",
                    icon: Activity,
                    badge:
                      "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800",
                  };

                const Icon = config.icon;

                const pct = Math.round((d.count / total) * 100);

                const condition = getConditionName(d.name);

                return (
                  <div
                    key={`${d.name}-${idx}`}
                    className="
                      group
                      rounded-xl
                      border border-slate-200/70
                      bg-white
                      p-4
                      transition-all duration-200
                      hover:-translate-y-0.5
                      hover:border-primary/20
                      hover:shadow-md
                      dark:border-slate-800
                      dark:bg-slate-950
                      dark:hover:border-primary/30
                    "
                  >
                    {/* TOP */}

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <div
                          className={`
                            flex size-8 shrink-0 items-center justify-center
                            rounded-lg
                            ${config.badge}
                          `}
                        >
                          <Icon className="size-3.5" />
                        </div>

                        <div className="min-w-0">
                          <p
                            className="
                              truncate
                              text-xs font-bold
                              text-slate-900
                              dark:text-slate-100
                            "
                          >
                            {condition}
                          </p>

                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {d.count.toLocaleString()} patient
                            {d.count !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`
                          shrink-0
                          rounded-full
                          border
                          px-2 py-0.5
                          text-[9px]
                          font-semibold
                          capitalize
                          ${config.badge}
                        `}
                      >
                        {level}
                      </span>
                    </div>

                    {/* PROGRESS */}

                    <div className="mt-4">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[9px] text-muted-foreground">
                          Cohort share
                        </span>

                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          {pct}%
                        </span>
                      </div>

                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`
                            h-full rounded-full
                            transition-all duration-500
                            ${config.bar}
                          `}
                          style={{
                            width: `${Math.min(pct, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* LEGEND */}

            <div
              className="
                mt-5 flex flex-wrap
                items-center gap-x-5 gap-y-2
                border-t
                border-slate-100
                pt-4
                dark:border-slate-800
              "
            >
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Severity
              </span>

              {Object.entries(LEVEL_CONFIG).map(([level, config]) => (
                <div
                  key={level}
                  className="flex items-center gap-1.5"
                >
                  <span
                    className={`size-2 rounded-full ${config.dot}`}
                  />

                  <span className="text-[9px] capitalize text-muted-foreground">
                    {level}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RiskHeatmap;