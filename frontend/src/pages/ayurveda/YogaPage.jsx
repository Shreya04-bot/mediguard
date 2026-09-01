import React, { useEffect, useState } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { YogaCard } from "../../components/ayurveda/YogaCard";
import {
  fetchHealthScoreApi,
  fetchPredictionHistoryApi,
} from "@/services/patientService";
import api from "@/services/api";
import { toast } from "sonner";

export const YogaPage = () => {
  const [yogaPlan, setYogaPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadYogaPlan = async () => {
      try {
        setLoading(true);

        // Get Prakriti result produced by the backend quiz.
        const savedPrakriti = localStorage.getItem(
          "mediguard_prakriti_result"
        );

        const prakriti = savedPrakriti
          ? JSON.parse(savedPrakriti)
          : null;

        if (!prakriti?.primary_dosha) {
          setYogaPlan(null);
          return;
        }

        // Get latest health score and prediction.
        const [healthScore, history] = await Promise.all([
          fetchHealthScoreApi(),
          fetchPredictionHistoryApi(),
        ]);

        const latestPrediction = history?.[0];

        /*
         * The prediction history stores the original
         * model input, including age and blood pressure.
         */
        const inputData = latestPrediction?.input_data || {};

        const age = Number(inputData.age);

        if (!age || age < 1) {
          toast.error(
            "Please complete a health prediction first so we can personalize your yoga plan."
          );
          setYogaPlan(null);
          return;
        }

        const systolic =
          inputData.blood_pressure_systolic != null
            ? Number(inputData.blood_pressure_systolic)
            : null;

        const diabetesRisk =
          healthScore?.diabetesRiskLevel ||
          latestPrediction?.diabetes_risk_level ||
          "moderate";

        const cvdRisk =
          healthScore?.cvdRiskLevel ||
          latestPrediction?.cvd_risk_level ||
          "moderate";

        // Generate the real personalized yoga plan.
        const result = await api.post(
          "/features/ayurveda/yoga",
          {
            primary_dosha:
              prakriti.primary_dosha.toLowerCase(),

            diabetes_risk_level:
              diabetesRisk.toLowerCase(),

            cvd_risk_level:
              cvdRisk.toLowerCase(),

            age,

            blood_pressure_systolic:
              systolic,

            mobility: "normal",

            language: "en",
          }
        );

        setYogaPlan(result);

      } catch (error) {
        console.error(
          "Failed to load personalized yoga plan:",
          error
        );

        toast.error(
          error?.message ||
            "Unable to generate your personalized yoga plan."
        );
      } finally {
        setLoading(false);
      }
    };

    loadYogaPlan();
  }, []);

  return (
    <div>
      <PageHeader
        title="Therapeutic Yoga & Pranayama"
        description="Targeted breathing techniques and postures personalized to your Ayurvedic constitution and health profile."
      />

      <div className="max-w-3xl mx-auto">
        <YogaCard
          yogaPlan={yogaPlan}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default YogaPage;