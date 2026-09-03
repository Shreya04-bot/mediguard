import api from "./api";

export const parseOcrReportApi = (imageBase64, mimeType) =>
  api.post("/ai/ocr", {
    imageBase64,
    mimeType,
  });

export const generateHealthReportPdfApi = async ({
  patientData,
  prediction,
  agentSummary,
  language = "en",
  patientName = "Patient",
}) => {
  return await api.post("/features/report/pdf", {
    patient_data: patientData,
    prediction,
    agent_summary: agentSummary || null,
    language,
    patient_name: patientName || "Patient",
  }, {
    responseType: "blob",
  });
};