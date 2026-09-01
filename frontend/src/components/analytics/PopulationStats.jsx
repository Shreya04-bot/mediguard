import React from "react";
import { Users, Activity, HeartPulse, TrendingUp } from "lucide-react";
import { StatCard } from "../common/StatCard";

/**
 * @param {{
 *   totalMonitored: number,
 *   diseaseDistribution: Array<{name: string, count: number}>
 * }} props
 */
export const PopulationStats = ({
  totalMonitored = 0,
  diseaseDistribution = [],
}) => {
  const diabetesEntries = diseaseDistribution.filter((d) =>
    d.name.startsWith("Diabetes")
  );

  const cvdEntries = diseaseDistribution.filter((d) =>
    d.name.startsWith("Cardiovascular")
  );

  const diabetesTotal = diabetesEntries.reduce(
    (total, item) => total + item.count,
    0
  );

  const cvdTotal = cvdEntries.reduce(
    (total, item) => total + item.count,
    0
  );

  const elevatedDiabetes = diabetesEntries
    .filter((d) => /high|critical|moderate/i.test(d.name))
    .reduce((total, item) => total + item.count, 0);

  const healthyCvd = cvdEntries
    .filter((d) => /low/i.test(d.name))
    .reduce((total, item) => total + item.count, 0);

  const prediabetesPct =
    diabetesTotal > 0
      ? ((elevatedDiabetes / diabetesTotal) * 100).toFixed(1)
      : "0.0";

  const cvdHealthyPct =
    cvdTotal > 0
      ? ((healthyCvd / cvdTotal) * 100).toFixed(1)
      : "0.0";

  return (
    <section className="mb-6">
      {/* Section heading */}

      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Population Overview
          </h2>

          <p className="text-[11px] text-muted-foreground">
            Current health-risk distribution across the monitored cohort
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Live population data
        </div>
      </div>

      {/* Statistics */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Monitored Cohort"
          value={totalMonitored.toLocaleString()}
          change="Active patients being monitored"
          icon={Users}
          color="teal"
        />

        <StatCard
          title="Elevated Diabetes Risk"
          value={`${prediabetesPct}%`}
          change="Moderate, high or critical risk"
          icon={Activity}
          color="amber"
        />

        <StatCard
          title="Low Cardiovascular Risk"
          value={`${cvdHealthyPct}%`}
          change="Patients currently in low-risk range"
          icon={HeartPulse}
          color="emerald"
        />
      </div>

      {/* Supporting insight strip */}

      <div
        className="
          mt-3 flex flex-col gap-2
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
              flex size-7 shrink-0 items-center justify-center
              rounded-lg bg-primary/10 text-primary
            "
          >
            <TrendingUp className="size-3.5" />
          </div>

          <div>
            <p className="text-[10px] font-semibold text-slate-800 dark:text-slate-200">
              Population risk snapshot
            </p>

            <p className="text-[9px] text-muted-foreground">
              Based on available disease predictions in the monitored cohort.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
          <span>
            Diabetes records:{" "}
            <strong className="font-semibold text-slate-700 dark:text-slate-300">
              {diabetesTotal.toLocaleString()}
            </strong>
          </span>

          <span className="text-slate-300 dark:text-slate-700">•</span>

          <span>
            CVD records:{" "}
            <strong className="font-semibold text-slate-700 dark:text-slate-300">
              {cvdTotal.toLocaleString()}
            </strong>
          </span>
        </div>
      </div>
    </section>
  );
};

export default PopulationStats;