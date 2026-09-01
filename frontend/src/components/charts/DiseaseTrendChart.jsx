import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

/**
 * @param {{ monthlyActivity: Array<{ month, patients, predictions, reports }> }} props
 */
export const DiseaseTrendChart = ({ monthlyActivity = [] }) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
          Platform Activity Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPredictions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#1e293b",
                  borderRadius: "12px",
                  color: "#f8fafc",
                  fontSize: "12px",
                }}
              />
              <Area type="monotone" dataKey="predictions" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorPredictions)" name="AI Predictions" />
              <Area type="monotone" dataKey="patients" stroke="#7c3aed" strokeWidth={2} fillOpacity={1} fill="url(#colorPatients)" name="New Patients" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
