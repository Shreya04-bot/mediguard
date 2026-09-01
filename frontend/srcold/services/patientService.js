import api from "./api";

/**
 * Patient service — profile, doctor linking, prediction history,
 * reports, timeline, health score, and family risk cluster.
 */

/** @typedef {{
 *   user_id: string, name: string, email: string, dob: string|null, gender: string|null,
 *   blood_group: string|null, phone: string|null, address: string|null,
 *   emergency_contact: string|null, medical_history: string|null
 * }} PatientProfile */

/** @returns {Promise<PatientProfile>} */
export const fetchPatientProfileApi = () => api.get("/patient/profile");

/** @returns {Promise<PatientProfile>} */
export const updatePatientProfileApi = (data) => api.put("/patient/profile", data);

/** @returns {Promise<Array<{ id: string, name: string, specialization: string, hospital_name: string, link_status: string|null }>>} */
export const fetchAvailableDoctorsApi = () => api.get("/patient/doctors");

/** @returns {Promise<{ status: string, link_id: string, link_status: string }>} */
export const requestDoctorLinkApi = (doctorId, notes = "") => api.post("/patient/link-request", { doctor_id: doctorId, notes });

/** @typedef {{
 *   id: string, prediction_id: string, diabetes_probability: number, diabetes_risk_level: string,
 *   cvd_probability: number, cvd_risk_level: string, combined_score: number, model_version: string, created_at: string
 * }} PredictionHistoryRow */

/** @returns {Promise<PredictionHistoryRow[]>} */
export const fetchPredictionHistoryApi = () => api.get("/patient/history");

/** @returns {Promise<Array<{ id: string, report_name: string, file_type: string, summary: string|null, flags: string[], uploaded_at: string }>>} */
export const fetchPatientReportsApi = () => api.get("/patient/reports");

/** @returns {Promise<{ items: Array<{ id: string, type: "prediction"|"report", title: string, description: string, date: string, severity: string }> }>} */
export const fetchPatientTimelineApi = () => api.get("/patient/timeline");

/** @returns {Promise<{ score: number|null, label: string, diabetesRiskLevel?: string, cvdRiskLevel?: string, lastUpdated?: string }>} */
export const fetchHealthScoreApi = () => api.get("/patient/health-score");

/** @typedef {{
 *   members: Array<{ id: string, name: string, relation: string, age: number|null, riskScore: number, conditions: string[] }>,
 *   member_count: number, avg_risk_score: number, hereditary_conditions_count: number, insights: string[]
 * }} FamilyDashboard */

/** @returns {Promise<FamilyDashboard>} */
export const fetchFamilyDashboardApi = () => api.get("/patient/family");

/** @returns {Promise<{ status: string, member_id: string }>} */
export const addFamilyMemberApi = (member) => api.post("/patient/family/member", member);

/** @returns {Promise<{ status: string }>} */
export const removeFamilyMemberApi = (memberId) => api.delete(`/patient/family/member/${memberId}`);
