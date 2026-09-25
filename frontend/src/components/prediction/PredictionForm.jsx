import React, { useEffect, useState } from "react";
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
import { fetchPatientProfileApi } from "../../services/patientService";
import { useAuth } from "../../context/AuthContext";

// Fallback used only when the logged-in patient hasn't completed their
// health profile yet (or for a doctor running a hypothetical/general
// assessment, where there is no single "current patient" to load).
// Lab vitals (BP, glucose, HbA1c, cholesterol, triglycerides) are always
// left as-is here — those are point-in-time labs, not something we'd
// ever pre-fill from a registration profile.
const initialForm = {
  diseaseType: "Type 2 Diabetes",
  gender: "male",
  age: "",
  bmi: "",
  bloodPressure: "120/80",
  glucose: "",
  hba1c: "",
  triglycerides: "",
  cholesterolTotal: "",
  cholesterolHdl: "",
  cholesterolLdl: "",
  physicalActivity: "moderate",
  smoking: false,
  familyHistoryDiabetes: false,
  familyHistoryCvd: false,
};

export const PredictionForm = () => {
  const [form, setForm] = useState(initialForm);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const { user } = useAuth();

  const { loading, result, error, runPrediction } = usePrediction();

  // Pre-fill demographic/lifestyle fields from the patient's own health
  // profile instead of the generic placeholder defaults above — this is
  // the actual field this form previously hardcoded (age 58, bmi 27.4,
  // etc. regardless of who was logged in). Lab vitals stay editable/blank
  // since those change per assessment and aren't collected at
  // registration. Only runs for the patient role; a doctor running a
  // general/hypothetical assessment has no single patient to load here.
  useEffect(() => {
    if (user?.role !== "patient" || profileLoaded) return;
    let cancelled = false;
    fetchPatientProfileApi()
      .then((profile) => {
        if (cancelled || !profile) return;
        setForm((prev) => ({
          ...prev,
          gender: profile.gender && profile.gender !== "neutral" ? (profile.gender === "other" ? "other" : profile.gender) : prev.gender,
          age: profile.age != null ? String(profile.age) : prev.age,
          bmi: profile.bmi != null ? String(profile.bmi) : prev.bmi,
          physicalActivity: profile.physical_activity_level || prev.physicalActivity,
          smoking: typeof profile.smoking === "boolean" ? profile.smoking : prev.smoking,
          familyHistoryDiabetes:
            typeof profile.family_history_diabetes === "boolean" ? profile.family_history_diabetes : prev.familyHistoryDiabetes,
          familyHistoryCvd:
            typeof profile.family_history_cvd === "boolean" ? profile.family_history_cvd : prev.familyHistoryCvd,
        }));
      })
      .catch(() => {
        /* No profile yet (new/incomplete account) — keep placeholder defaults, user fills in manually. */
      })
      .finally(() => {
        if (!cancelled) setProfileLoaded(true);
      });
    return () => { cancelled = true; };
  }, [user, profileLoaded]);

  const getPatientName = () => {
    return (
      user?.name ||
      user?.full_name ||
      user?.fullName ||
      user?.username ||
      "Patient"
    );
  };

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

  const buildReportPatientData = () => {
    const [systolic, diastolic] = form.bloodPressure
      .split("/")
      .map((value) => Number(value.trim()));

    return {
      name: getPatientName(),
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
      assessment_focus: form.diseaseType,
    };
  };

  const getAssessmentRisk = () => {
    if (!result) {
      return {
        score: 0,
        level: "Low",
      };
    }

    switch (form.diseaseType) {
      case "Cardiovascular Risk":
        return {
          score: Number(
            result.cardiovascularRisk?.probability ?? 0
          ),
          level:
            result.cardiovascularRisk?.riskLevel ??
            "Low",
        };

      case "Hypertension":
        return {
          score: Number(
            result.hypertensionRisk?.probability ?? 0
          ),
          level:
            result.hypertensionRisk?.riskLevel ??
            "Low",
        };

      case "Combined Risk": {
        const combinedScore = Number(
          result.combinedRiskScore ?? 0
        );

        let combinedLevel = "Low";

        if (combinedScore >= 75) {
          combinedLevel = "Critical";
        } else if (combinedScore >= 50) {
          combinedLevel = "High";
        } else if (combinedScore >= 25) {
          combinedLevel = "Moderate";
        }

        return {
          score: combinedScore,
          level: combinedLevel,
        };
      }

      case "Type 2 Diabetes":
      default:
        return {
          score: Number(
            result.diabetesRisk?.probability ?? 0
          ),
          level:
            result.diabetesRisk?.riskLevel ??
            "Low",
        };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setReportError(null);

    await runPrediction(buildPredictionPayload());
  };

  const handleDownloadReport = async () => {
    if (!result) {
      return;
    }

    setReportLoading(true);
    setReportError(null);

    try {
      const patientData = buildReportPatientData();

      const assessmentRisk = getAssessmentRisk();

      const agentSummary = [
        `Assessment focus: ${form.diseaseType}.`,
        `Overall risk level: ${assessmentRisk.level}.`,
        `Risk score: ${assessmentRisk.score}%.`,
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
        assessmentFocus: form.diseaseType,
        language,
      });

      if (!(pdfBlob instanceof Blob)) {
        throw new Error(
          "The server did not return a valid PDF file."
        );
      }

      if (pdfBlob.size === 0) {
        throw new Error(
          "The generated health report is empty."
        );
      }

      const url = window.URL.createObjectURL(pdfBlob);

      const anchor = document.createElement("a");

      anchor.href = url;

      const safeName =
        getPatientName()
          .replace(/[^a-zA-Z0-9-_ ]/g, "")
          .trim()
          .replace(/\s+/g, "_") || "Patient";

      anchor.download = `MediGuard_Health_Report_${safeName}.pdf`;

      document.body.appendChild(anchor);

      anchor.click();

      anchor.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(
        "Health report generation failed:",
        err
      );

      setReportError(
        err instanceof Error
          ? err.message
          : "Unable to generate the health report. Please try again."
      );
    } finally {
      setReportLoading(false);
    }
  };

  const assessmentRisk = result
    ? getAssessmentRisk()
    : null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Activity className="h-5 w-5 text-teal-500" />
              <span>AI Clinical Risk Assessment Input</span>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
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
                <p className="text-center text-sm text-destructive">
                  {error}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-5">
        {result && assessmentRisk ? (
          <div className="space-y-4">
            <RiskGauge
              score={assessmentRisk.score}
              level={assessmentRisk.level}
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
                      Generate a personalised PDF containing
                      your risk assessment, key risk factors,
                      recommendations, and clinical summary.
                    </p>

                    <div className="mt-3 rounded-lg border border-border/50 bg-background/60 px-3 py-2">
                      <p className="text-xs text-muted-foreground">
                        Assessment Focus
                      </p>

                      <p className="text-sm font-semibold">
                        {form.diseaseType}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Risk Score:{" "}
                        {assessmentRisk.score}%
                        {" • "}
                        {assessmentRisk.level} Risk
                      </p>
                    </div>

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
          <Card className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400">
            <div className="mb-3 animate-pulse rounded-full bg-teal-500/10 p-4 text-teal-500">
              <Sparkles className="h-8 w-8" />
            </div>

            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Ready for AI Analysis
            </h4>

            <p className="mt-1 max-w-xs text-xs">
              Enter patient biomarkers and click run to
              generate real-time risk scores and clinical
              factor breakdowns.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};