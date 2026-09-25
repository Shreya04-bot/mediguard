import api from "./api";

export const parseOcrReportApi = async (imageBase64, mimeType) => {
  const response = await api.post("/ai/ocr", {
    imageBase64,
    mimeType,
  });

  return response;
};

export const ocrAutofillApi = async (file, useLlm = true) => {
  if (!file) {
    throw new Error("No file selected.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("use_llm", String(useLlm));

  const response = await api.post(
    "/features/ocr/autofill",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response;
};

export const generateHealthReportPdfApi = async ({
  patientData,
  prediction,
  agentSummary,
  assessmentFocus,
  language = "en",
}) => {
  return await api.post(
    "/features/report/pdf",
    {
      patient_data: patientData,
      prediction,
      agent_summary: agentSummary || null,
      assessment_focus: assessmentFocus,
      language,
    },
    {
      responseType: "blob",
    }
  );
};
