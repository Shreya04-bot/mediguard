# MediGuard AI — API Documentation

**81 endpoints**, generated from the live FastAPI OpenAPI schema
(`app.openapi()`) at `/api/v1/*` — this is not hand-transcribed and will
go stale if routes change without re-running the generation command below.
For the always-current, interactive version with request/response
schemas, run the backend and visit:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Raw OpenAPI JSON: `http://localhost:8000/openapi.json`

Base URL for all paths below: `http://localhost:8000` (dev) — every path
already includes its `/api/v1/...` prefix.

## Authentication

Endpoints marked "Auth required: Yes" need a Bearer JWT:
```
Authorization: Bearer <access_token>
```
Obtain one via `POST /api/v1/auth/login`. Role-gated endpoints (admin-only,
doctor-only, or role-scoped like Appointments) additionally check the
authenticated user's role — a valid token for the wrong role gets `403
Forbidden`, no token gets `401 Unauthorized`. See `PROJECT_FIX_CHECKLIST.md`
for which endpoints are admin-gated (e.g. `/predict/train`, `/mlops/*`).

Appointments (`/api/v1/appointments/*`) are role-scoped rather than
strictly role-gated: patients see/manage only their own bookings, doctors
see/manage only appointments assigned to them, admins see/manage all —
enforced in `services/appointment_service.py`, not just at the route layer.

An unversioned alias `/api/ai/*` and `/api/appointments/*` also exist
(`include_in_schema=False`, so they don't appear in the generated tables
below, but they're the same handlers under `/api/v1/...`).

## Regenerate this document

```bash
cd backend
python -c "
from main import app
import json
schema = app.openapi()
for path, methods in sorted(schema['paths'].items()):
    for method, detail in methods.items():
        print(method.upper(), path, '-', detail.get('summary', ''))
"
```

---

## Endpoints by area

### AI Gateway

| Method | Path | Summary | Auth required |
|---|---|---|---|
| POST | `/api/v1/ai/chat` | Conversational AI assistant (frontend-facing contract) | Yes |
| POST | `/api/v1/ai/ocr` | Parse a lab report image/PDF (frontend-facing contract) | Yes |
| POST | `/api/v1/ai/predict` | Run disease risk prediction (frontend-facing contract) | Yes |

### Admin

| Method | Path | Summary | Auth required |
|---|---|---|---|
| GET | `/api/v1/admin/analytics` | Population health analytics for the Admin Analytics page | Yes |
| GET | `/api/v1/admin/audit-logs` | Get administrative and security audit logs | Yes |
| GET | `/api/v1/admin/dashboard-stats` | Real-time platform overview counts for the Admin Dashboard | Yes |
| GET | `/api/v1/admin/ml-models` | ML model versions, accuracy, and usage for the ML Ops Monitor page | Yes |
| GET | `/api/v1/admin/rag-status` | RAG guideline corpus status — real documents vs. built-in fallback | Yes |
| GET | `/api/v1/admin/users` | List system users with optional role filtering | Yes |
| GET | `/api/v1/admin/verification-queue` | Get pending doctor verification requests | Yes |
| POST | `/api/v1/admin/invite` | Invite new administrator | Yes |
| POST | `/api/v1/admin/verification/{doctor_id}` | Approve or reject doctor account | Yes |
| PUT | `/api/v1/admin/users/{user_id}/status` | Activate or deactivate a user account | Yes |

### Agents

| Method | Path | Summary | Auth required |
|---|---|---|---|
| POST | `/api/v1/agents/analyse` | Run multi-agent clinical analysis | Yes |

### Appointments

| Method | Path | Summary | Auth required |
|---|---|---|---|
| DELETE | `/api/v1/appointments/{appointment_id}` | Cancel an appointment (shortcut for PATCH status=cancelled) | Yes |
| GET | `/api/v1/appointments/` | List appointments (role-scoped: own for patient/doctor, all for admin) | Yes |
| GET | `/api/v1/appointments/doctors` | List doctors available for booking | Yes |
| GET | `/api/v1/appointments/doctors/{doctor_id}/schedule` | Doctor's booked schedule for a date (doctor/admin only) | Yes |
| GET | `/api/v1/appointments/doctors/{doctor_id}/slots` | Get a doctor's available slots for a date | Yes |
| GET | `/api/v1/appointments/{appointment_id}` | Get a single appointment | Yes |
| PATCH | `/api/v1/appointments/{appointment_id}` | Update appointment status (confirm/reject/cancel/complete) | Yes |
| POST | `/api/v1/appointments/` | Book an appointment (patient only) | Yes |

### Auth

| Method | Path | Summary | Auth required |
|---|---|---|---|
| GET | `/api/v1/auth/me` | Get current authenticated user info | Yes |
| POST | `/api/v1/auth/login` | Sign in with email and password | No |
| POST | `/api/v1/auth/logout` | Invalidate the current session | Yes |
| POST | `/api/v1/auth/password-reset/reset` | Reset password using a verified token | No |
| POST | `/api/v1/auth/password-reset/send-otp` | Send password reset code | No |
| POST | `/api/v1/auth/password-reset/verify-otp` | Verify password reset code | No |
| POST | `/api/v1/auth/refresh` | Exchange a refresh token for a new access token | No |
| POST | `/api/v1/auth/register` | Register patient or doctor account | No |
| POST | `/api/v1/auth/register/send-otp` | Send email verification code before registration | No |
| POST | `/api/v1/auth/register/verify-otp` | Verify registration email code | No |

### Doctor

| Method | Path | Summary | Auth required |
|---|---|---|---|
| GET | `/api/v1/doctor/analytics` | Get doctor cohort risk analytics | Yes |
| GET | `/api/v1/doctor/link-requests` | List connection requests from patients | Yes |
| GET | `/api/v1/doctor/patients` | List linked patients (requires verified doctor) | Yes |
| GET | `/api/v1/doctor/patients/{patient_id}` | View detailed patient records & prediction history | Yes |
| GET | `/api/v1/doctor/patients/{patient_id}/clinical-analysis` | Run LangGraph multi-agent clinical analysis for a linked patient | Yes |
| GET | `/api/v1/doctor/patients/{patient_id}/family` | View a linked patient's family risk cluster (read-only) | Yes |
| GET | `/api/v1/doctor/patients/{patient_id}/timeline` | View a linked patient's chronological health timeline | Yes |
| GET | `/api/v1/doctor/profile` | Get doctor profile | Yes |
| GET | `/api/v1/doctor/status` | Check doctor verification status | Yes |
| POST | `/api/v1/doctor/link-requests/{link_id}/respond` | Accept or reject a patient link request | Yes |
| PUT | `/api/v1/doctor/profile` | Update doctor profile | Yes |

### Features & Ayurveda

| Method | Path | Summary | Auth required |
|---|---|---|---|
| GET | `/api/v1/features/ayurveda/prakriti/questions` | A2: Get Prakriti questionnaire | No |
| GET | `/api/v1/features/family` | F6: List all family groups | No |
| GET | `/api/v1/features/family/{family_id}` | F6: Get family risk dashboard | No |
| GET | `/api/v1/features/heatmap` | F2: UP district-level risk heatmap data | No |
| POST | `/api/v1/features/ayurveda/agent` | A5: Run Ayurvedic AI agent (LangGraph node) | No |
| POST | `/api/v1/features/ayurveda/diet` | A1: Personalised Ayurvedic diet plan | No |
| POST | `/api/v1/features/ayurveda/herbs` | A3: Evidence-based herbal remedy recommendations | No |
| POST | `/api/v1/features/ayurveda/prakriti/score` | A2: Score Prakriti questionnaire | No |
| POST | `/api/v1/features/ayurveda/yoga` | A4: Personalised yoga & pranayama weekly plan | No |
| POST | `/api/v1/features/family/create` | F6: Create a new family group | No |
| POST | `/api/v1/features/family/member` | F6: Add a family member's risk profile | No |
| POST | `/api/v1/features/heatmap/record` | F2: Record a prediction for district aggregation | No |
| POST | `/api/v1/features/ocr/autofill` | F5: OCR lab report → auto-fill patient fields | No |
| POST | `/api/v1/features/report/pdf` | F4: Generate bilingual branded health report PDF | No |
| POST | `/api/v1/features/symptoms/map` | F3: Hindi vernacular symptom → clinical label mapping | No |
| POST | `/api/v1/features/timeline` | F1: 5/10/20-year comorbidity timeline simulation | No |

### Health

| Method | Path | Summary | Auth required |
|---|---|---|---|
| GET | `/api/v1/health/` | System health check | No |

### MLOps

| Method | Path | Summary | Auth required |
|---|---|---|---|
| GET | `/api/v1/mlops/runs` | List recent MLflow experiment runs | Yes |
| POST | `/api/v1/mlops/drift` | Run drift detection | Yes |

### Notifications

| Method | Path | Summary | Auth required |
|---|---|---|---|
| GET | `/api/v1/notifications` | Get current user's notifications | Yes |
| PATCH | `/api/v1/notifications/read-all` | Mark every notification as read for the current user | Yes |
| PATCH | `/api/v1/notifications/{notification_id}/read` | Mark a single notification as read | Yes |

### Patient

| Method | Path | Summary | Auth required |
|---|---|---|---|
| DELETE | `/api/v1/patient/family/member/{member_id}` | Remove a family member | Yes |
| GET | `/api/v1/patient/doctors` | Get verified doctors list available to link | Yes |
| GET | `/api/v1/patient/family` | Get patient's family risk cluster dashboard | Yes |
| GET | `/api/v1/patient/health-score` | Get patient's computed vitality index from their latest prediction | Yes |
| GET | `/api/v1/patient/history` | Get patient prediction history | Yes |
| GET | `/api/v1/patient/profile` | Get patient profile | Yes |
| GET | `/api/v1/patient/reports` | Get patient medical reports | Yes |
| GET | `/api/v1/patient/timeline` | Get patient's chronological health timeline (predictions + report uploads) | Yes |
| POST | `/api/v1/patient/family/member` | Add a family member's risk profile | Yes |
| POST | `/api/v1/patient/link-request` | Request connection with a doctor | Yes |
| PUT | `/api/v1/patient/profile` | Update patient profile | Yes |

### Prediction

| Method | Path | Summary | Auth required |
|---|---|---|---|
| POST | `/api/v1/predict/` | Joint disease risk prediction | Yes |
| POST | `/api/v1/predict/train` | Retrain model on real healthcare datasets | Yes |

### Reports

| Method | Path | Summary | Auth required |
|---|---|---|---|
| POST | `/api/v1/reports/upload` | Upload medical report PDF/image | Yes |

### Voice

| Method | Path | Summary | Auth required |
|---|---|---|---|
| POST | `/api/v1/voice/transcribe` | Transcribe voice input | No |
| POST | `/api/v1/voice/tts` | Text-to-speech synthesis | No |
