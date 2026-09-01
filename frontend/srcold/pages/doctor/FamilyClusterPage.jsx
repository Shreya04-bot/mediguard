import React, { useState, useEffect } from "react";
import { GitFork, Loader2, AlertTriangle } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fetchLinkedPatientsApi, fetchPatientFamilyApi } from "@/services/doctorService";

export const FamilyClusterPage = () => {
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [family, setFamily] = useState(null);
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
    fetchPatientFamilyApi(selectedId)
      .then(setFamily)
      .catch(() => setError("Could not load family cluster."))
      .finally(() => setIsLoading(false));
  }, [selectedId]);

  const selectedPatient = patients.find((p) => p.patient_id === selectedId);

  return (
    <div>
      <PageHeader
        title="Family Genomics & Hereditary Cluster"
        description="Analyze hereditary conditions and shared risk patterns across a patient's family."
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
          <Loader2 className="size-5 animate-spin" /> Loading family cluster...
        </div>
      ) : error ? (
        <div className="p-10 text-center text-sm text-destructive">{error}</div>
      ) : patients.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">No linked patients yet.</div>
      ) : !family || family.member_count === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
          {selectedPatient?.name} hasn't recorded any family members yet.
        </CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <GitFork className="h-5 w-5 text-teal-500" />
              <span>Hereditary Risk Tree: {selectedPatient?.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {family.insights.length > 0 && (
              <div className="space-y-2 mb-2">
                {family.insights.map((insight, i) => (
                  <div key={i} className="flex gap-2 text-xs text-muted-foreground p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <AlertTriangle className="size-3.5 shrink-0 mt-0.5 text-amber-500" />{insight}
                  </div>
                ))}
              </div>
            )}
            {family.members.map((rel) => (
              <div key={rel.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 capitalize">{rel.relation} — {rel.name}</h5>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {rel.conditions.length > 0 ? `Conditions: ${rel.conditions.join(", ")}` : "No recorded conditions"}
                  </p>
                </div>
                <Badge variant="outline" className="w-fit bg-amber-500/10 text-amber-600 border-amber-500/20">
                  Risk Score: {rel.riskScore}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
