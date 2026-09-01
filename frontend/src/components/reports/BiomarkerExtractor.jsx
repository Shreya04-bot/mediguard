import React from "react";
import { CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const BiomarkerExtractor = ({ reportData }) => {
  if (!reportData) return null;

  const { reportType, labName, date, biomarkers = [], aiSummary, actionablePlan = [] } = reportData;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle>{reportType || "Extracted Lab Report Panel"}</CardTitle>
            <p className="text-xs text-muted-foreground">{labName} • Scanned {date}</p>
          </div>
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            AI Extracted
          </span>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2 px-3">Biomarker</th>
                  <th className="py-2 px-3">Observed Value</th>
                  <th className="py-2 px-3">Reference Range</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {biomarkers.map((b, i) => {
                  const isAbnormal = b.status !== "Normal";
                  return (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">{b.name}</td>
                      <td className="py-2.5 px-3 font-bold">{b.value} {b.unit}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{b.range}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isAbnormal
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {isAbnormal ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {aiSummary && (
        <Card className="p-5 bg-gradient-to-r from-teal-500/5 to-emerald-500/5 border border-teal-500/20">
          <h4 className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" /> AI Clinical Report Summary
          </h4>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-3">{aiSummary}</p>
          {actionablePlan.length > 0 && (
            <div className="space-y-1">
              <h5 className="text-[11px] font-bold text-slate-900 dark:text-slate-100">Next Action Steps:</h5>
              <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1">
                {actionablePlan.map((plan, idx) => (
                  <li key={idx}>{plan}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
