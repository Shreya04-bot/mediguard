import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { YogaCard } from "../../components/ayurveda/YogaCard";

export const YogaPage = () => {
  return (
    <div>
      <PageHeader
        title="Therapeutic Yoga & Pranayama"
        description="Targeted breathing techniques and postures to reduce cortisol and improve arterial elasticity."
      />
      <div className="max-w-3xl mx-auto">
        <YogaCard />
      </div>
    </div>
  );
};
