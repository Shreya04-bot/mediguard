import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, ArrowRight, Brain, CalendarDays, ChevronRight, FileText, Heart, Loader2, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatDate, getRiskColor } from "@/lib/utils";
import { fetchHealthScoreApi, fetchPredictionHistoryApi, fetchPatientReportsApi, fetchPatientTimelineApi } from "@/services/patientService";
import { dashboardAssets, normalizeGender } from "@/components/dashboard/dashboardAssets";

export default function PatientDashboard() {
  const { user } = useAuth();
  const [healthScore, setHealthScore] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [reportsCount, setReportsCount] = useState(0);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        const [score, preds, reports, tl] = await Promise.all([
          fetchHealthScoreApi(),
          fetchPredictionHistoryApi(),
          fetchPatientReportsApi(),
          fetchPatientTimelineApi(),
        ]);
        if (!mounted) return;
        setHealthScore(score);
        setPredictions(Array.isArray(preds) ? preds : []);
        setReportsCount(Array.isArray(reports) ? reports.length : 0);
        setTimeline(tl?.items ?? (Array.isArray(tl) ? tl : []));
      } catch (error) {
        console.error("Patient dashboard loading error:", error);
        if (mounted) setHasError(true);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadDashboard();
    return () => { mounted = false; };
  }, []);

  const firstName = user?.name?.split(" ")[0] || "there";

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { title: "Good Morning", emoji: "🌤️" };
    if (hour >= 12 && hour < 17) return { title: "Good Afternoon", emoji: "☀️" };
    if (hour >= 17 && hour < 21) return { title: "Good Evening", emoji: "🌆" };
    return { title: "Good Night", emoji: "🌙" };
  }, []);

  const gender = normalizeGender(user?.gender);
  const heroImage = dashboardAssets.patient.hero[gender];
  const latestPrediction = predictions[0];
  const score = Number(healthScore?.score ?? 0);
  const scoreProgress = Math.min(Math.max(score, 0), 100);

  const scoreColor = useMemo(() => {
    if (healthScore?.score == null) return "text-muted-foreground";
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-amber-500";
    return "text-rose-500";
  }, [healthScore, score]);

  if (isLoading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading your health dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1450px] space-y-5 pb-8">
      <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative overflow-hidden rounded-[30px] border border-border/60 bg-card shadow-sm dark:shadow-none">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-[38%] h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-[34%] top-10 h-3 w-3 rounded-full bg-primary/30" />
        <div className="pointer-events-none absolute right-[29%] top-20 h-2 w-2 rounded-full bg-rose-400/40" />
        <div className="relative z-10 grid min-h-[320px] lg:grid-cols-[1fr_400px]">
          <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">MediGuard AI</p>
                <p className="text-xs text-muted-foreground">Your personal health companion</p>
              </div>
            </div>

            <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[42px] lg:leading-[1.1]">
              {greeting.title}, {firstName}! <span>{greeting.emoji}</span>
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              {healthScore?.score != null ? healthScore?.label || "Here's what's happening with your health today." : "Start your first AI health assessment and begin understanding your health better."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="gap-2 rounded-xl px-5 shadow-sm">
                <Link to="/dashboard/patient/predict">
                  <Brain className="h-4 w-4" />
                  Run AI Prediction
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button asChild variant="outline" className="rounded-xl border-border/70 bg-background/60 px-5 backdrop-blur">
                <Link to="/dashboard/patient/reports">View Reports</Link>
              </Button>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <ShieldCheck className="h-3 w-3" />
              </div>
              Your health data is securely protected
            </div>
          </div>

          <div className="relative hidden min-h-[320px] items-end justify-center lg:flex">
            <div className="absolute bottom-[-55px] right-8 h-72 w-72 rounded-full bg-primary/10 blur-2xl" />
            <div className="absolute bottom-8 right-16 h-52 w-52 rounded-full border border-primary/10" />
            <motion.img
              key={gender}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              src={heroImage}
              alt="Personalized health illustration"
              className="relative z-10 max-h-[320px] max-w-[365px] object-contain drop-shadow-xl"
            />
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-20 left-5 z-20 flex h-11 w-11 items-center justify-center rounded-2xl border border-border/50 bg-background/85 text-rose-500 shadow-md backdrop-blur">
              <Heart className="h-5 w-5" />
            </motion.div>
          </div>
        </div>
      </motion.section>

      {hasError && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-500">
          Some health information could not be loaded. Please refresh and try again.
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <HealthStat icon={Brain} title="Diabetes Risk" value={latestPrediction?.diabetes_risk_level ?? "No data"} subtitle="Latest assessment" iconClass="bg-amber-500/10 text-amber-500" valueClass={latestPrediction ? getRiskColor(latestPrediction.diabetes_risk_level) : ""} />
        <HealthStat icon={Heart} title="Cardiovascular" value={latestPrediction?.cvd_risk_level ?? "No data"} subtitle="Latest assessment" iconClass="bg-rose-500/10 text-rose-500" valueClass={latestPrediction ? getRiskColor(latestPrediction.cvd_risk_level) : ""} />
        <HealthStat icon={FileText} title="Medical Reports" value={reportsCount} subtitle="Available reports" iconClass="bg-blue-500/10 text-blue-500" />
        <HealthStat icon={Activity} title="AI Predictions" value={predictions.length} subtitle="Health assessments" iconClass="bg-violet-500/10 text-violet-500" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="overflow-hidden rounded-[26px] border border-border/60 bg-card shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold sm:text-base">Health Overview</h2>
                <p className="text-[11px] text-muted-foreground">Your overall health status</p>
              </div>
            </div>
            <Badge variant="secondary" className="rounded-full text-[10px]">AI Powered</Badge>
          </div>

          <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[190px_1fr] md:items-center">
            <div className="flex flex-col items-center">
              <div className="relative flex h-40 w-40 items-center justify-center">
                <div className="absolute inset-1 rounded-full bg-primary/5" />
                <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="7" className="text-muted" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * scoreProgress) / 100} className="text-primary transition-all duration-700" />
                </svg>
                <div className="relative z-10 text-center">
                  <p className={`text-4xl font-extrabold tracking-tight ${scoreColor}`}>{healthScore?.score ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground">out of 100</p>
                </div>
              </div>
              <Badge variant="secondary" className="mt-3 rounded-full px-4 py-1 text-xs">{healthScore?.label ?? "No assessment yet"}</Badge>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold">Risk Overview</p>
                <Link to="/dashboard/patient/predict" className="text-[11px] font-medium text-primary hover:underline">View details</Link>
              </div>

              {latestPrediction ? (
                <div className="space-y-2.5">
                  <RiskRow icon={Brain} label="Diabetes" value={latestPrediction.diabetes_risk_level} iconClass="bg-amber-500/10 text-amber-500" />
                  <RiskRow icon={Heart} label="Cardiovascular" value={latestPrediction.cvd_risk_level} iconClass="bg-rose-500/10 text-rose-500" />
                  <RiskRow icon={Activity} label="Hypertension" value={latestPrediction.hypertension_risk_level ?? "N/A"} iconClass="bg-blue-500/10 text-blue-500" />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-5 text-center">
                  <Brain className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-medium">No prediction yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Run an AI assessment to see your risks.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[26px] border border-border/60 bg-card p-5 shadow-sm dark:shadow-none sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold sm:text-base">Recent Predictions</h2>
                <p className="text-[11px] text-muted-foreground">Your latest AI assessments</p>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm" className="rounded-xl text-xs">
              <Link to="/dashboard/patient/predict">
                View all
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {predictions.length === 0 ? (
            <div className="flex min-h-[210px] flex-col items-center justify-center rounded-2xl border border-dashed border-border p-6 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Brain className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold">No predictions yet</p>
              <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">Run your first AI health assessment to start tracking your health.</p>
              <Button asChild size="sm" className="mt-4 rounded-xl">
                <Link to="/dashboard/patient/predict">Start Prediction</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {predictions.slice(0, 4).map((pred, index) => (
                <motion.div key={pred.id ?? index} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className="group flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-muted/20 p-3 transition-all hover:-translate-y-0.5 hover:bg-muted/40">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">Health Risk Assessment</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {formatDate(pred.created_at)}
                        {pred.model_version ? ` · ${pred.model_version}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-xs font-bold ${getRiskColor(pred.diabetes_risk_level)}`}>{pred.diabetes_risk_level}</p>
                    <p className="text-[10px] text-muted-foreground">{pred.diabetes_probability != null ? `${Math.round(pred.diabetes_probability * 100)}% probability` : "Assessment"}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Quick Actions</h2>
            <p className="text-xs text-muted-foreground">Everything you need in one place</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <QuickAction icon={Brain} title="AI Prediction" description="Check your health risks" href="/dashboard/patient/predict" iconClass="bg-primary/10 text-primary" />
          <QuickAction icon={FileText} title="Medical Reports" description="View your reports" href="/dashboard/patient/reports" iconClass="bg-blue-500/10 text-blue-500" />
          <QuickAction icon={CalendarDays} title="Appointments" description="Manage appointments" href="/dashboard/patient/appointments" iconClass="bg-violet-500/10 text-violet-500" />
          <QuickAction icon={ShieldCheck} title="Health History" description="Review your timeline" href="/dashboard/patient/timeline" iconClass="bg-emerald-500/10 text-emerald-500" />
        </div>
      </section>

      <motion.section initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative overflow-hidden rounded-[26px] border border-border/60 bg-gradient-to-r from-primary/10 via-card to-emerald-500/10 p-5 shadow-sm dark:shadow-none sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Smart Health Tip ✨</p>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Keep your health information updated and regularly review your AI-generated insights to stay informed about your health.</p>
            </div>
          </div>
          <Link to="/dashboard/patient/profile" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline">
            Update Profile
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.section>
    </div>
  );
}

function HealthStat({ icon: Icon, title, value, subtitle, iconClass, valueClass = "" }: { icon: any; title: string; value: string | number; subtitle: string; iconClass: string; valueClass?: string }) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }} className="group rounded-[20px] border border-border/60 bg-card p-4 shadow-sm transition-all hover:shadow-md dark:shadow-none">
      <div className="flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconClass} transition-transform group-hover:scale-105`}>
          <Icon className="h-4 w-4" />
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
      </div>
      <p className="mt-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className={`mt-0.5 truncate text-lg font-bold tracking-tight ${valueClass}`}>{value}</p>
      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{subtitle}</p>
    </motion.div>
  );
}

function RiskRow({ icon: Icon, label, value, iconClass }: { icon: any; label: string; value: string; iconClass: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-muted/20 px-3 py-2.5 transition-colors hover:bg-muted/40">
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className={`text-xs font-bold ${getRiskColor(value)}`}>{value}</span>
    </div>
  );
}

function QuickAction({ icon: Icon, title, description, href, iconClass }: { icon: any; title: string; description: string; href: string; iconClass: string }) {
  return (
    <Link to={href}>
      <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }} className="group h-full rounded-[20px] border border-border/60 bg-card p-4 shadow-sm transition-all hover:shadow-md dark:shadow-none sm:p-5">
        <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${iconClass} transition-transform group-hover:scale-105`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{description}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </div>
      </motion.div>
    </Link>
  );
}