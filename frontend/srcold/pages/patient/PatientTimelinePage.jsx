import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { HealthTimeline } from "../../components/timeline/HealthTimeline";
import { fetchPatientTimelineApi } from "@/services/patientService";

export const PatientTimelinePage = () => {
  const [timeline, setTimeline] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchPatientTimelineApi()
      .then((res) => { if (!cancelled) setTimeline(res.items ?? []); })
      .catch(() => { if (!cancelled) setError("Could not load your timeline."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <PageHeader
        title="Personal Health Journey Timeline"
        description="Chronological history of your AI predictions and lab report uploads."
      />
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 p-20 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Loading timeline...
        </div>
      ) : error ? (
        <div className="p-10 text-center text-sm text-destructive">{error}</div>
      ) : (
        <HealthTimeline items={timeline} />
      )}
    </div>
  );
};
