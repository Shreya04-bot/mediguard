import api from "./api";

/**
 * Admin service — platform overview, user management, doctor
 * verification, ML ops, and audit logs. All endpoints require an
 * authenticated admin account.
 */

/** @returns {Promise<{
 *   totalPatients: number, totalDoctors: number, activeDoctors: number,
 *   pendingDoctorVerifications: number, totalPredictions: number, totalReports: number,
 *   monthlyActivity: Array<{ month: string, patients: number, predictions: number, reports: number }>,
 *   diseaseDistribution: Array<{ name: string, count: number, trend: string, change: number }>
 * }>} */
export const fetchAdminDashboardStatsApi = () => api.get("/admin/dashboard-stats");

/** @returns {Promise<{
 *   totalMonitored: number,
 *   diseaseDistribution: Array<{ name: string, count: number }>,
 *   riskDistribution: Array<{ name: string, value: number }>,
 *   monthlyActivity: Array<{ month: string, patients: number, predictions: number, reports: number }>
 * }>} */
export const fetchAdminAnalyticsApi = () => api.get("/admin/analytics");

/** @returns {Promise<{
 *   models: Array<{ id: string, name: string, version: string, status: "Production"|"Staging",
 *     accuracy: number|null, precision: number|null, recall: number|null, aucScore: number|null,
 *     predictions: number, lastUpdated: string|null, source: string }>,
 *   summary: { deployedCount: number, stagingCount: number, totalPredictions: number, avgAccuracy: number|null }
 * }>} */
export const fetchMlModelsApi = () => api.get("/admin/ml-models");

/** @typedef {{
 *   id: string, name: string, email: string, role: string, avatar: string|null,
 *   verification_status: string, is_active: boolean, created_at: string,
 *   doctor_profile: { medical_license: string, hospital_name: string, specialization: string, experience_years: number } | null,
 *   linked_patient_count: number | null,
 *   latest_prediction: { diabetes_risk_level: string, cvd_risk_level: string, combined_score: number, created_at: string } | null
 * }} AdminUserRow */

/** @param {string} [role]
 *  @returns {Promise<AdminUserRow[]>} */
export const fetchUsersApi = (role) => api.get("/admin/users", { params: role ? { role } : {} });

/** @returns {Promise<{ status: string, user_id: string, is_active: boolean }>} */
export const updateUserStatusApi = (userId, isActive) => api.put(`/admin/users/${userId}/status`, { is_active: isActive });

/** @returns {Promise<AdminUserRow[]>} */
export const fetchVerificationQueueApi = () => api.get("/admin/verification-queue");

/** @returns {Promise<{ status: string, doctor_id: string, verification_status: string }>} */
export const verifyDoctorApi = (doctorId, decision) => api.post(`/admin/verification/${doctorId}`, { status: decision });

/**
 * Invites a new administrator by email. Sends an accept-invite link to
 * that address (valid for 7 days); the token is also returned here so
 * it can be copied/shared manually if outbound email isn't configured.
 * @param {string} email
 * @returns {Promise<{ status: string, invitation_id: string, token: string, email: string, expires_at: string }>}
 */
export const inviteAdminApi = (email) => api.post("/admin/invite", { email });

/** @returns {Promise<{
 *   run_id: string, dataset_size: number, psi_score: number, drift_detected: boolean,
 *   feature_drifts: Record<string, number>, recommendation: string
 * }>} */
export const runDriftCheckApi = () => api.post("/mlops/drift");

/** @typedef {{
 *   id: string, action: string, resource: string, user_id: string|null, user_name: string|null,
 *   user_email: string|null, user_role: string|null, details: Record<string, unknown>,
 *   ip_address: string|null, timestamp: string
 * }} AuditLogRow */

/** @param {number} [limit]
 *  @param {string} [action]
 *  @returns {Promise<AuditLogRow[]>} */
export const fetchAuditLogsApi = (limit = 100, action) =>
  api.get("/admin/audit-logs", { params: { limit, ...(action ? { action } : {}) } });