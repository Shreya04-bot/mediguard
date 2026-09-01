import React, { useState } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { OcrUploader } from "../../components/reports/OcrUploader";
import { BiomarkerExtractor } from "../../components/reports/BiomarkerExtractor";
import { ReportHistory } from "../../components/reports/ReportHistory";

export const PatientReportsPage = () => {
  const [reportData, setReportData] = useState(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Medical Reports & OCR Scanning"
        description="Upload scanned lab blood reports for AI biomarker extraction and historical tracking."
      />

      <OcrUploader onParseComplete={(data) => setReportData(data)} />
      {reportData && <BiomarkerExtractor reportData={reportData} />}
      <ReportHistory />
    </div>
  );
};
