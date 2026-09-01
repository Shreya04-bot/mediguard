import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { HealthTimeline } from "../../components/timeline/HealthTimeline";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchLinkedPatientsApi, fetchPatientTimelineApi } from "@/services/doctorService";

export const TimelinePage = () => {
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLinkedPatientsApi()
      .then((data) => {
        setPatients(data);
        if (data.length > 0) setSelectedId(data[0].patient_id);
        else setIsLoading(false);
      })
      .catch(() => { setError("Could not load your patients."); setIsLoading(false); });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setIsLoading(true);
    fetchPatientTimelineApi(selectedId)
      .then((res) => setTimeline(res.items ?? []))
      .catch(() => setError("Could not load timeline."))
      .finally(() => setIsLoading(false));
  }, [selectedId]);

  return (
    <div>
      <PageHeader
        title="Longitudinal EHR Health Timeline"
        description="Chronological record of lab report uploads and AI disease predictions for a selected patient."
      />

      {patients.length > 1 && (
        <div className="mb-4 max-w-xs">
          <Select value={selectedId ?? ""} onValueChange={setSelectedId}>
            <SelectTrigger><SelectValue placeholder="Select a patient" /></SelectTrigger>
            <SelectContent>
              {patients.map((p) => <SelectItem key={p.patient_id} value={p.patient_id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 p-20 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Loading timeline...
        </div>
      ) : error ? (
        <div className="p-10 text-center text-sm text-destructive">{error}</div>
      ) : patients.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">No linked patients yet.</div>
      ) : (
        <HealthTimeline items={timeline} />
      )}
    </div>
  );
};
