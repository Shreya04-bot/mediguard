import React, { useEffect, useState } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { DietCard } from "../../components/ayurveda/DietCard";
import api from "@/services/api";
import { toast } from "sonner";

export const DietPlanPage = () => {
  const [dietPlan, setDietPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDietPlan = async () => {
      try {
        setLoading(true);

        /*
         * Use the Prakriti result saved by the quiz.
         */
        const savedPrakriti = localStorage.getItem(
          "mediguard_prakriti_result"
        );

        const prakriti = savedPrakriti
          ? JSON.parse(savedPrakriti)
          : null;

        /*
         * If the user has not completed the Prakriti quiz,
         * we cannot personalize the diet using their Dosha.
         */
        if (!prakriti?.primary_dosha) {
          setDietPlan(null);
          return;
        }

        /*
         * Get the patient's latest health risks.
         */
        let diabetesRisk = "moderate";
        let cvdRisk = "moderate";
        let bmi = null;

        try {
          const healthScore = await api.get(
            "/patient/health-score"
          );

          diabetesRisk =
            healthScore?.diabetesRiskLevel?.toLowerCase() ||
            "moderate";

          cvdRisk =
            healthScore?.cvdRiskLevel?.toLowerCase() ||
            "moderate";
        } catch (healthError) {
          console.warn(
            "Could not load health risk levels:",
            healthError
          );
        }

        /*
         * Generate the personalized diet using
         * the real Ayurveda backend.
         */
        const result = await api.post(
          "/features/ayurveda/diet",
          {
            primary_dosha:
              prakriti.primary_dosha.toLowerCase(),

            diabetes_risk_level:
              diabetesRisk,

            cvd_risk_level:
              cvdRisk,

            bmi,

            language: "en",
          }
        );

        setDietPlan(result);

      } catch (error) {
        console.error(
          "Failed to load personalized diet:",
          error
        );

        toast.error(
          error?.message ||
            "Unable to generate your personalized diet plan."
        );

      } finally {
        setLoading(false);
      }
    };

    loadDietPlan();
  }, []);

  return (
    <div>
      <PageHeader
        title="Personalized Ayurvedic Diet & Herbs"
        description="Precision nutritional regimen tailored to your Ayurvedic constitution and health risk profile."
      />

      <div className="max-w-3xl mx-auto">
        <DietCard
          dietPlan={dietPlan}
          loading={loading}
        />
      </div>
    </div>
  );
};