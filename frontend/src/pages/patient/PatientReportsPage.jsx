import React, { useState } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { OcrUploader } from "../../components/reports/OcrUploader";
import { BiomarkerExtractor } from "../../components/reports/BiomarkerExtractor";
import { ReportHistory } from "../../components/reports/ReportHistory";

const BIOMARKER_META = {
  blood_pressure_systolic: {
    name: "Systolic BP",
    unit: "mmHg",
  },
  blood_pressure_diastolic: {
    name: "Diastolic BP",
    unit: "mmHg",
  },
  fasting_glucose: {
    name: "Fasting Glucose",
    unit: "mg/dL",
  },
  hba1c: {
    name: "HbA1c",
    unit: "%",
  },
  cholesterol_total: {
    name: "Total Cholesterol",
    unit: "mg/dL",
  },
  cholesterol_hdl: {
    name: "HDL",
    unit: "mg/dL",
  },
  cholesterol_ldl: {
    name: "LDL",
    unit: "mg/dL",
  },
  triglycerides: {
    name: "Triglycerides",
    unit: "mg/dL",
  },
  bmi: {
    name: "BMI",
    unit: "kg/m²",
  },
};

const getStatus = (field) => {
  const status = field?.clinical_status;

  if (!status) return "Normal";

  const label = status.label || status.status || status.code || "Normal";

  return String(label)
    .replace(/^svg/i, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\bStage\s*1\b/i, "Stage 1")
    .replace(/\bStage\s*2\b/i, "Stage 2")
    .replace(/\bHtn\b/i, "Hypertension")
    .replace(/\bHBP\b/i, "High Blood Pressure")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getRange = (key) => {
  const ranges = {
    blood_pressure_systolic:
      "Normal <120 mmHg • Elevated 120–129 • Stage 1: 130–139 • Stage 2: 140–179",
    blood_pressure_diastolic:
      "Normal <80 mmHg • Stage 1: 80–89 • Stage 2: 90–119",
    fasting_glucose:
      "Normal 70–99 mg/dL • Prediabetes 100–125 • Diabetes ≥126",
    hba1c:
      "Normal 4.0–5.6% • Prediabetes 5.7–6.4% • Diabetes ≥6.5%",
    cholesterol_total:
      "Desirable <200 mg/dL • Borderline 200–239 • High ≥240",
    cholesterol_hdl:
      "Low <40 mg/dL • Acceptable 40–59 • Optimal ≥60",
    cholesterol_ldl:
      "Optimal <100 mg/dL • Near optimal 100–129 • Borderline 130–159 • High 160–189",
    triglycerides:
      "Normal <150 mg/dL • Borderline 150–199 • High 200–499 • Very high ≥500",
    bmi:
      "Normal 18.5–22.9 kg/m² • Overweight 23–24.9 • Obesity ≥25",
  };

  return ranges[key] || "Clinical reference unavailable";
};

const normalizeStatus = (status) => {
  return String(status || "")
    .toLowerCase()
    .replace(/^svg/i, "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const getStatusType = (status) => {
  const normalized = normalizeStatus(status);

  if (
    normalized === "normal" ||
    normalized === "acceptable" ||
    normalized === "optimal" ||
    normalized.includes("within normal")
  ) {
    return "normal";
  }

  if (
    normalized.includes("stage1") ||
    normalized.includes("stage 1") ||
    normalized.includes("stage2") ||
    normalized.includes("stage 2") ||
    normalized.includes("hypertension") ||
    normalized.includes("diabetes") ||
    normalized.includes("obesity") ||
    normalized.includes("critical") ||
    normalized.includes("very high")
  ) {
    return "abnormal";
  }

  if (
    normalized.includes("borderline") ||
    normalized.includes("elevated") ||
    normalized.includes("overweight") ||
    normalized.includes("prediabetes") ||
    normalized.includes("near optimal") ||
    normalized.includes("near-optimal")
  ) {
    return "borderline";
  }

  if (
    normalized.includes("high") ||
    normalized.includes("low")
  ) {
    return "abnormal";
  }

  return "borderline";
};

const buildSummary = (biomarkers) => {
  if (!biomarkers.length) {
    return "No recognizable biomarkers were extracted from this report.";
  }

  const normal = biomarkers.filter(
    (item) => getStatusType(item.status) === "normal"
  );

  const borderline = biomarkers.filter(
    (item) => getStatusType(item.status) === "borderline"
  );

  const abnormal = biomarkers.filter(
    (item) => getStatusType(item.status) === "abnormal"
  );

  const parts = [
    `Extracted ${biomarkers.length} biomarker(s) from this report.`,
  ];

  if (normal.length) {
    parts.push(
      `${normal.length} value(s) were classified within the normal or acceptable category: ${normal
        .map((item) => item.name)
        .join(", ")}.`
    );
  }

  if (borderline.length) {
    parts.push(
      `${borderline.length} value(s) were classified as borderline or requiring monitoring: ${borderline
        .map((item) => item.name)
        .join(", ")}.`
    );
  }

  if (abnormal.length) {
    parts.push(
      `${abnormal.length} value(s) were classified as outside the normal category: ${abnormal
        .map((item) => item.name)
        .join(", ")}.`
    );
  }

  return parts.join(" ");
};

const buildActionablePlan = (biomarkers) => {
  const borderline = biomarkers.filter(
    (item) => getStatusType(item.status) === "borderline"
  );

  const abnormal = biomarkers.filter(
    (item) => getStatusType(item.status) === "abnormal"
  );

  const actions = [];

  if (abnormal.length) {
    actions.push(
      `Review clinically significant findings: ${abnormal
        .map((item) => item.name)
        .join(", ")}.`
    );
  }

  if (borderline.length) {
    actions.push(
      `Monitor borderline findings: ${borderline
        .map((item) => item.name)
        .join(", ")}.`
    );
  }

  if (
    biomarkers.some(
      (item) =>
        item.key === "fasting_glucose" ||
        item.key === "hba1c"
    )
  ) {
    actions.push(
      "Discuss glucose and HbA1c findings with a healthcare professional if clinically appropriate."
    );
  }

  if (
    biomarkers.some(
      (item) =>
        item.key === "cholesterol_total" ||
        item.key === "cholesterol_ldl" ||
        item.key === "triglycerides"
    )
  ) {
    actions.push(
      "Review the lipid profile together with cardiovascular risk factors and previous results."
    );
  }

  if (
    biomarkers.some(
      (item) =>
        item.key === "blood_pressure_systolic" ||
        item.key === "blood_pressure_diastolic"
    )
  ) {
    actions.push(
      "Consider repeat blood-pressure measurements under appropriate conditions and discuss persistent elevations with a healthcare professional."
    );
  }

  if (!actions.length) {
    actions.push(
      "Continue routine health monitoring and discuss future results with your healthcare professional when appropriate."
    );
  }

  return actions;
};

const transformOcrResponse = (data) => {
  if (!data || typeof data !== "object") {
    return null;
  }

  const fields = data.fields || {};

  const biomarkers = Object.entries(fields)
    .filter(
      ([key, field]) =>
        BIOMARKER_META[key] &&
        field &&
        field.value !== undefined &&
        field.value !== null
    )
    .map(([key, field]) => {
      const meta = BIOMARKER_META[key];

      return {
        key,
        name: meta.name,
        value: field.value,
        unit: meta.unit,
        status: getStatus(field),
        range: getRange(key),
        confidence: field.confidence,
        method: field.method,
        clinical_status: field.clinical_status,
      };
    });

  return {
    ...data,
    reportType: "AI OCR Lab Report",
    labName: "AI OCR Analysis",
    date: new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    biomarkers,
    aiSummary: buildSummary(biomarkers),
    actionablePlan: buildActionablePlan(biomarkers),
  };
};

export const PatientReportsPage = () => {
  const [reportData, setReportData] = useState(null);

  const handleParseComplete = (data) => {
    const transformedData = transformOcrResponse(data);

    console.log("TRANSFORMED OCR REPORT:", transformedData);

    setReportData(transformedData);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Medical Reports & OCR Scanning"
        description="Upload scanned lab blood reports for AI biomarker extraction and historical tracking."
      />

      <OcrUploader onParseComplete={handleParseComplete} />

      {reportData && (
        <BiomarkerExtractor reportData={reportData} />
      )}

      <ReportHistory />
    </div>
  );
};