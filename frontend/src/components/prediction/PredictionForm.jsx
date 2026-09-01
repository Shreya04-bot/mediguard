import React, { useState } from "react";
import { Activity, Sparkles, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PredictionFormInputs } from "../forms/PredictionFormInputs";
import { usePrediction } from "../../hooks/usePrediction";
import { RiskGauge } from "./RiskGauge";
import { FactorBreakdown } from "./FactorBreakdown";

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
  const { loading, result, error, runPrediction } = usePrediction();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Real medical history built from the actual toggles the clinician/
    // patient set on this form — this used to be a hardcoded array
    // ("Hypertension", "Family history of Diabetes") sent regardless of
    // what was entered, which is exactly the kind of fabricated data this
    // platform is meant to avoid.
    const medicalHistory = [];
    if (form.smoking) medicalHistory.push("Current smoker");
    if (form.familyHistoryDiabetes) medicalHistory.push("Family history of diabetes");
    if (form.familyHistoryCvd) medicalHistory.push("Family history of cardiovascular disease");

    await runPrediction({
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
      medicalHistory,
    });
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
              <PredictionFormInputs form={form} setForm={setForm} />
              <Button type="submit" disabled={loading} className="w-full py-3" variant="default">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" aria-hidden="true" />}
                Run Disease Risk Prediction
              </Button>
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-5">
        {result ? (
          <div className="space-y-4">
            <RiskGauge score={result.riskScore} level={result.riskLevel} />
            <FactorBreakdown factors={result.primaryFactors} recommendations={result.recommendations} ayurveda={result.preventiveAyurveda} />
          </div>
        ) : (
          <Card className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400">
            <div className="p-4 rounded-full bg-teal-500/10 text-teal-500 mb-3 animate-pulse">
              <Sparkles className="h-8 w-8" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Ready for AI Analysis</h4>
            <p className="text-xs max-w-xs mt-1">
              Enter patient biomarkers and click run to generate real-time risk scores and clinical factor breakdowns.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};
