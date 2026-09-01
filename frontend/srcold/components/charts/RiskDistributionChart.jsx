import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const RISK_COLOR = { low: "#10b981", moderate: "#f59e0b", high: "#f43f5e", critical: "#a855f7" };
const RISK_LABEL = { low: "Low Risk", moderate: "Moderate Risk", high: "High Risk", critical: "Critical Risk" };

/**
 * @param {{ riskDistribution: Array<{ name: string, value: number }> }} props
 *   `name` is a risk level key (low/moderate/high/critical) from the patient
 *   population's most recent predictions.
 */
export const RiskDistributionChart = ({ riskDistribution = [] }) => {
  const data = riskDistribution.map((d) => ({
    name: RISK_LABEL[d.name?.toLowerCase()] ?? d.name,
    value: d.value,
    color: RISK_COLOR[d.name?.toLowerCase()] ?? "#94a3b8",
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base font-bold">Patient Risk Stratification</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            No predictions recorded yet.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#1e293b",
                    borderRadius: "12px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
