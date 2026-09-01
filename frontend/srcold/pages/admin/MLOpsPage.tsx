import { useState, useEffect } from "react";
import { Cpu, Activity, TrendingUp, AlertCircle, CheckCircle2, Loader2, GitCompareArrows, ShieldAlert, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { fetchMlModelsApi, runDriftCheckApi } from "@/services/adminService";
import { toast } from "sonner";

export default function MLOpsPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drift, setDrift] = useState<any>(null);
  const [driftLoading, setDriftLoading] = useState(false);
  const [driftError, setDriftError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMlModelsApi()
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err) => { if (!cancelled) setError((err as { message?: string })?.message || "Could not load model metrics."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleRunDriftCheck = async () => {
    setDriftLoading(true);
    setDriftError(null);
    try {
      const result = await runDriftCheckApi();
      setDrift(result);
    } catch (err) {
      const message = (err as { message?: string })?.message || "Drift check failed — is a model trained?";
      setDriftError(message);
      toast.error(message);
    } finally {
      setDriftLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ML Ops Monitor</h1>
          <p className="text-muted-foreground text-sm">Track deployed model versions, accuracy, and prediction volume</p>
        </div>
        {data?.summary && (
          data.summary.modelHealth === "healthy" ? (
            <Badge variant="outline" className="gap-1.5 text-success border-success/30 bg-success/5">
              <ShieldCheck className="size-3.5" />Model Healthy
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 text-destructive border-destructive/30 bg-destructive/5">
              <ShieldAlert className="size-3.5" />No Model Deployed
            </Badge>
          )
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 p-20 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Loading model registry...
        </div>
      ) : error ? (
        <Card><CardContent className="p-10 text-center">
          <AlertCircle className="size-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground mt-1">This usually means no model has been trained yet, or MLflow tracking isn't reachable.</p>
        </CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "In Production", value: data.summary.deployedCount, icon: CheckCircle2, color: "text-success" },
              { label: "Staging", value: data.summary.stagingCount, icon: Cpu, color: "text-violet-500" },
              { label: "Total Predictions", value: data.summary.totalPredictions.toLocaleString(), icon: Activity, color: "text-primary" },
              { label: "Avg Accuracy", value: data.summary.avgAccuracy != null ? `${data.summary.avgAccuracy}%` : "—", icon: TrendingUp, color: "text-blue-500" },
            ].map((s) => (
              <Card key={s.label}><CardContent className="p-4 text-center">
                <s.icon className={`size-5 mx-auto mb-1 ${s.color}`} />
                <div className="text-2xl font-extrabold">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </CardContent></Card>
            ))}
          </div>

          {data.models.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
              No model runs found yet. Train a model to see it appear here.
            </CardContent></Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {data.models.map((m: any) => (
                <Card key={m.id}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base">{m.name}</CardTitle>
                    <Badge variant={m.status === "Production" ? "default" : "secondary"}>{m.status}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {m.accuracy != null && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Accuracy</span>
                          <span className="font-medium">{m.accuracy}%</span>
                        </div>
                        <Progress value={m.accuracy} className="h-1.5" />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      {m.precision != null && <div>Precision: <span className="font-medium text-foreground">{m.precision}</span></div>}
                      {m.recall != null && <div>Recall: <span className="font-medium text-foreground">{m.recall}</span></div>}
                      {m.aucScore != null && <div>AUC: <span className="font-medium text-foreground">{m.aucScore}</span></div>}
                      <div>Predictions: <span className="font-medium text-foreground">{m.predictions}</span></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><GitCompareArrows className="size-5 text-primary" />Data Drift Detection</CardTitle>
              <Button size="sm" variant="outline" disabled={driftLoading} onClick={handleRunDriftCheck} className="gap-2">
                {driftLoading ? <Loader2 className="size-4 animate-spin" /> : <GitCompareArrows className="size-4" />}
                Run Drift Check
              </Button>
            </CardHeader>
            <CardContent>
              {driftError ? (
                <p className="text-sm text-destructive">{driftError}</p>
              ) : !drift ? (
                <p className="text-sm text-muted-foreground">
                  Computes Population Stability Index (PSI) between the training baseline and recent prediction inputs, per feature. Values above 0.2 typically indicate meaningful drift.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={drift.drift_detected ? "destructive" : "outline"} className={!drift.drift_detected ? "text-success border-success/30" : ""}>
                      {drift.drift_detected ? "Drift Detected" : "No Significant Drift"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">Overall PSI: <span className="font-medium text-foreground">{drift.psi_score.toFixed(3)}</span></span>
                    <span className="text-sm text-muted-foreground">· {drift.dataset_size} sample(s) evaluated</span>
                  </div>
                  <p className="text-sm">{drift.recommendation}</p>
                  {Object.keys(drift.feature_drifts || {}).length > 0 && (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                      {Object.entries(drift.feature_drifts).map(([feature, psi]: [string, any]) => (
                        <div key={feature} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40">
                          <span className="text-muted-foreground">{feature.replace(/_/g, " ")}</span>
                          <span className={`font-mono font-medium ${psi > 0.2 ? "text-destructive" : "text-foreground"}`}>{psi.toFixed(3)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
