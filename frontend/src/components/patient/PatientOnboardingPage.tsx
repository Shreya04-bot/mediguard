import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, HeartPulse, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import PatientHealthProfileForm, { type PatientHealthProfileFormHandle } from "@/components/patient/PatientHealthProfileForm";
import { useAuth } from "@/context/AuthContext";

/**
 * Shown once, right after a new patient account is created (see
 * RegisterPage's onVerifyOtp -> navigate("/onboarding/patient")).
 * Collects everything the AI risk model, dashboard, and doctor
 * patient-detail view need but that account creation itself doesn't
 * (DOB, height/weight, lifestyle factors, allergies, medications...).
 * Uses the exact same form/endpoint as the profile page, so anything
 * skipped here can be completed later from Profile without duplicating
 * logic.
 */
export default function PatientOnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const formRef = useRef<PatientHealthProfileFormHandle>(null);
  const [finishing, setFinishing] = useState(false);

  const handleFinish = async () => {
    setFinishing(true);
    try {
      const ok = await formRef.current?.save();
      if (ok) {
        navigate("/dashboard/patient", { replace: true });
      }
    } finally {
      setFinishing(false);
    }
  };

  const handleSkip = () => {
    // Never force it — an incomplete profile just means degraded
    // pre-fill/dashboards until the person finishes it from Profile later.
    navigate("/dashboard/patient", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <motion.div className="mx-auto w-full max-w-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="size-9 rounded-xl gradient-primary flex items-center justify-center">
              <Shield className="size-4 text-white" />
            </div>
            <span className="font-bold text-lg">MediGuard AI</span>
          </div>
          <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <HeartPulse className="size-6 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-2">
            {user?.name ? `Welcome, ${user.name.split(" ")[0]}!` : "Complete your health profile"}
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            A few quick details let MediGuard AI pre-fill your risk assessments, calculate your BMI, and give your
            doctor accurate information — instead of asking again every time.
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <PatientHealthProfileForm ref={formRef} hideSaveButton />
        </div>

        <div className="flex items-center justify-between mt-6">
          <Button variant="ghost" onClick={handleSkip} disabled={finishing} className="text-muted-foreground">
            Skip for now
          </Button>
          <Button onClick={handleFinish} disabled={finishing} className="gap-2 gradient-primary text-white border-0 hover:opacity-90 px-6">
            {finishing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Finish & Go to Dashboard
          </Button>
        </div>
      </motion.div>
    </div>
  );
}