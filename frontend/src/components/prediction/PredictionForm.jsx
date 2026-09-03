import React, { useState } from "react";
import {
  Activity,
  Sparkles,
  Loader2,
  Download,
  FileText,
  CheckCircle2,
} from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { PredictionFormInputs } from "../forms/PredictionFormInputs";
import { usePrediction } from "../../hooks/usePrediction";
import { RiskGauge } from "./RiskGauge";
import { FactorBreakdown } from "./FactorBreakdown";
import { generateHealthReportPdfApi } from "../../services/reportService";
import { useAuth } from "../../context/AuthContext";

const initialForm = {
  diseaseType: "Type 2 Diabetes",
  gender: "male",
  age: "58",
  bmi: "27.4",
  bloodPressure: "138/88",
  glucose: "118",
  hba1c: "6.1",
  triglycerides: "165",
  cholesterolTotal: "210",
  cholesterolHdl: "42",
  cholesterolLdl: "138",
  physicalActivity: "moderate",
  smoking: false,
  familyHistoryDiabetes: false,
  familyHistoryCvd: false,
};

export const PredictionForm = () => {
  const [form, setForm] = useState(initialForm);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);

  const { user } = useAuth();

  const {
    loading,
    result,
    error,
    runPrediction,
  } = usePrediction();

  const buildMedicalHistory = () => {
    const medicalHistory = [];

    if (form.smoking) {
      medicalHistory.push("Current smoker");
    }

    if (form.familyHistoryDiabetes) {
      medicalHistory.push("Family history of diabetes");
    }

    if (form.familyHistoryCvd) {
      medicalHistory.push(
        "Family history of cardiovascular disease"
      );
    }

    return medicalHistory;
  };

  const buildPredictionPayload = () => {
    return {
      diseaseType: form.diseaseType,
      vitals: {
        age: form.age,
        gender: form.gender,
        bmi: form.bmi,
        bloodPressure: form.bloodPressure,
        glucose: form.glucose,
        hba1c: form.hba1c,
        triglycerides: form.triglycerides,
        cholesterolTotal: form.cholesterolTotal,
        cholesterolHdl: form.cholesterolHdl,
        cholesterolLdl: form.cholesterolLdl,
        physicalActivity: form.physicalActivity,
      },
      smoking: form.smoking,
      familyHistoryDiabetes: form.familyHistoryDiabetes,
      familyHistoryCvd: form.familyHistoryCvd,
      medicalHistory: buildMedicalHistory(),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setReportError(null);

    await runPrediction(buildPredictionPayload());
  };

  const buildReportPatientData = () => {
    const [systolic, diastolic] = form.bloodPressure
      .split("/")
      .map((value) => Number(value.trim()));

    return {
      age: Number(form.age),
      gender: form.gender,
      bmi: Number(form.bmi),
      blood_pressure_systolic: systolic,
      blood_pressure_diastolic: diastolic,
      fasting_glucose: Number(form.glucose),
      hba1c: Number(form.hba1c),
      cholesterol_total: Number(form.cholesterolTotal),
      cholesterol_hdl: Number(form.cholesterolHdl),
      cholesterol_ldl: Number(form.cholesterolLdl),
      triglycerides: Number(form.triglycerides),
      smoking: form.smoking,
      family_history_diabetes: form.familyHistoryDiabetes,
      family_history_cvd: form.familyHistoryCvd,
      physical_activity: form.physicalActivity,
      disease_type: form.diseaseType,
    };
  };

  const getPatientName = () => {
    return (
      user?.name ||
      user?.full_name ||
      user?.fullName ||
      user?.username ||
      "Patient"
    );
  };

  const handleDownloadReport = async () => {
    if (!result) return;

    setReportLoading(true);
    setReportError(null);

    try {
      const patientData = buildReportPatientData();

      const agentSummary = [
        `Assessment focus: ${form.diseaseType}.`,
        `Overall risk level: ${result.riskLevel}.`,
        ...(result.recommendations || []),
      ].join(" ");

      const language =
        typeof navigator !== "undefined" &&
        navigator.language?.toLowerCase().startsWith("hi")
          ? "hi"
          : "en";

      const pdfBlob = await generateHealthReportPdfApi({
        patientData,
        prediction: result,
        agentSummary,
        language,
        patientName: getPatientName(),
      });

      if (!(pdfBlob instanceof Blob)) {
        throw new Error("The server did not return a valid PDF file.");
      }

      if (pdfBlob.size === 0) {
        throw new Error("The generated health report is empty.");
      }

      const url = window.URL.createObjectURL(pdfBlob);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `MediGuard_Health_Report_${getPatientName()
        .replace(/[^a-zA-Z0-9-_ ]/g, "")
        .trim()
        .replace(/\s+/g, "_") || "Patient"}.pdf`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Health report generation failed:", err);

      setReportError(
        err instanceof Error
          ? err.message
          : "Unable to generate the health report. Please try again."
      );
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Activity className="h-5 w-5 text-teal-500" />
              <span>AI Clinical Risk Assessment Input</span>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <PredictionFormInputs
                form={form}
                setForm={setForm}
              />

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-3"
                variant="default"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles
                    className="size-4"
                    aria-hidden="true"
                  />
                )}

                {loading
                  ? "Analyzing..."
                  : "Run Disease Risk Prediction"}
              </Button>

              {error && (
                <p className="text-sm text-destructive text-center">
                  {error}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-5">
        {result ? (
          <div className="space-y-4">
            <RiskGauge
              score={result.riskScore}
              level={result.riskLevel}
            />

            <FactorBreakdown
              factors={result.primaryFactors}
              recommendations={result.recommendations}
              ayurveda={result.preventiveAyurveda}
            />

            <Card className="border-primary/20 bg-primary/[0.03]">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileText className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">
                        Health Report
                      </h3>

                      <CheckCircle2 className="size-4 text-green-600" />
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Generate a personalised PDF containing your
                      risk assessment, key risk factors,
                      recommendations, and clinical summary.
                    </p>

                    <Button
                      type="button"
                      onClick={handleDownloadReport}
                      disabled={reportLoading}
                      className="mt-4 w-full"
                      variant="outline"
                    >
                      {reportLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}

                      {reportLoading
                        ? "Generating Report..."
                        : "Download Health Report"}
                    </Button>

                    {reportError && (
                      <p className="mt-3 text-sm text-destructive">
                        {reportError}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400">
            <div className="p-4 rounded-full bg-teal-500/10 text-teal-500 mb-3 animate-pulse">
              <Sparkles className="h-8 w-8" />
            </div>

            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Ready for AI Analysis
            </h4>

            <p className="text-xs max-w-xs mt-1">
              Enter patient biomarkers and click run to generate
              real-time risk scores and clinical factor
              breakdowns.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};