import api from "./api";

/**
 * Disease risk prediction service.
 *
 * ------------------------------------------------------------------
 * POST /ai/predict
 * ------------------------------------------------------------------
 * Request body:
 *   {
 *     diseaseType: string,       // "Type 2 Diabetes" | "Cardiovascular Risk" | "Hypertension"
 *     vitals: {
 *       bloodPressure: string,   // "systolic/diastolic", e.g. "138/88"
 *       glucose: string,         // mg/dL
 *       heartRate: string,       // bpm
 *       bmi: string,
 *       age: string
 *     },
 *     medicalHistory: string[]
 *   }
 *
 * Response 200:
 *   {
 *     riskScore: number,             // 0-100
 *     riskLevel: "Low" | "Moderate" | "High",
 *     primaryFactors: Array<{ label: string, impact: number }>,  // impact is -100..100, relative to the strongest factor shown
 *     recommendations: string[],
 *     preventiveAyurveda?: string[]
 *   }
 *
 * Validation rules:
 *   - diseaseType must be one of the supported assessment types
 *   - vitals values must be numeric where a unit is implied (glucose, heartRate, bmi, age)
 *   - bloodPressure must match "\d{2,3}/\d{2,3}"
 *
 * Error responses:
 *   400 { error: "vitals.glucose must be a number" }
 *   422 { error: "diseaseType is not a supported assessment type" }
 *   503 { error: "Prediction model temporarily unavailable" }
 */

/** @typedef {{ bloodPressure: string, glucose: string, heartRate: string, bmi: string, age: string }} Vitals */
/** @typedef {{ diseaseType: string, vitals: Vitals, medicalHistory: string[] }} PredictionRequest */
/** @typedef {{ riskScore: number, riskLevel: "Low"|"Moderate"|"High", primaryFactors: {label: string, impact: number}[], recommendations: string[], preventiveAyurveda?: string[] }} PredictionResult */

/**
 * @param {PredictionRequest} data
 * @returns {Promise<PredictionResult>}
 */
export const predictRiskApi = (data) => api.post("/ai/predict", data);
