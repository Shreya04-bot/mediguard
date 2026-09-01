import React from "react";
import { AlertCircle, CheckCircle2, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * @param {{
 *   factors?: Array<{ label: string, impact: number }>,
 *   recommendations?: string[],
 *   ayurveda?: string[],
 * }} props
 *   `impact` is the model's SHAP contribution for that feature — positive
 *   values increase risk, negative values decrease it.
 */
export const FactorBreakdown = ({ factors = [], recommendations = [], ayurveda = [] }) => {
  return (
    <Card className="space-y-4 p-5">
      <div>
        <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          Primary Contributing Risk Factors
        </h5>
        {factors.length === 0 ? (
          <p className="text-xs text-muted-foreground">No dominant factors identified.</p>
        ) : (
          <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            {factors.map((f, i) => {
              const increases = f.impact >= 0;
              return (
                <li key={i} className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                  <span className="flex items-center gap-2">
                    {increases ? <TrendingUp className="h-3.5 w-3.5 text-rose-500 shrink-0" /> : <TrendingDown className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                    {f.label}
                  </span>
                  <span className={`font-mono text-[10px] ${increases ? "text-rose-500" : "text-emerald-500"}`}>
                    {increases ? "+" : ""}{f.impact}%
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          Clinical Action Plan
        </h5>
        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
          {recommendations.map((r, i) => (
            <li key={i} className="flex items-start gap-2 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 p-2 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      {ayurveda?.length > 0 && (
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-900 dark:text-purple-300 text-xs">
          <div className="flex items-center gap-1.5 font-bold mb-1.5">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span>Ayurvedic Preventive Protocol</span>
          </div>
          <ul className="space-y-1">
            {ayurveda.map((item, i) => <li key={i}>• {item}</li>)}
          </ul>
        </div>
      )}
    </Card>
  );
};
