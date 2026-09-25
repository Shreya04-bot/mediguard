import api from "./api";

/**
 * Auth service — handles login, registration, session restore, and logout.
 *
 * ------------------------------------------------------------------
 * POST /auth/login
 * ------------------------------------------------------------------
 * Request body:
 *   { email: string, password: string, role: "admin" | "doctor" | "patient" }
 *
 * Response 200:
 *   {
 *     token: string,               // JWT, sent back as Authorization: Bearer <token>
 *     user: {
 *       id: string,
 *       name: string,
 *       email: string,
 *       role: "admin" | "doctor" | "patient",
 *       avatar?: string,
 *       specialty?: string         // doctors only
 *     }
 *   }
 *
 * Validation rules:
 *   - email must be a valid, registered email address
 *   - password must match the stored hash for that account
 *   - role must match the account's actual role (a patient account
 *     logging in via the doctor portal should be rejected)
 *
 * Error responses:
 *   400 { error: "email and password are required" }
 *   401 { error: "Invalid email or password" }
 *   403 { error: "This account is pending admin verification", code: "DOCTOR_PENDING_APPROVAL" }
 *   403 { error: "This account's role does not match the requested portal" }
 *
 * ------------------------------------------------------------------
 * POST /auth/register
 * ------------------------------------------------------------------
 * Request body:
 *   {
 *     name: string,
 *     email: string,
 *     password: string,
 *     role: UserRole,               // "patient" | "doctor" — admin self-registration is never offered client-side and must also be rejected server-side; admin accounts are invite-only
 *     verificationToken: string,    // from POST /auth/register/verify-otp — proves the email was OTP-verified
 *     // doctor-only fields:
 *     medicalLicenseNumber?: string,
 *     hospitalAffiliation?: string
 *   }
 *
 * Response 201 (patient):
 *   { token: string, user: { id, name, email, role: "patient" } }
 *
 * Response 202 (doctor — pending verification, no token issued yet):
 *   { pending: true, message: "Registration received. An admin will verify your license before you can log in." }
 *
 * Validation rules:
 *   - email must be unique and a valid address
 *   - password minimum 8 characters
 *   - doctor registrations require medicalLicenseNumber and hospitalAffiliation
 *   - verificationToken must be a valid, unexpired token issued for this email
 *
 * Error responses:
 *   400 { error: "email already registered" }
 *   400 { error: "medicalLicenseNumber is required for doctor accounts" }
 *   401 { error: "Email verification required or expired", code: "OTP_VERIFICATION_REQUIRED" }
 *   422 { error: "password does not meet minimum requirements" }
 *
 * ------------------------------------------------------------------
 * POST /auth/register/send-otp
 * ------------------------------------------------------------------
 * Sends a 6-digit one-time code to the given email to verify ownership
 * before an account is created. Rate limited per email/IP.
 *
 * Request body: { email: string }
 * Response 200: { message: "Verification code sent", expiresInSeconds: 300 }
 * Error responses:
 *   400 { error: "email already registered" }
 *   429 { error: "Too many attempts. Try again later.", code: "OTP_RATE_LIMITED", retryAfterSeconds: number }
 *
 * ------------------------------------------------------------------
 * POST /auth/register/verify-otp
 * ------------------------------------------------------------------
 * Request body: { email: string, otp: string }
 * Response 200: { verificationToken: string, expiresInSeconds: 900 }
 * Error responses:
 *   400 { error: "Incorrect code", code: "OTP_INCORRECT", attemptsRemaining: number }
 *   410 { error: "Code expired, request a new one", code: "OTP_EXPIRED" }
 *
 * ------------------------------------------------------------------
 * POST /auth/password-reset/send-otp
 * ------------------------------------------------------------------
 * Request body: { email: string }
 * Response 200: { message: "Verification code sent", expiresInSeconds: 300 }
 * Error responses:
 *   404 { error: "No account found for this email" }
 *   429 { error: "Too many attempts. Try again later.", code: "OTP_RATE_LIMITED", retryAfterSeconds: number }
 *
 * ------------------------------------------------------------------
 * POST /auth/password-reset/verify-otp
 * ------------------------------------------------------------------
 * Request body: { email: string, otp: string }
 * Response 200: { resetToken: string, expiresInSeconds: 900 }
 * Error responses:
 *   400 { error: "Incorrect code", code: "OTP_INCORRECT", attemptsRemaining: number }
 *   410 { error: "Code expired, request a new one", code: "OTP_EXPIRED" }
 *
 * ------------------------------------------------------------------
 * POST /auth/password-reset/reset
 * ------------------------------------------------------------------
 * Request body: { email: string, resetToken: string, newPassword: string }
 * Response 200: { message: "Password updated" }
 * Error responses:
 *   401 { error: "Reset token invalid or expired", code: "RESET_TOKEN_INVALID" }
 *   422 { error: "password does not meet minimum requirements" }
 *
 * ------------------------------------------------------------------
 * GET /auth/me
 * ------------------------------------------------------------------
 * Restores a session from the stored token (called once on app load).
 * Request: no body; relies on the Authorization header set by lib/axios.js.
 *
 * Response 200: { user: { id, name, email, role, avatar?, specialty? } }
 * Error responses:
 *   401 { error: "Session expired or invalid" }
 *
 * ------------------------------------------------------------------
 * POST /auth/logout
 * ------------------------------------------------------------------
 * Invalidates the current token server-side (e.g. removes it from an
 * allow-list or blocklists it). Request/response both have no body
 * beyond the Authorization header. Client-side logout should proceed
 * (clear local token/user) even if this call fails.
 */

/** @typedef {"admin"|"doctor"|"patient"} UserRole */
/** @typedef {"female"|"male"|"neutral"} Gender */
/** @typedef {{ id: string, name: string, email: string, role: UserRole, avatar?: string, specialty?: string, gender?: Gender|null, avatar_key?: string|null, profile_photo_url?: string|null }} AuthUser */

/**
 * @param {string} email
 * @param {string} password
 * @param {UserRole} role
 * @returns {Promise<{ token: string, user: AuthUser }>}
 */
export const loginApi = (email, password, role) => api.post("/auth/login", { email, password, role });

/**
 * @param {{ name: string, email: string, password: string, role: "patient"|"doctor", verificationToken: string, medicalLicenseNumber?: string, hospitalAffiliation?: string, gender?: Gender }} data
 * @returns {Promise<{ token: string, user: AuthUser } | { pending: true, message: string }>}
 */
export const registerApi = (data) => api.post("/auth/register", data);

/** @returns {Promise<{ user: AuthUser }>} */
export const getCurrentUserApi = () => api.get("/auth/me");

/** @returns {Promise<void>} */
export const logoutApi = () => api.post("/auth/logout");

// ------------------------------------------------------------------
// Profile — name / gender / avatar. Shared across all three roles;
// role-specific clinical fields still go through patientService /
// doctorService's existing profile endpoints.
// ------------------------------------------------------------------

/**
 * @param {{ name?: string, gender?: Gender, avatar_key?: string, clear_avatar_key?: boolean }} patch
 * @returns {Promise<{ user: AuthUser }>}
 */
export const updateProfileApi = (patch) => api.patch("/auth/profile", patch);

/**
 * @param {File} file
 * @returns {Promise<{ user: AuthUser }>}
 */
export const uploadProfilePhotoApi = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/auth/profile/photo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

/** @returns {Promise<{ user: AuthUser }>} */
export const deleteProfilePhotoApi = () => api.delete("/auth/profile/photo");

// ------------------------------------------------------------------
// OTP verification — email ownership check before an account is
// created, and identity check before a password can be reset.
// ------------------------------------------------------------------

/**
 * Sends a 6-digit code to `email` to verify it before registration.
 * @param {string} email
 * @returns {Promise<{ message: string, expiresInSeconds: number }>}
 */
export const sendRegistrationOtpApi = (email) => api.post("/auth/register/send-otp", { email });

/**
 * @param {string} email
 * @param {string} otp
 * @returns {Promise<{ verificationToken: string, expiresInSeconds: number }>}
 */
export const verifyRegistrationOtpApi = (email, otp) =>
  api.post("/auth/register/verify-otp", { email, otp });

/**
 * Sends a 6-digit code to `email` to confirm identity before allowing
 * a password reset.
 * @param {string} email
 * @returns {Promise<{ message: string, expiresInSeconds: number }>}
 */
export const sendPasswordResetOtpApi = (email) => api.post("/auth/password-reset/send-otp", { email });

/**
 * @param {string} email
 * @param {string} otp
 * @returns {Promise<{ resetToken: string, expiresInSeconds: number }>}
 */
export const verifyPasswordResetOtpApi = (email, otp) =>
  api.post("/auth/password-reset/verify-otp", { email, otp });

/**
 * @param {string} email
 * @param {string} resetToken
 * @param {string} newPassword
 * @returns {Promise<{ message: string }>}
 */
export const resetPasswordApi = (email, resetToken, newPassword) =>
  api.post("/auth/password-reset/reset", { email, resetToken, newPassword });

// ------------------------------------------------------------------
// Admin invites — an existing admin invites a new admin by email
// (POST /admin/invite, in adminService.js). The invitee gets an
// emailed link to /accept-invite?token=... which uses these two.
// ------------------------------------------------------------------

/**
 * Checks whether an invite token is still valid (not expired/used),
 * and returns the invited email so the accept form can show it.
 * @param {string} token
 * @returns {Promise<{ valid: boolean, email?: string, role?: "admin" }>}
 */
export const validateInviteApi = (token) => api.get(`/auth/invite/${token}`);

/**
 * Completes registration from a valid invite and signs the new
 * account in immediately, same response shape as loginApi/registerApi.
 * @param {{ token: string, name: string, password: string }} data
 * @returns {Promise<{ token: string, user: AuthUser }>}
 */
export const acceptInviteApi = (data) => api.post("/auth/invite/accept", data);