import React from "react";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const data = [
  { subject: "Blood Sugar", patient: 80, benchmark: 60, fullMark: 100 },
  { subject: "Cholesterol", patient: 75, benchmark: 55, fullMark: 100 },
  { subject: "Blood Pressure", patient: 70, benchmark: 50, fullMark: 100 },
  { subject: "BMI Index", patient: 65, benchmark: 45, fullMark: 100 },
  { subject: "Kidney eGFR", patient: 85, benchmark: 90, fullMark: 100 },
  { subject: "Inflammation (hsCRP)", patient: 60, benchmark: 30, fullMark: 100 },
];

export const BiomarkerRadarChart = () => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base font-bold">Biomarker Health Polygon</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
              <PolarGrid stroke="#94a3b8" opacity={0.2} />
              <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={11} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
              <Radar name="Patient Metrics" dataKey="patient" stroke="#0d9488" fill="#0d9488" fillOpacity={0.5} />
              <Radar name="Ideal Range" dataKey="benchmark" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#1e293b",
                  borderRadius: "12px",
                  color: "#f8fafc",
                  fontSize: "12px",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
