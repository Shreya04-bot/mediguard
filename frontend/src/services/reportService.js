import api from "./api";

/**
 * OCR lab report parsing service.
 *
 * ------------------------------------------------------------------
 * POST /ai/ocr
 * ------------------------------------------------------------------
 * Request body:
 *   {
 *     imageBase64: string,   // data: URL or raw base64 of the scanned report
 *     mimeType: string       // e.g. "image/png", "image/jpeg", "application/pdf"
 *   }
 *
 * Response 200:
 *   {
 *     reportType: string,               // e.g. "Comprehensive Metabolic Panel"
 *     labName: string,
 *     date: string,                     // as printed on the report
 *     biomarkers: Array<{
 *       name: string,
 *       value: number | string,
 *       unit: string,
 *       range: string,                  // reference range, e.g. "70-99"
 *       status: "Normal" | "Low" | "High"
 *     }>,
 *     aiSummary: string,
 *     actionablePlan: string[]
 *   }
 *
 * Validation rules:
 *   - imageBase64 max size ~20MB after decoding
 *   - mimeType must be one of image/png, image/jpeg, application/pdf
 *
 * Error responses:
 *   400 { error: "Unsupported file type" }
 *   413 { error: "File exceeds 20MB limit" }
 *   422 { error: "Could not extract legible biomarker data from this image" }
 *   503 { error: "OCR engine temporarily unavailable" }
 */

/** @typedef {{ name: string, value: number|string, unit: string, range: string, status: "Normal"|"Low"|"High" }} Biomarker */
/** @typedef {{ reportType: string, labName: string, date: string, biomarkers: Biomarker[], aiSummary: string, actionablePlan: string[] }} OcrReportResult */

/**
 * @param {string} imageBase64
 * @param {string} mimeType
 * @returns {Promise<OcrReportResult>}
 */
export const parseOcrReportApi = (imageBase64, mimeType) => api.post("/ai/ocr", { imageBase64, mimeType });
