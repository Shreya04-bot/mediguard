import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts";

import {
  Activity,
  Info,
  CircleDot,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

/**
 * Normalize a real clinical value to a 0–100 chart scale.
 *
 * value  = actual patient value
 * min    = lower reference boundary
 * max    = upper reference boundary
 *
 * The radar chart is NOT displaying the raw clinical value.
 * It displays a normalized representation of the value.
 */
const normalize = (value, min, max) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 0;
  }

  const numericValue = Number(value);

  return Math.max(
    0,
    Math.min(
      100,
      ((numericValue - min) / (max - min)) * 100
    )
  );
};

/**
 * Convert a blood pressure pair into a normalized value.
 *
 * We use systolic blood pressure as the primary BP biomarker
 * because it is the main value used for cardiovascular risk.
 *
 * Reference range:
 * 90 mmHg → 120 mmHg
 *
 * 120 mmHg therefore represents approximately the upper
 * reference boundary.
 */
const normalizeBloodPressure = (systolic) => {
  if (
    systolic === null ||
    systolic === undefined ||
    Number.isNaN(Number(systolic))
  ) {
    return 0;
  }

  return normalize(Number(systolic), 90, 120);
};

export const BiomarkerRadarChart = ({ prediction }) => {
  const input = prediction?.input_data || {};

  console.log("BIOMARKER PREDICTION:", prediction);
  console.log("BIOMARKER INPUT:", input);

  /**
   * Build chart data from the patient's REAL prediction input.
   *
   * Your backend currently provides:
   *
   * age
   * gender
   * bmi
   * blood_pressure_systolic
   * blood_pressure_diastolic
   * cholesterol_hdl
   * cholesterol_ldl
   * cholesterol_total
   * family_history_cvd
   * family_history_diabetes
   * fasting_glucose
   * hba1c
   * physical_activity
   * smoking
   * triglycerides
   *
   * Heart rate is NOT present in the current backend input,
   * so we do NOT invent a value for it.
   */
  const data = useMemo(() => {
    const fastingGlucose = Number(input.fasting_glucose);
    const systolic = Number(input.blood_pressure_systolic);
    const bmi = Number(input.bmi);
    const hba1c = Number(input.hba1c);
    const totalCholesterol = Number(input.cholesterol_total);
    const ldl = Number(input.cholesterol_ldl);
    const hdl = Number(input.cholesterol_hdl);
    const triglycerides = Number(input.triglycerides);

    return [
      {
        subject: "Glucose",
        patient: normalize(
          fastingGlucose,
          70,
          100
        ),
        benchmark: 50,
        actualValue: Number.isFinite(fastingGlucose)
          ? `${fastingGlucose} mg/dL`
          : "Not available",
        benchmarkValue: "70–100 mg/dL",
        fullMark: 100,
      },

      {
        subject: "Blood Pressure",
        patient: normalizeBloodPressure(systolic),
        benchmark: normalizeBloodPressure(120),
        actualValue:
          Number.isFinite(systolic) &&
          Number.isFinite(Number(input.blood_pressure_diastolic))
            ? `${systolic}/${Number(input.blood_pressure_diastolic)} mmHg`
            : "Not available",
        benchmarkValue: "≈120/80 mmHg",
        fullMark: 100,
      },

      {
        subject: "BMI",
        patient: normalize(
          bmi,
          18.5,
          24.9
        ),
        benchmark: 50,
        actualValue: Number.isFinite(bmi)
          ? `${bmi}`
          : "Not available",
        benchmarkValue: "18.5–24.9",
        fullMark: 100,
      },

      {
        subject: "HbA1c",
        patient: normalize(
          hba1c,
          4,
          5.6
        ),
        benchmark: normalize(
          5.0,
          4,
          5.6
        ),
        actualValue: Number.isFinite(hba1c)
          ? `${hba1c}%`
          : "Not available",
        benchmarkValue: "< 5.7%",
        fullMark: 100,
      },

      {
        subject: "Total Cholesterol",
        patient: normalize(
          totalCholesterol,
          125,
          200
        ),
        benchmark: normalize(
          180,
          125,
          200
        ),
        actualValue: Number.isFinite(totalCholesterol)
          ? `${totalCholesterol} mg/dL`
          : "Not available",
        benchmarkValue: "< 200 mg/dL",
        fullMark: 100,
      },

      {
        subject: "LDL",
        patient: normalize(
          ldl,
          50,
          100
        ),
        benchmark: normalize(
          100,
          50,
          100
        ),
        actualValue: Number.isFinite(ldl)
          ? `${ldl} mg/dL`
          : "Not available",
        benchmarkValue: "< 100 mg/dL",
        fullMark: 100,
      },

      {
        subject: "HDL",
        patient: normalize(
          hdl,
          40,
          60
        ),
        benchmark: normalize(
          50,
          40,
          60
        ),
        actualValue: Number.isFinite(hdl)
          ? `${hdl} mg/dL`
          : "Not available",
        benchmarkValue: "≥ 50 mg/dL",
        fullMark: 100,
      },

      {
        subject: "Triglycerides",
        patient: normalize(
          triglycerides,
          50,
          150
        ),
        benchmark: normalize(
          150,
          50,
          150
        ),
        actualValue: Number.isFinite(triglycerides)
          ? `${triglycerides} mg/dL`
          : "Not available",
        benchmarkValue: "< 150 mg/dL",
        fullMark: 100,
      },
    ];
  }, [input]);

  /**
   * Average normalized patient score.
   */
  const averagePatient = useMemo(() => {
    if (!data.length) return 0;

    return Math.round(
      data.reduce(
        (sum, item) => sum + item.patient,
        0
      ) / data.length
    );
  }, [data]);

  /**
   * Average normalized benchmark score.
   */
  const averageBenchmark = useMemo(() => {
    if (!data.length) return 0;

    return Math.round(
      data.reduce(
        (sum, item) => sum + item.benchmark,
        0
      ) / data.length
    );
  }, [data]);

  return (
    <Card
      className="
        w-full
        overflow-hidden
        border-slate-200/70
        bg-white
        shadow-sm
        dark:border-slate-800
        dark:bg-slate-950
      "
    >
      {/* HEADER */}

      <CardHeader
        className="
          border-b
          border-slate-100
          px-5 py-5
          dark:border-slate-800
        "
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-start gap-3">

            <div
              className="
                flex size-10 shrink-0
                items-center justify-center
                rounded-xl
                bg-primary/10
                text-primary
              "
            >
              <Activity className="size-5" />
            </div>

            <div>

              <CardTitle className="text-base font-bold tracking-tight">
                Biomarker Health Profile
              </CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Patient metrics compared with reference benchmarks
              </p>

            </div>

          </div>

          {/* LEGEND */}

          <div className="flex items-center gap-4">

            <div className="flex items-center gap-1.5">

              <span className="size-2 rounded-full bg-primary" />

              <span className="text-[9px] font-medium text-muted-foreground">
                Patient
              </span>

            </div>

            <div className="flex items-center gap-1.5">

              <span className="size-2 rounded-full bg-emerald-500" />

              <span className="text-[9px] font-medium text-muted-foreground">
                Benchmark
              </span>

            </div>

          </div>

        </div>
      </CardHeader>

      <CardContent className="p-5">

        {/* QUICK SUMMARY */}

        <div className="mb-4 grid grid-cols-2 gap-3">

          <div
            className="
              rounded-xl
              border
              border-slate-200/70
              bg-slate-50/60
              px-3.5 py-3
              dark:border-slate-800
              dark:bg-slate-900/40
            "
          >

            <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              Patient average
            </p>

            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
              {averagePatient}

              <span className="ml-0.5 text-xs font-medium text-muted-foreground">
                /100
              </span>
            </p>

          </div>

          <div
            className="
              rounded-xl
              border
              border-emerald-100
              bg-emerald-50/40
              px-3.5 py-3
              dark:border-emerald-950
              dark:bg-emerald-950/20
            "
          >

            <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              Reference average
            </p>

            <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {averageBenchmark}

              <span className="ml-0.5 text-xs font-medium text-muted-foreground">
                /100
              </span>
            </p>

          </div>

        </div>

        {/* CHART */}

        <div className="h-[340px] w-full sm:h-[390px]">

          <ResponsiveContainer width="100%" height="100%">

            <RadarChart
              cx="50%"
              cy="50%"
              outerRadius="65%"
              data={data}
            >

              <PolarGrid
                stroke="#94a3b8"
                strokeOpacity={0.2}
              />

              <PolarAngleAxis
                dataKey="subject"
                stroke="#94a3b8"
                fontSize={9}
                tickLine={false}
              />

              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                stroke="#94a3b8"
                fontSize={9}
                tickLine={false}
                axisLine={false}
              />

              {/* PATIENT */}

              <Radar
                name="Patient Metrics"
                dataKey="patient"
                stroke="#0d9488"
                fill="#0d9488"
                fillOpacity={0.35}
                strokeWidth={2}
                dot={{
                  r: 3,
                  fill: "#0d9488",
                }}
                activeDot={{
                  r: 5,
                }}
              />

              {/* BENCHMARK */}

              <Radar
                name="Reference Benchmark"
                dataKey="benchmark"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.08}
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />

              {/* TOOLTIP */}

              <Tooltip
                cursor={false}
                formatter={(value, name, props) => {
                  const item = props?.payload;

                  if (name === "Patient Metrics") {
                    return [
                      `${item?.actualValue ?? value}`,
                      "Patient",
                    ];
                  }

                  return [
                    `${item?.benchmarkValue ?? value}`,
                    "Reference",
                  ];
                }}
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.96)",
                  border: "1px solid rgba(51, 65, 85, 0.8)",
                  borderRadius: "12px",
                  color: "#f8fafc",
                  fontSize: "11px",
                  padding: "10px 12px",
                  boxShadow:
                    "0 10px 30px rgba(0, 0, 0, 0.18)",
                }}
                labelStyle={{
                  color: "#cbd5e1",
                  fontWeight: 600,
                  marginBottom: "4px",
                }}
              />

            </RadarChart>

          </ResponsiveContainer>

        </div>

        {/* REAL VALUES */}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">

          {data.map((item) => (

            <div
              key={item.subject}
              className="
                rounded-lg
                border
                border-slate-200/70
                bg-slate-50/60
                px-2.5 py-2
                dark:border-slate-800
                dark:bg-slate-900/40
              "
            >

              <p className="truncate text-[8px] font-medium uppercase tracking-wide text-muted-foreground">
                {item.subject}
              </p>

              <p className="mt-0.5 text-xs font-semibold">
                {item.actualValue}
              </p>

            </div>

          ))}

        </div>

        {/* BIOMARKER INFO */}

        <div
          className="
            mt-3
            flex items-start gap-2
            rounded-xl
            border
            border-slate-200/70
            bg-slate-50/70
            px-3 py-2.5
            dark:border-slate-800
            dark:bg-slate-900/40
          "
        >

          <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />

          <p className="text-[9px] leading-relaxed text-muted-foreground">
            Patient values are taken directly from the latest saved
            prediction input. The radar visualization normalizes each
            biomarker to a 0–100 scale for comparison and does not replace
            the underlying clinical values shown below the chart.
          </p>

        </div>

        {/* STATUS */}

        <div className="mt-3 flex items-center justify-center gap-1.5">

          <CircleDot className="size-3 text-primary" />

          <span className="text-[9px] font-medium text-muted-foreground">
            {data.length} biomarkers included in this profile
          </span>

        </div>

      </CardContent>
    </Card>
  );
};

export default BiomarkerRadarChart;