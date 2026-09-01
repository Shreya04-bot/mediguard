import React from "react";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRiskBadgeColor, getRiskGaugeColor } from "../../utils/helpers";

export const RiskGauge = ({ score = 68, level = "Moderate" }) => {
  const badgeClass = getRiskBadgeColor(level);
  const gaugeColor = getRiskGaugeColor(level);

  return (
    <Card className="text-center p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Calculated Risk Score</span>
        <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${badgeClass}`}>{level} Risk</span>
      </div>

      <div className="relative w-36 h-36 mx-auto my-4 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-slate-200 dark:text-slate-800"
            strokeWidth="3.5"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            strokeWidth="3.5"
            strokeDasharray={`${score}, 100`}
            stroke={gaugeColor}
            strokeLinecap="round"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{score}%</span>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase">Risk Index</span>
        </div>
      </div>
    </Card>
  );
};
