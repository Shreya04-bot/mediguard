import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { DietCard } from "../../components/ayurveda/DietCard";

export const DietPlanPage = () => {
  return (
    <div>
      <PageHeader
        title="Personalized Ayurvedic Diet & Herbs"
        description="Precision nutritional regimen tailored to pacify metabolic heat and stabilize glycemic levels."
      />
      <div className="max-w-3xl mx-auto">
        <DietCard />
      </div>
    </div>
  );
};
