import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { PopulationStats } from "../../components/analytics/PopulationStats";
import { DiseaseTrendChart } from "../../components/charts/DiseaseTrendChart";
import { RiskDistributionChart } from "../../components/charts/RiskDistributionChart";
import { RiskHeatmap } from "../../components/analytics/RiskHeatmap";
import { DistrictRiskHeatmap } from "../../components/analytics/DistrictRiskHeatmap";
import { fetchAdminAnalyticsApi } from "@/services/adminService";

export const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminAnalyticsApi()
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => { if (!cancelled) setError("Could not load analytics."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <PageHeader
        title="Population Health & Disease Risk Analytics"
        description="Epidemiological analytics and cohort risk distributions, computed live from patient prediction data."
      />

      <div className="mb-6">
        <DistrictRiskHeatmap />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 p-20 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Loading analytics...
        </div>
      ) : error ? (
        <div className="p-10 text-center text-sm text-destructive">{error}</div>
      ) : (
        <>
          <PopulationStats totalMonitored={data.totalMonitored} diseaseDistribution={data.diseaseDistribution} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <DiseaseTrendChart monthlyActivity={data.monthlyActivity} />
            <RiskDistributionChart riskDistribution={data.riskDistribution} />
          </div>

          <RiskHeatmap diseaseDistribution={data.diseaseDistribution} />
        </>
      )}
    </div>
  );
};