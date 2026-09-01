import React, { useState } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { OcrUploader } from "../../components/reports/OcrUploader";
import { BiomarkerExtractor } from "../../components/reports/BiomarkerExtractor";

export const OcrAnalysisPage = () => {
  const [reportData, setReportData] = useState(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medical OCR Lab Report Parser"
        description="Scan and extract structured panel data from blood tests, CMP, lipid profiles, and diagnostic documents."
      />

      <OcrUploader onParseComplete={(data) => setReportData(data)} />
      {reportData && <BiomarkerExtractor reportData={reportData} />}
    </div>
  );
};
