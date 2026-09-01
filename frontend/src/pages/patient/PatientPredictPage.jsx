import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { PredictionForm } from "../../components/prediction/PredictionForm";

export const PatientPredictPage = () => {
  return (
    <div>
      <PageHeader
        title="AI Disease Risk Predictor"
        description="Input your latest vitals to calculate risk assessment and personalized preventive steps."
      />
      <PredictionForm />
    </div>
  );
};
