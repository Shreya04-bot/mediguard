import React, { useState, useEffect } from "react";
import { Loader2, Users, Activity, TrendingUp } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskDistributionChart } from "../../components/charts/RiskDistributionChart";
import { DistrictRiskHeatmap } from "../../components/analytics/DistrictRiskHeatmap";
import { fetchDoctorAnalyticsApi } from "@/services/doctorService";

export const RiskAnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDoctorAnalyticsApi()
      .then(setData)
      .catch(() => setError("Could not load analytics."))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Clinical Risk Stratification Analytics"
        description="Risk buckets across the patients linked to your account."
      />

      <div className="mb-6">
        <DistrictRiskHeatmap />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 p-20 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Loading analytics...
        </div>
      ) : error || !data ? (
        <div className="p-10 text-center text-sm text-destructive">{error ?? "No data available."}</div>
      ) : data.total_patients === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
          No linked patients yet — analytics will appear once patients connect with your account.
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RiskDistributionChart riskDistribution={[
            { name: "high", value: data.high_risk_count },
            { name: "moderate", value: data.moderate_risk_count },
            { name: "low", value: data.low_risk_count },
          ]} />

          <Card>
            <CardHeader><CardTitle className="text-base font-bold">Cohort Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Total Linked Patients", value: data.total_patients, icon: Users },
                { label: "Total Predictions Run", value: data.total_predictions ?? 0, icon: Activity },
                { label: "Avg. Combined Risk Score", value: `${Math.round(data.avg_combined_score * 100)}%`, icon: TrendingUp },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                  <s.icon className="size-5 text-primary" />
                  <div>
                    <div className="text-xl font-bold">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};