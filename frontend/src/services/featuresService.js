import api from "./api";

/**
 * Feature endpoints under backend's /features router (backend/api/routes/ayurveda.py).
 * NOTE: unlike patient/doctor/admin routes, this router only has a
 * versioned mount (/api/v1/features) — no unversioned /api/features
 * alias — so calls here must include the /v1 segment explicitly.
 */

/**
 * F2: Uttar Pradesh district-level diabetes/CVD risk heatmap.
 * NFHS-5/ICMR-INDIAB epidemiological baseline, blended with real
 * per-district prediction data once enough patients from that
 * district have been assessed. Population-level data — not specific
 * to any one patient — so it's shared between admin and doctor views.
 *
 * @returns {Promise<{ districts: Array<Object>, summary: Object }>}
 */
export const fetchDistrictHeatmapApi = () => api.get("/features/heatmap");


export const simulateTimelineApi = async (patientData, interventionKeys) => {
  const response = await api.post("/features/timeline", {
    patient_data: patientData,
    intervention_keys: interventionKeys,
  });
  return response;
};

export const mapVernacularSymptomsApi = async (text, useLlmFallback = true) => {
  return await api.post("/features/symptoms/map", {
    text,
    use_llm_fallback: useLlmFallback,
  });
};