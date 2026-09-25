import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  CircleAlert,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const normalizeStatus = (status) => {
  return String(status || "")
    .replace(/^svg/i, "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const getStatusType = (status) => {
  const normalized = normalizeStatus(status).toLowerCase();

  if (
    normalized === "normal" ||
    normalized === "acceptable" ||
    normalized === "optimal"
  ) {
    return "normal";
  }

  if (
    normalized.includes("stage1") ||
    normalized.includes("stage 1") ||
    normalized.includes("stage2") ||
    normalized.includes("stage 2") ||
    normalized.includes("hypertension") ||
    normalized === "diabetes" ||
    normalized.includes("obesity") ||
    normalized.includes("critical") ||
    normalized.includes("very high") ||
    normalized === "high" ||
    normalized.startsWith("high ") ||
    normalized === "low" ||
    normalized.startsWith("low ")
  ) {
    return "abnormal";
  }

  if (
    normalized.includes("borderline") ||
    normalized.includes("elevated") ||
    normalized.includes("overweight") ||
    normalized.includes("prediabetes") ||
    normalized.includes("near optimal") ||
    normalized.includes("near-optimal")
  ) {
    return "borderline";
  }

  return "borderline";
};

const getStatusStyles = (status) => {
  const type = getStatusType(status);

  if (type === "normal") {
    return {
      className:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      icon: CheckCircle2,
    };
  }

  if (type === "abnormal") {
    return {
      className:
        "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      icon: AlertTriangle,
    };
  }

  return {
    className:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: CircleAlert,
  };
};

export const BiomarkerExtractor = ({ reportData }) => {
  if (!reportData) return null;

  const {
    reportType,
    labName,
    date,
    biomarkers = [],
    aiSummary,
    actionablePlan = [],
  } = reportData;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>
              {reportType || "Extracted Lab Report"}
            </CardTitle>

            <p className="mt-1 text-xs text-muted-foreground">
              {labName || "AI OCR Analysis"}
              {date ? ` • Scanned ${date}` : ""}
            </p>
          </div>

          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2
              aria-hidden="true"
              className="h-3.5 w-3.5"
            />
            AI Extracted
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {biomarkers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-muted-foreground dark:border-slate-800 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 font-semibold">
                      Biomarker
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Observed Value
                    </th>
                    <th className="min-w-[280px] px-4 py-3 font-semibold">
                      Reference Range
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {biomarkers.map((biomarker, index) => {
                    const statusStyles = getStatusStyles(
                      biomarker.status
                    );

                    const StatusIcon = statusStyles.icon;

                    const cleanStatus = normalizeStatus(
                      biomarker.status
                    );

                    return (
                      <tr
                        key={biomarker.key || index}
                        className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                          {biomarker.name}
                        </td>

                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                          {biomarker.value}{" "}
                          <span className="font-medium text-muted-foreground">
                            {biomarker.unit}
                          </span>
                        </td>

                        <td className="max-w-md px-4 py-3 leading-relaxed text-muted-foreground">
                          {biomarker.range}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyles.className}`}
                          >
                            <StatusIcon
                              aria-hidden="true"
                              className="h-3 w-3"
                            />
                            {cleanStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No biomarkers were detected in this report.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {aiSummary && (
        <Card className="border-teal-500/20 bg-gradient-to-r from-teal-500/5 to-emerald-500/5">
          <CardContent className="p-5">
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
              <Sparkles
                aria-hidden="true"
                className="h-4 w-4"
              />
              AI Clinical Report Summary
            </h4>

            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              {aiSummary}
            </p>

            {actionablePlan.length > 0 && (
              <div className="mt-4 space-y-2">
                <h5 className="text-[11px] font-bold text-slate-900 dark:text-slate-100">
                  Next Action Steps
                </h5>

                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  {actionablePlan.map((plan, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current" />
                      <span>{plan}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};