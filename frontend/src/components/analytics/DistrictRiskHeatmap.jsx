import React, { useEffect, useState } from "react";
import {
  Loader2,
  MapPin,
  ShieldAlert,
  Activity,
  HeartPulse,
  Users,
  ChevronRight,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { fetchDistrictHeatmapApi } from "@/services/featuresService";

const LEVEL_STYLES = {
  low: {
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900",
  },
  moderate: {
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900",
  },
  high: {
    dot: "bg-rose-500",
    bar: "bg-rose-500",
    badge:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900",
  },
  critical: {
    dot: "bg-purple-600",
    bar: "bg-purple-600",
    badge:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900",
  },
};

function Stat({ label, value, icon: Icon, description }) {
  return (
    <div
      className="
        group relative overflow-hidden rounded-xl
        border border-slate-200/70 dark:border-slate-800
        bg-white dark:bg-slate-950
        p-4
        transition-all duration-200
        hover:-translate-y-0.5
        hover:shadow-md
      "
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>

          <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {Icon && (
          <div
            className="
              flex size-9 shrink-0 items-center justify-center
              rounded-lg bg-primary/10
              text-primary
              transition-transform duration-200
              group-hover:scale-105
            "
          >
            <Icon className="size-4" />
          </div>
        )}
      </div>
    </div>
  );
}

function RiskBar({ diabetes, cvd, level }) {
  const styles =
    LEVEL_STYLES[level] ?? {
      bar: "bg-slate-400",
    };

  const diabetesPercent = Math.round(diabetes * 100);
  const cvdPercent = Math.round(cvd * 100);

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
        <span>Combined risk</span>
        <span className="font-semibold">
          {Math.round(((diabetes + cvd) / 2) * 100)}%
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
          style={{
            width: `${Math.min(
              100,
              Math.round(((diabetesPercent + cvdPercent) / 2))
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

function RiskLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {Object.entries(LEVEL_STYLES).map(([level, styles]) => (
        <div key={level} className="flex items-center gap-1.5">
          <span
            className={`size-2 rounded-full ${styles.dot}`}
          />
          <span className="text-[10px] capitalize text-muted-foreground">
            {level}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Uttar Pradesh district-level diabetes/CVD risk heatmap.
 *
 * Population-level epidemiology, not tied to any single patient.
 * Can be reused across Admin Analytics and Doctor Risk Analytics.
 */
export const DistrictRiskHeatmap = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetchDistrictHeatmapApi()
      .then((res) => {
        if (!cancelled) {
          setData(res);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load district risk data.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------- LOADING ---------------- */

  if (isLoading) {
    return (
      <Card className="overflow-hidden border-slate-200/70 shadow-sm dark:border-slate-800">
        <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Loading district risk data
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Fetching the latest population-level analytics...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ---------------- ERROR ---------------- */

  if (error || !data) {
    return (
      <Card className="overflow-hidden border-slate-200/70 shadow-sm dark:border-slate-800">
        <CardContent className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-950/30">
            <Activity className="size-5" />
          </div>

          <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Unable to load risk analytics
          </p>

          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {error ?? "No district risk data is currently available."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { districts = [], summary = {} } = data;

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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div
              className="
                flex size-10 shrink-0 items-center justify-center
                rounded-xl
                bg-primary/10
                text-primary
              "
            >
              <MapPin className="size-5" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base font-bold tracking-tight">
                  {summary.state} District Risk
                </CardTitle>

                <Badge
                  variant="secondary"
                  className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
                >
                  {summary.total_districts} districts
                </Badge>
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Population-level diabetes and cardiovascular risk assessment
              </p>
            </div>
          </div>

          <RiskLegend />
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        {/* STATISTICS */}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Avg. Diabetes Risk"
            value={`${Math.round(summary.avg_diabetes_risk * 100)}%`}
            icon={Activity}
            description="Across assessed districts"
          />

          <Stat
            label="Avg. CVD Risk"
            value={`${Math.round(summary.avg_cvd_risk * 100)}%`}
            icon={HeartPulse}
            description="Cardiovascular risk level"
          />

          <Stat
            label="High / Critical"
            value={summary.high_burden_districts}
            icon={Users}
            description="Districts requiring attention"
          />

          <Stat
            label="PM-JAY Priority"
            value={summary.pmjay_priority_districts}
            icon={ShieldAlert}
            description="Priority intervention areas"
          />
        </div>

        {/* DISTRICT LIST HEADER */}

        <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              District Risk Distribution
            </h3>

            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Compare diabetes and cardiovascular risk by district
            </p>
          </div>

          <Badge
            variant="outline"
            className="w-fit rounded-full text-[10px]"
          >
            {districts.length} records
          </Badge>
        </div>

        {/* DISTRICT LIST */}

        {districts.length > 0 ? (
          <div
            className="
              max-h-[430px]
              space-y-2
              overflow-y-auto
              pr-1
              scrollbar-thin
            "
          >
            {districts.map((d) => {
              const styles =
                LEVEL_STYLES[d.risk_level] ?? {
                  dot: "bg-slate-400",
                  bar: "bg-slate-400",
                  badge:
                    "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800",
                };

              const diabetesPercent = Math.round(
                d.diabetes_risk * 100
              );

              const cvdPercent = Math.round(d.cvd_risk * 100);

              return (
                <div
                  key={d.id}
                  className="
                    group
                    rounded-xl
                    border border-slate-200/70
                    bg-slate-50/40
                    p-3.5
                    transition-all duration-200
                    hover:border-primary/20
                    hover:bg-primary/[0.025]
                    hover:shadow-sm
                    dark:border-slate-800
                    dark:bg-slate-900/30
                    dark:hover:border-primary/30
                    dark:hover:bg-primary/[0.04]
                  "
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* LEFT */}

                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-1.5 flex items-center justify-center">
                        <span
                          className={`size-2.5 rounded-full ${styles.dot} ring-4 ring-white dark:ring-slate-950`}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                            {d.name}
                          </p>

                          {d.pmjay_priority && (
                            <span
                              className="
                                inline-flex items-center gap-1
                                rounded-full
                                bg-amber-50
                                px-1.5 py-0.5
                                text-[9px] font-semibold
                                text-amber-700
                                dark:bg-amber-950/40
                                dark:text-amber-400
                              "
                            >
                              <ShieldAlert className="size-3" />
                              PM-JAY
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                          <span>
                            Diabetes{" "}
                            <strong className="font-semibold text-slate-700 dark:text-slate-300">
                              {diabetesPercent}%
                            </strong>
                          </span>

                          <span className="text-slate-300 dark:text-slate-700">
                            •
                          </span>

                          <span>
                            CVD{" "}
                            <strong className="font-semibold text-slate-700 dark:text-slate-300">
                              {cvdPercent}%
                            </strong>
                          </span>

                          {d.n_assessments > 0 && (
                            <>
                              <span className="text-slate-300 dark:text-slate-700">
                                •
                              </span>

                              <span>
                                {d.n_assessments} assessment
                                {d.n_assessments !== 1 ? "s" : ""}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT */}

                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold capitalize ${styles.badge}`}
                      >
                        {d.risk_level}
                      </Badge>

                      <ChevronRight
                        className="
                          size-3.5
                          text-slate-300
                          transition-transform duration-200
                          group-hover:translate-x-0.5
                          group-hover:text-primary
                          dark:text-slate-700
                        "
                      />
                    </div>
                  </div>

                  {/* RISK BAR */}

                  <RiskBar
                    diabetes={d.diabetes_risk}
                    cvd={d.cvd_risk}
                    level={d.risk_level}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-800">
            <MapPin className="mx-auto size-5 text-muted-foreground" />

            <p className="mt-2 text-xs font-medium text-slate-900 dark:text-slate-100">
              No district records available
            </p>

            <p className="mt-1 text-[10px] text-muted-foreground">
              District risk information will appear here when available.
            </p>
          </div>
        )}

        {/* FOOTER */}

        <div className="flex flex-col gap-1 border-t border-slate-100 pt-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[9px] leading-relaxed text-muted-foreground">
            Source: {summary.data_source || "—"} ·{" "}
            {summary.reference || "—"}
          </p>

          <p className="text-[9px] text-muted-foreground">
            Population-level analytics
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DistrictRiskHeatmap;