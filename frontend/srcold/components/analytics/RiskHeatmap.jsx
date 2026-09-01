import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const LEVEL_COLOR = {
  low: "bg-emerald-500",
  moderate: "bg-amber-500",
  high: "bg-rose-500",
  critical: "bg-purple-600",
};

function levelFromName(name) {
  const match = name.match(/—\s*(\w+)/);
  return (match ? match[1] : "low").toLowerCase();
}

/**
 * Condition x severity breakdown from real prediction data — replaces the
 * previous mock "geographic region" heatmap, since patient location isn't
 * tracked anywhere in this system.
 * @param {{ diseaseDistribution: Array<{ name: string, count: number }> }} props
 */
export const RiskHeatmap = ({ diseaseDistribution = [] }) => {
  const total = diseaseDistribution.reduce((a, d) => a + d.count, 0) || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-bold">Condition Risk Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {diseaseDistribution.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-full text-center py-6">No predictions recorded yet.</p>
        ) : diseaseDistribution.map((d, idx) => {
          const level = levelFromName(d.name);
          const pct = Math.round((d.count / total) * 100);
          return (
            <div key={idx} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{d.name}</p>
                <p className="text-[10px] text-muted-foreground">{d.count} patient(s) · {pct}% of cohort</p>
              </div>
              <div className={`h-3 w-3 rounded-full ${LEVEL_COLOR[level] ?? "bg-slate-400"} animate-pulse`} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
