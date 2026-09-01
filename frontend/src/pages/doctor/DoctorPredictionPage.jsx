import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { PredictionForm } from "../../components/prediction/PredictionForm";

export const DoctorPredictionPage = () => {
  return (
    <div>
      <PageHeader
        title="Clinical Disease Risk Calculator"
        description="Run AI disease risk prediction models on patient biomarkers and medical history."
      />
      <PredictionForm />
    </div>
  );
};
