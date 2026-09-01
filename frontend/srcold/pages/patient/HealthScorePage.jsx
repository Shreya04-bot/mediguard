import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HeartPulse, Loader2 } from "lucide-react";
import { fetchHealthScoreApi, fetchPredictionHistoryApi } from "@/services/patientService";
import { getRiskColor } from "@/lib/utils";

export const HealthScorePage = () => {
  const [score, setScore] = useState(null);
  const [latest, setLatest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchHealthScoreApi(), fetchPredictionHistoryApi()])
      .then(([s, history]) => { setScore(s); setLatest(history[0] ?? null); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personal Health Scorecard"
        description="Your vitality index, computed from your most recent AI disease risk prediction."
      />

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 p-20 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Loading your health score...
        </div>
      ) : (
        <>
          <Card className="p-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-emerald-600 text-white shadow-lg">
                  <HeartPulse className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                    {score?.score != null ? `${score.score} / 100` : "No score yet"}
                  </h3>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{score?.label}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm">
                {score?.score != null
                  ? "Computed from your latest AI disease risk prediction. Run a new prediction any time your health changes to keep this current."
                  : "Run your first AI disease risk prediction to unlock your personal vitality index."}
              </p>
            </div>
          </Card>

          {latest && (
            <Card>
              <CardHeader><CardTitle className="text-base">Latest Risk Breakdown</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Diabetes Risk</span>
                    <span className={`font-medium ${getRiskColor(latest.diabetes_risk_level)}`}>{latest.diabetes_risk_level} ({Math.round(latest.diabetes_probability * 100)}%)</span>
                  </div>
                  <Progress value={latest.diabetes_probability * 100} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Cardiovascular Risk</span>
                    <span className={`font-medium ${getRiskColor(latest.cvd_risk_level)}`}>{latest.cvd_risk_level} ({Math.round(latest.cvd_probability * 100)}%)</span>
                  </div>
                  <Progress value={latest.cvd_probability * 100} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
