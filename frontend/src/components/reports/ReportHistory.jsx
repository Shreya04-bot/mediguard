import React, { useState, useEffect } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { fetchPatientReportsApi } from "@/services/patientService";
import { formatDate } from "@/lib/utils";

export const ReportHistory = () => {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchPatientReportsApi()
      .then((data) => { if (!cancelled) setReports(data); })
      .catch(() => { if (!cancelled) setError("Could not load report history."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-bold">Historical Patient Lab Scans</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-slate-100 dark:divide-slate-800">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading reports...
          </div>
        ) : error ? (
          <p className="text-sm text-destructive py-4">{error}</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No reports uploaded yet. Upload one above to see it here.</p>
        ) : reports.map((r) => (
          <div key={r.id} className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">{r.report_name}</h5>
                <p className="text-[10px] text-muted-foreground">
                  {formatDate(r.uploaded_at)} • {r.file_type}
                  {r.flags?.length > 0 && <> • <span className="text-amber-500 font-semibold">{r.flags.length} flagged value(s)</span></>}
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
