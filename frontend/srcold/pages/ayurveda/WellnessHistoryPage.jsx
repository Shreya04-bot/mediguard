import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { DoshaBreakdown } from "../../components/ayurveda/DoshaBreakdown";

export const WellnessHistoryPage = () => {
  return (
    <div>
      <PageHeader
        title="Historical Dosha Balance Tracker"
        description="Monitor how seasonal shifts and lifestyle changes impact your Vata, Pitta, and Kapha equilibrium."
      />
      <DoshaBreakdown />
    </div>
  );
};
