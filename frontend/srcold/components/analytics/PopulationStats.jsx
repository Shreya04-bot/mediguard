import React from "react";
import { Users, Activity, HeartPulse } from "lucide-react";
import { StatCard } from "../common/StatCard";

/**
 * @param {{ totalMonitored: number, diseaseDistribution: Array<{name,count}> }} props
 */
export const PopulationStats = ({ totalMonitored = 0, diseaseDistribution = [] }) => {
  const diabetesEntries = diseaseDistribution.filter((d) => d.name.startsWith("Diabetes"));
  const cvdEntries = diseaseDistribution.filter((d) => d.name.startsWith("Cardiovascular"));
  const diabetesTotal = diabetesEntries.reduce((a, d) => a + d.count, 0);
  const cvdTotal = cvdEntries.reduce((a, d) => a + d.count, 0);
  const elevatedDiabetes = diabetesEntries.filter((d) => /high|critical|moderate/i.test(d.name)).reduce((a, d) => a + d.count, 0);
  const healthyCvd = cvdEntries.filter((d) => /low/i.test(d.name)).reduce((a, d) => a + d.count, 0);

  const prediabetesPct = diabetesTotal > 0 ? ((elevatedDiabetes / diabetesTotal) * 100).toFixed(1) : "0.0";
  const cvdHealthyPct = cvdTotal > 0 ? ((healthyCvd / cvdTotal) * 100).toFixed(1) : "0.0";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <StatCard title="Total Monitored Cohort" value={totalMonitored.toLocaleString()} change="Live count" icon={Users} color="teal" />
      <StatCard title="Elevated Diabetes Risk" value={`${prediabetesPct}%`} change="Of patients with a prediction" icon={Activity} color="amber" />
      <StatCard title="Low Cardiovascular Risk" value={`${cvdHealthyPct}%`} change="Of patients with a prediction" icon={HeartPulse} color="emerald" />
    </div>
  );
};
