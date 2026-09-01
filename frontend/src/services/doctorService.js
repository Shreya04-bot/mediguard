import api from "./api";

/**
 * Doctor service — linked patients, patient detail/timeline/family,
 * connection requests, cohort analytics, and profile management.
 */

/** @returns {Promise<{ user_id: string, name: string, email: string, verification_status: "pending"|"approved"|"rejected" }>} */
export const fetchDoctorStatusApi = () => api.get("/doctor/status");

/** @typedef {{
 *   user_id: string, name: string, email: string, verification_status: string,
 *   medical_license: string, hospital_name: string, specialization: string,
 *   license_upload: string|null, experience_years: number, bio: string|null
 * }} DoctorProfile */

/** @returns {Promise<DoctorProfile>} */
export const fetchDoctorProfileApi = () => api.get("/doctor/profile");

/** @returns {Promise<DoctorProfile>} */
export const updateDoctorProfileApi = (data) => api.put("/doctor/profile", data);

/** @typedef {{
 *   patient_id: string, name: string, email: string, gender: string|null, dob: string|null,
 *   blood_group: string|null,
 *   latest_prediction: { diabetes_risk_level: string, cvd_risk_level: string, combined_score: number, date: string } | null
 * }} LinkedPatientRow */

/** @returns {Promise<LinkedPatientRow[]>} */
export const fetchLinkedPatientsApi = () => api.get("/doctor/patients");

/** @returns {Promise<{
 *   patient_id: string, name: string, email: string,
 *   profile: { gender: string|null, blood_group: string|null, phone: string|null, dob: string|null, medical_history: string|null },
 *   predictions: Array<{ id: string, diabetes_risk_level: string, cvd_risk_level: string, diabetes_probability: number, cvd_probability: number, created_at: string }>
 * }>} */
export const fetchPatientDetailApi = (patientId) => api.get(`/doctor/patients/${patientId}`);

/** @returns {Promise<{ items: Array<{ id: string, type: "prediction"|"report", title: string, description: string, date: string, severity: string }> }>} */
export const fetchPatientTimelineApi = (patientId) => api.get(`/doctor/patients/${patientId}/timeline`);

/** @typedef {{
 *   members: Array<{ id: string, name: string, relation: string, age: number|null, riskScore: number, conditions: string[] }>,
 *   member_count: number, avg_risk_score: number, hereditary_conditions_count: number, insights: string[]
 * }} FamilyDashboard */

/** @returns {Promise<FamilyDashboard>} */
export const fetchPatientFamilyApi = (patientId) => api.get(`/doctor/patients/${patientId}/family`);

/** @returns {Promise<{
 *   final_risk_level: string, summary: string, triage_priority: string, next_steps: string[], disclaimer: string,
 *   agent_outputs: Array<{ agent_name: string, findings: string, recommendations: string[], guideline_references: string[], confidence: number }>
 * }>} */
export const runClinicalAnalysisApi = (patientId) => api.get(`/doctor/patients/${patientId}/clinical-analysis`);

/** @returns {Promise<Array<{ link_id: string, patient_id: string, patient_name: string, patient_email: string, status: string, created_at: string }>>} */
export const fetchLinkRequestsApi = () => api.get("/doctor/link-requests");

/** @returns {Promise<{ status: string, link_id: string, link_status: string }>} */
export const respondLinkRequestApi = (linkId, decision) =>
  api.post(`/doctor/link-requests/${linkId}/respond`, { status: decision });

/** @returns {Promise<{
 *   total_patients: number, total_predictions: number, avg_combined_score: number,
 *   high_risk_count: number, moderate_risk_count: number, low_risk_count: number
 * }>} */
export const fetchDoctorAnalyticsApi = () => api.get("/doctor/analytics");
