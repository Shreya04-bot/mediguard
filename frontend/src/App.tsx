import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Spinner } from "@/components/ui/spinner";
import { Toaster } from "@/components/ui/sonner";

import AyurvedaAgentPage from "@/pages/ayurveda/AyurvedaAgentPage";

// Pages
const LandingPage = lazy(() => import("@/pages/landing/LandingPage"));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() =>
  import("@/pages/auth/ForgotPasswordPage")
);

// =========================================================
// PATIENT
// =========================================================

const PatientDashboard = lazy(() =>
  import("@/pages/patient/PatientDashboard")
);

const PatientPredictPage = lazy(() =>
  import("@/pages/patient/PatientPredictPage").then((module) => ({
    default: module.PatientPredictPage,
  }))
);

const PatientReportsPage = lazy(() =>
  import("@/pages/patient/PatientReportsPage").then((module) => ({
    default: module.PatientReportsPage,
  }))
);

const PatientTimelinePage = lazy(() =>
  import("@/pages/patient/PatientTimelinePage").then((module) => ({
    default: module.PatientTimelinePage,
  }))
);

const SymptomChatPage = lazy(() =>
  import("@/pages/patient/SymptomChatPage")
);

const FamilyClusterPage = lazy(() =>
  import("@/pages/patient/FamilyClusterPage")
);

const HealthScorePage = lazy(() =>
  import("@/pages/patient/HealthScorePage").then((module) => ({
    default: module.HealthScorePage,
  }))
);

const VoicePage = lazy(() =>
  import("@/pages/patient/VoicePage").then((module) => ({
    default: module.VoicePage,
  }))
);

const PatientNotificationsPage = lazy(() =>
  import("@/pages/patient/PatientNotificationsPage").then((module) => ({
    default: module.PatientNotificationsPage,
  }))
);

const PatientProfilePage = lazy(() =>
  import("@/pages/patient/PatientProfilePage").then((module) => ({
    default: module.PatientProfilePage,
  }))
);

const PatientAppointmentsPage = lazy(() =>
  import("@/pages/patient/PatientAppointmentsPage")
);

const PatientSettingsPage = lazy(() =>
  import("@/pages/patient/PatientSettingsPage").then((module) => ({
    default: module.PatientSettingsPage,
  }))
);

// =========================================================
// DOCTOR
// =========================================================

const DoctorDashboard = lazy(() =>
  import("@/pages/doctor/DoctorDashboard")
);

const DoctorPatientsPage = lazy(() =>
  import("@/pages/doctor/DoctorPatientsPage")
);

const DoctorPatientDetailPage = lazy(() =>
  import("@/pages/doctor/DoctorPatientDetailPage")
);

const DoctorPredictionPage = lazy(() =>
  import("@/pages/doctor/DoctorPredictionPage").then((module) => ({
    default: module.DoctorPredictionPage,
  }))
);

const OcrAnalysisPage = lazy(() =>
  import("@/pages/doctor/OcrAnalysisPage").then((module) => ({
    default: module.OcrAnalysisPage,
  }))
);

const ClinicalAssistantPage = lazy(() =>
  import("@/pages/doctor/ClinicalAssistantPage").then((module) => ({
    default: module.ClinicalAssistantPage,
  }))
);

const DoctorTimelinePage = lazy(() =>
  import("@/pages/doctor/TimelinePage").then((module) => ({
    default: module.TimelinePage,
  }))
);

const DoctorFamilyClusterPage = lazy(() =>
  import("@/pages/doctor/FamilyClusterPage").then((module) => ({
    default: module.FamilyClusterPage,
  }))
);

const RiskAnalyticsPage = lazy(() =>
  import("@/pages/doctor/RiskAnalyticsPage").then((module) => ({
    default: module.RiskAnalyticsPage,
  }))
);

const DoctorProfilePage = lazy(() =>
  import("@/pages/doctor/DoctorProfilePage").then((module) => ({
    default: module.DoctorProfilePage,
  }))
);

const DoctorAppointmentsPage = lazy(() =>
  import("@/pages/doctor/DoctorAppointmentsPage")
);

const DoctorNotificationsPage = lazy(() =>
  import("@/pages/doctor/DoctorNotificationsPage").then((module) => ({
    default: module.DoctorNotificationsPage,
  }))
);

const DoctorSettingsPage = lazy(() =>
  import("@/pages/doctor/DoctorSettingsPage").then((module) => ({
    default: module.DoctorSettingsPage,
  }))
);

// =========================================================
// ADMIN
// =========================================================

const AdminDashboard = lazy(() =>
  import("@/pages/admin/AdminDashboard")
);

const ManageDoctorsPage = lazy(() =>
  import("@/pages/admin/ManageDoctorsPage")
);

const AdminAppointmentsPage = lazy(() =>
  import("@/pages/admin/AdminAppointmentsPage")
);

const MLOpsPage = lazy(() =>
  import("@/pages/admin/MLOpsPage")
);

const SystemLogsPage = lazy(() =>
  import("@/pages/admin/SystemLogsPage")
);

const PatientsListPage = lazy(() =>
  import("@/pages/admin/PatientsList").then((module) => ({
    default: module.PatientsList,
  }))
);

const AnalyticsPage = lazy(() =>
  import("@/pages/admin/AnalyticsPage").then((module) => ({
    default: module.AnalyticsPage,
  }))
);

const SettingsPage = lazy(() =>
  import("@/pages/admin/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  }))
);

const AdminProfilePage = lazy(() =>
  import("@/pages/admin/ProfilePage").then((module) => ({
    default: module.ProfilePage,
  }))
);

const AdminNotificationsPage = lazy(() =>
  import("@/pages/admin/AdminNotificationsPage").then((module) => ({
    default: module.AdminNotificationsPage,
  }))
);

// =========================================================
// AYURVEDA
// =========================================================

const AyurvedaDashboard = lazy(() =>
  import("@/pages/ayurveda/AyurvedaDashboard")
);

const PrakritiQuizPage = lazy(() =>
  import("@/pages/ayurveda/PrakritiQuizPage")
);

const DietPlanPage = lazy(() =>
  import("@/pages/ayurveda/DietPlanPage").then((module) => ({
    default: module.DietPlanPage,
  }))
);

const YogaPage = lazy(() =>
  import("@/pages/ayurveda/YogaPage").then((module) => ({
    default: module.YogaPage,
  }))
);

const HerbalRecommendationsPage = lazy(() =>
  import("@/pages/ayurveda/HerbalRecommendationsPage").then((module) => ({
    default: module.HerbalRecommendationsPage,
  }))
);

const WellnessHistoryPage = lazy(() =>
  import("@/pages/ayurveda/WellnessHistoryPage").then((module) => ({
    default: module.WellnessHistoryPage,
  }))
);

// IMPORTANT:
// AyurvedaAgentPage is imported ONLY here.
// Do NOT add a normal import at the top of this file.
// =========================================================
// PAGE LOADER
// =========================================================

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-48">
      <Spinner className="size-6 text-primary" />
    </div>
  );
}

// =========================================================
// ROOT REDIRECT
// =========================================================

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    return <Navigate to={`/dashboard/${user.role}`} replace />;
  }

  return <Navigate to="/landing" replace />;
}

// =========================================================
// APP
// =========================================================

export function App() {
  return (
    <ThemeProvider
      defaultTheme="light"
      storageKey="mediguard-theme"
    >
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>

                  {/* =================================================
                      ROOT / AUTH
                  ================================================= */}

                  <Route
                    path="/"
                    element={<RootRedirect />}
                  />

                  <Route
                    path="/landing"
                    element={<LandingPage />}
                  />

                  <Route
                    path="/login"
                    element={<LoginPage />}
                  />

                  <Route
                    path="/register"
                    element={<RegisterPage />}
                  />

                  <Route
                    path="/forgot-password"
                    element={<ForgotPasswordPage />}
                  />

                  {/* =================================================
                      PATIENT ROUTES
                  ================================================= */}

                  <Route
                    path="/dashboard/patient"
                    element={
                      <ProtectedRoute allowedRoles={["patient"]}>
                        <DashboardLayout>
                          <PatientDashboard />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/patient/predict"
                    element={
                      <ProtectedRoute allowedRoles={["patient"]}>
                        <DashboardLayout>
                          <PatientPredictPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/patient/reports"
                    element={
                      <ProtectedRoute allowedRoles={["patient"]}>
                        <DashboardLayout>
                          <PatientReportsPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/patient/timeline"
                    element={
                      <ProtectedRoute allowedRoles={["patient"]}>
                        <DashboardLayout>
                          <PatientTimelinePage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/patient/chat"
                    element={
                      <ProtectedRoute allowedRoles={["patient"]}>
                        <DashboardLayout>
                          <SymptomChatPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/patient/family"
                    element={
                      <ProtectedRoute allowedRoles={["patient"]}>
                        <DashboardLayout>
                          <FamilyClusterPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/patient/profile"
                    element={
                      <ProtectedRoute allowedRoles={["patient"]}>
                        <DashboardLayout>
                          <PatientProfilePage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/patient/notifications"
                    element={
                      <ProtectedRoute allowedRoles={["patient"]}>
                        <DashboardLayout>
                          <PatientNotificationsPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/patient/voice"
                    element={
                      <ProtectedRoute allowedRoles={["patient"]}>
                        <DashboardLayout>
                          <VoicePage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/patient/health-score"
                    element={
                      <ProtectedRoute allowedRoles={["patient"]}>
                        <DashboardLayout>
                          <HealthScorePage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/patient/appointments"
                    element={
                      <ProtectedRoute allowedRoles={["patient"]}>
                        <DashboardLayout>
                          <PatientAppointmentsPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/patient/settings"
                    element={
                      <ProtectedRoute allowedRoles={["patient"]}>
                        <DashboardLayout>
                          <PatientSettingsPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* =================================================
                      DOCTOR ROUTES
                  ================================================= */}

                  <Route
                    path="/dashboard/doctor"
                    element={
                      <ProtectedRoute allowedRoles={["doctor"]}>
                        <DashboardLayout>
                          <DoctorDashboard />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/doctor/patients"
                    element={
                      <ProtectedRoute allowedRoles={["doctor"]}>
                        <DashboardLayout>
                          <DoctorPatientsPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/doctor/patients/:patientId"
                    element={
                      <ProtectedRoute allowedRoles={["doctor"]}>
                        <DashboardLayout>
                          <DoctorPatientDetailPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/doctor/assistant"
                    element={
                      <ProtectedRoute allowedRoles={["doctor"]}>
                        <DashboardLayout>
                          <ClinicalAssistantPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/doctor/predictions"
                    element={
                      <ProtectedRoute allowedRoles={["doctor"]}>
                        <DashboardLayout>
                          <DoctorPredictionPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/doctor/reports"
                    element={
                      <ProtectedRoute allowedRoles={["doctor"]}>
                        <DashboardLayout>
                          <OcrAnalysisPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/doctor/profile"
                    element={
                      <ProtectedRoute allowedRoles={["doctor"]}>
                        <DashboardLayout>
                          <DoctorProfilePage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/doctor/appointments"
                    element={
                      <ProtectedRoute allowedRoles={["doctor"]}>
                        <DashboardLayout>
                          <DoctorAppointmentsPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/doctor/analytics"
                    element={
                      <ProtectedRoute allowedRoles={["doctor"]}>
                        <DashboardLayout>
                          <RiskAnalyticsPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/doctor/timeline"
                    element={
                      <ProtectedRoute allowedRoles={["doctor"]}>
                        <DashboardLayout>
                          <DoctorTimelinePage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/doctor/family-cluster"
                    element={
                      <ProtectedRoute allowedRoles={["doctor"]}>
                        <DashboardLayout>
                          <DoctorFamilyClusterPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/doctor/notifications"
                    element={
                      <ProtectedRoute allowedRoles={["doctor"]}>
                        <DashboardLayout>
                          <DoctorNotificationsPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/doctor/settings"
                    element={
                      <ProtectedRoute allowedRoles={["doctor"]}>
                        <DashboardLayout>
                          <DoctorSettingsPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* =================================================
                      ADMIN ROUTES
                  ================================================= */}

                  <Route
                    path="/dashboard/admin"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <DashboardLayout>
                          <AdminDashboard />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/admin/doctors"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <DashboardLayout>
                          <ManageDoctorsPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/admin/patients"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <DashboardLayout>
                          <PatientsListPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/admin/appointments"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <DashboardLayout>
                          <AdminAppointmentsPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/admin/mlops"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <DashboardLayout>
                          <MLOpsPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/admin/logs"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <DashboardLayout>
                          <SystemLogsPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/admin/analytics"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <DashboardLayout>
                          <AnalyticsPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/admin/trends"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <DashboardLayout>
                          <AnalyticsPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/admin/settings"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <DashboardLayout>
                          <SettingsPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/admin/profile"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <DashboardLayout>
                          <AdminProfilePage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard/admin/notifications"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <DashboardLayout>
                          <AdminNotificationsPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* =================================================
                      AYURVEDA ROUTES
                  ================================================= */}

                  <Route
                    path="/ayurveda"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <AyurvedaDashboard />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/ayurveda/quiz"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <PrakritiQuizPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/ayurveda/diet"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <DietPlanPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/ayurveda/yoga"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <YogaPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/ayurveda/herbs"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <HerbalRecommendationsPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/ayurveda/agent"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <AyurvedaAgentPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/ayurveda/history"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <WellnessHistoryPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* =================================================
                      LEGACY REDIRECTS
                  ================================================= */}

                  <Route
                    path="/patient"
                    element={
                      <Navigate
                        to="/dashboard/patient"
                        replace
                      />
                    }
                  />

                  <Route
                    path="/patient/:slug"
                    element={
                      <Navigate
                        to="/dashboard/patient"
                        replace
                      />
                    }
                  />

                  <Route
                    path="/doctor"
                    element={
                      <Navigate
                        to="/dashboard/doctor"
                        replace
                      />
                    }
                  />

                  <Route
                    path="/doctor/:slug"
                    element={
                      <Navigate
                        to="/dashboard/doctor"
                        replace
                      />
                    }
                  />

                  <Route
                    path="/admin"
                    element={
                      <Navigate
                        to="/dashboard/admin"
                        replace
                      />
                    }
                  />

                  <Route
                    path="/admin/:slug"
                    element={
                      <Navigate
                        to="/dashboard/admin"
                        replace
                      />
                    }
                  />

                  {/* =================================================
                      FALLBACK
                  ================================================= */}

                  <Route
                    path="*"
                    element={<Navigate to="/" replace />}
                  />

                </Routes>
              </Suspense>

              <Toaster
                richColors
                position="top-right"
              />
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;