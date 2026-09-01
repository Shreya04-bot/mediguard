import api from "./api";

/**
 * Appointment scheduling service — real backend at
 * backend/api/routes/appointment_routes.py, prefix /api/v1/appointments.
 */

/** @typedef {{
 *   id: string, name: string, specialization: string|null,
 *   hospital_name: string|null, experience_years: number|null
 * }} DoctorSummary */

/** @returns {Promise<DoctorSummary[]>} */
export const fetchAvailableDoctorsApi = () => api.get("/appointments/doctors");

/** @param {string} doctorId @param {string} date - YYYY-MM-DD
 *  @returns {Promise<{ doctor_id: string, date: string, available_slots: string[], clinic_hours: string }>} */
export const fetchAvailableSlotsApi = (doctorId, date) =>
  api.get(`/appointments/doctors/${doctorId}/slots`, { params: { date } });

/** @param {string} doctorId @param {string} date
 *  @returns {Promise<Array>} */
export const fetchDoctorScheduleApi = (doctorId, date) =>
  api.get(`/appointments/doctors/${doctorId}/schedule`, { params: { date } });

/** @typedef {{
 *   id: string, patient_id: string, patient_name: string|null,
 *   doctor_id: string, doctor_name: string|null, doctor_specialization: string|null,
 *   appointment_date: string, start_time: string, end_time: string,
 *   reason: string, status: "pending"|"confirmed"|"rejected"|"cancelled"|"completed",
 *   notes: string|null, cancellation_reason: string|null,
 *   created_at: string, updated_at: string
 * }} Appointment */

/** @param {{ doctor_id: string, appointment_date: string, start_time: string, reason: string }} payload
 *  @returns {Promise<Appointment>} */
export const bookAppointmentApi = (payload) => api.post("/appointments/", payload);

/** @param {{ status?: string, doctor_id?: string, patient_id?: string }} [filters]
 *  @returns {Promise<Appointment[]>} */
export const fetchAppointmentsApi = (filters = {}) => api.get("/appointments/", { params: filters });

/** @param {string} appointmentId @returns {Promise<Appointment>} */
export const fetchAppointmentApi = (appointmentId) => api.get(`/appointments/${appointmentId}`);

/** @param {string} appointmentId @param {{ status: string, notes?: string, cancellation_reason?: string }} payload
 *  @returns {Promise<Appointment>} */
export const updateAppointmentStatusApi = (appointmentId, payload) =>
  api.patch(`/appointments/${appointmentId}`, payload);

/** @param {string} appointmentId @returns {Promise<Appointment>} */
export const cancelAppointmentApi = (appointmentId) => api.delete(`/appointments/${appointmentId}`);
