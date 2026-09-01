import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Users, Activity, Brain, Sparkles, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HealthTimeline } from "@/components/timeline/HealthTimeline";
import { fetchPatientDetailApi, fetchPatientTimelineApi, fetchPatientFamilyApi, runClinicalAnalysisApi } from "@/services/doctorService";
import { getRiskColor, getRiskBadgeVariant, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function DoctorPatientDetailPage() {
  const { patientId } = useParams();
  const [detail, setDetail] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [family, setFamily] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchPatientDetailApi(patientId),
      fetchPatientTimelineApi(patientId),
      fetchPatientFamilyApi(patientId),
    ])
      .then(([d, t, f]) => {
        if (cancelled) return;
        setDetail(d);
        setTimeline(t.items ?? []);
        setFamily(f);
      })
      .catch((err) => { if (!cancelled) setError((err as { message?: string })?.message || "Could not load patient details."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [patientId]);

  const handleRunAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const result = await runClinicalAnalysisApi(patientId);
      setAnalysis(result);
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Could not run clinical analysis");
    } finally {
      setAnalysisLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center gap-2 p-20 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin" /> Loading patient record...</div>;
  }
  if (error || !detail) {
    return <div className="p-10 text-center text-sm text-destructive">{error ?? "Patient not found."}</div>;
  }

  const latest = detail.predictions[0];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="gap-2" asChild>
        <Link to="/dashboard/doctor/patients"><ArrowLeft className="size-4" />Back to patients</Link>
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{detail.name}</h1>
          <p className="text-muted-foreground text-sm">{detail.email}</p>
        </div>
        {latest && (
          <div className="flex gap-2">
            <Badge variant={getRiskBadgeVariant(latest.diabetes_risk_level)} className={getRiskColor(latest.diabetes_risk_level)}>Diabetes: {latest.diabetes_risk_level}</Badge>
            <Badge variant={getRiskBadgeVariant(latest.cvd_risk_level)} className={getRiskColor(latest.cvd_risk_level)}>CVD: {latest.cvd_risk_level}</Badge>
            {latest.hypertension_risk_level && (
              <Badge variant={getRiskBadgeVariant(latest.hypertension_risk_level)} className={getRiskColor(latest.hypertension_risk_level)}>Hypertension: {latest.hypertension_risk_level}</Badge>
            )}
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Gender", detail.profile.gender ?? "—"],
          ["Blood Group", detail.profile.blood_group ?? "—"],
          ["Phone", detail.profile.phone ?? "—"],
          ["Date of Birth", detail.profile.dob ? formatDate(detail.profile.dob) : "—"],
        ].map(([label, value]) => (
          <Card key={label}><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="font-medium mt-1">{value}</div>
          </CardContent></Card>
        ))}
      </div>

      {detail.profile.medical_history && (
        <Card>
          <CardHeader><CardTitle className="text-base">Medical History</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{detail.profile.medical_history}</p></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Brain className="size-5 text-primary" />Multi-Agent Clinical Analysis</CardTitle>
          <Button size="sm" variant="outline" disabled={analysisLoading || !latest} onClick={handleRunAnalysis} className="gap-2">
            {analysisLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Run Analysis
          </Button>
        </CardHeader>
        <CardContent>
          {!latest ? (
            <p className="text-sm text-muted-foreground">This patient has no prediction history yet — run a prediction first.</p>
          ) : !analysis ? (
            <p className="text-sm text-muted-foreground">Runs the Symptom → Report → RAG → Coordinator LangGraph pipeline against this patient's latest saved prediction data.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <ShieldAlert className="size-4 text-muted-foreground" />
                <span className="text-sm">Overall assessed risk:</span>
                <Badge variant={getRiskBadgeVariant(analysis.final_risk_level)} className={getRiskColor(analysis.final_risk_level)}>{analysis.final_risk_level}</Badge>
                <Badge variant="outline" className="capitalize">{analysis.triage_priority} priority</Badge>
              </div>
              <p className="text-sm">{analysis.summary}</p>
              {analysis.next_steps?.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Next Steps</div>
                  <ul className="text-sm list-disc list-inside space-y-0.5">
                    {analysis.next_steps.map((s: any, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              <div className="space-y-3">
                {analysis.agent_outputs.map((a: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg border bg-muted/30">
                    <div className="text-xs font-bold uppercase tracking-wide text-primary mb-1">{a.agent_name}</div>
                    <p className="text-sm text-muted-foreground mb-2">{a.findings}</p>
                    {a.recommendations.length > 0 && (
                      <ul className="text-xs list-disc list-inside space-y-0.5 text-muted-foreground">
                        {a.recommendations.map((r: any, j: number) => <li key={j}>{r}</li>)}
                      </ul>
                    )}
                    {a.guideline_references.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-1.5 italic">Refs: {a.guideline_references.join(", ")}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <HealthTimeline items={timeline} />

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5 text-primary" />Family Risk Cluster</CardTitle></CardHeader>
          <CardContent>
            {!family || family.member_count === 0 ? (
              <p className="text-sm text-muted-foreground">No family members recorded for this patient.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-4 text-sm">
                  <div><span className="font-bold">{family.member_count}</span> members</div>
                  <div><span className="font-bold">{family.avg_risk_score}%</span> avg risk</div>
                  <div><span className="font-bold">{family.hereditary_conditions_count}</span> hereditary condition(s)</div>
                </div>
                {family.insights.map((insight: any, i: number) => (
                  <p key={i} className="text-xs text-muted-foreground flex gap-2">
                    <Activity className="size-3.5 shrink-0 mt-0.5 text-primary" />{insight}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
