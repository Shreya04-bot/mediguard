import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Brain,
  AlertTriangle,
  UserPlus,
  Loader2,
  Check,
  X,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getInitials, getRiskColor } from "@/lib/utils";
import { fetchLinkedPatientsApi, fetchLinkRequestsApi, respondLinkRequestApi, fetchDoctorAnalyticsApi } from "@/services/doctorService";
import { toast } from "sonner";
import { dashboardAssets, normalizeGender } from "@/components/dashboard/dashboardAssets";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);

  const load = () => {
    Promise.all([fetchLinkedPatientsApi(), fetchLinkRequestsApi(), fetchDoctorAnalyticsApi()])
      .then(([p, requests, a]) => {
        setPatients(p);
        setPendingRequests(requests.filter((r) => r.status === "pending"));
        setAnalytics(a);
      })
      .catch(() => toast.error("Could not load dashboard data."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleRespond = async (linkId: string, decision: string) => {
    setActionInFlight(linkId);
    try {
      await respondLinkRequestApi(linkId, decision);
      toast.success(`Request ${decision}`);
      load();
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Action failed");
    } finally {
      setActionInFlight(null);
    }
  };

  const criticalCount = patients.filter(
    (p) =>
      p.latest_prediction?.diabetes_risk_level === "critical" ||
      p.latest_prediction?.cvd_risk_level === "critical" ||
      p.latest_prediction?.hypertension_risk_level === "critical"
  ).length;

  const doctorName = user?.name?.split(" ").slice(1).join(" ") || user?.name || "";

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { title: "Good Morning", emoji: "🌤️" };
    if (hour >= 12 && hour < 17) return { title: "Good Afternoon", emoji: "☀️" };
    if (hour >= 17 && hour < 21) return { title: "Good Evening", emoji: "🌆" };
    return { title: "Good Night", emoji: "🌙" };
  }, []);

  const gender = normalizeGender(user?.gender);
  const heroImage = dashboardAssets.doctor.hero[gender];

  if (isLoading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1450px] space-y-5 pb-8">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-[30px] border border-border/60 bg-card shadow-sm dark:shadow-none"
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-[38%] h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-[34%] top-10 h-3 w-3 rounded-full bg-primary/30" />
        <div className="pointer-events-none absolute right-[29%] top-20 h-2 w-2 rounded-full bg-blue-400/40" />

        <div className="relative z-10 grid min-h-[320px] lg:grid-cols-[1fr_400px]">
          <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">MediGuard AI</p>
                <p className="text-xs text-muted-foreground">Your clinical workspace</p>
              </div>
            </div>

            <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[42px] lg:leading-[1.1]">
              {greeting.title}, Dr. {doctorName}! <span>{greeting.emoji}</span>
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              You have {patients.length} linked patient{patients.length === 1 ? "" : "s"}
              {pendingRequests.length > 0
                ? ` and ${pendingRequests.length} pending connection request${pendingRequests.length === 1 ? "" : "s"}.`
                : "."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="gap-2 rounded-xl px-5 shadow-sm">
                <Link to="/dashboard/doctor/appointments">
                  <Users className="h-4 w-4" />
                  View Appointments
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button asChild variant="outline" className="rounded-xl border-border/70 bg-background/60 px-5 backdrop-blur">
                <Link to="/dashboard/doctor/assistant">Open Clinical Assistant</Link>
              </Button>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <ShieldCheck className="h-3 w-3" />
              </div>
              Patient data is securely protected
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
              alt="Clinical workspace illustration"
              className="relative z-10 max-h-[320px] max-w-[365px] object-contain drop-shadow-xl"
            />
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-20 left-5 z-20 flex h-11 w-11 items-center justify-center rounded-2xl border border-border/50 bg-background/85 text-blue-500 shadow-md backdrop-blur"
            >
              <Stethoscope className="h-5 w-5" />
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <DoctorStat icon={Users} title="My Patients" value={patients.length} subtitle="Linked patients" iconClass="bg-blue-500/10 text-blue-500" />
        <DoctorStat icon={UserPlus} title="Pending Requests" value={pendingRequests.length} subtitle="Awaiting response" iconClass="bg-violet-500/10 text-violet-500" />
        <DoctorStat icon={Brain} title="AI Predictions Run" value={analytics?.total_predictions ?? 0} subtitle="Across your patients" iconClass="bg-primary/10 text-primary" />
        <DoctorStat
          icon={AlertTriangle}
          title="Critical Patients"
          value={criticalCount}
          subtitle="Need attention"
          iconClass="bg-rose-500/10 text-rose-500"
          valueClass={criticalCount > 0 ? "text-rose-500" : ""}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Recent Patients */}
        <section className="overflow-hidden rounded-[26px] border border-border/60 bg-card shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold sm:text-base">Recent Patients</h2>
                <p className="text-[11px] text-muted-foreground">Your linked patients</p>
              </div>
            </div>
            <Badge variant="secondary" className="rounded-full text-[10px]">{patients.length} total</Badge>
          </div>

          <div className="p-5 sm:p-6">
            {patients.length === 0 ? (
              <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-border p-6 text-center">
                <Users className="mb-2 h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-medium">No linked patients yet</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {patients.slice(0, 5).map((p, index) => (
                  <motion.div key={p.patient_id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }}>
                    <Link
                      to={`/dashboard/doctor/patients/${p.patient_id}`}
                      className="flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/20 p-3 transition-all hover:-translate-y-0.5 hover:bg-muted/40"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-xs text-primary">{getInitials(p.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{p.email}</p>
                      </div>
                      {p.latest_prediction?.diabetes_risk_level !== "N/A" && (
                        <Badge variant="outline" className={`shrink-0 rounded-full text-[10px] ${getRiskColor(p.latest_prediction?.diabetes_risk_level)}`}>
                          {p.latest_prediction?.diabetes_risk_level}
                        </Badge>
                      )}
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" className="mt-4 w-full rounded-xl" asChild>
              <Link to="/dashboard/doctor/patients">
                View All Patients
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Connection Requests */}
        <section className="rounded-[26px] border border-border/60 bg-card p-5 shadow-sm dark:shadow-none sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold sm:text-base">Connection Requests</h2>
              <p className="text-[11px] text-muted-foreground">Patients requesting to link</p>
            </div>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-border p-6 text-center">
              <UserPlus className="mb-2 h-5 w-5 text-muted-foreground" />
              <p className="text-sm font-medium">No pending connection requests</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingRequests.map((req, index) => (
                <motion.div
                  key={req.link_id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-muted/20 p-3 transition-all hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{req.patient_name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{req.patient_email}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      size="icon-sm"
                      variant="outline"
                      className="rounded-xl border-success/30 text-success"
                      disabled={actionInFlight === req.link_id}
                      onClick={() => handleRespond(req.link_id, "accepted")}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      className="rounded-xl border-destructive/30 text-destructive"
                      disabled={actionInFlight === req.link_id}
                      onClick={() => handleRespond(req.link_id, "rejected")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
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
          <Link to="/dashboard/doctor/analytics" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline">
            View Analytics
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.section>
    </div>
  );
}

function DoctorStat({
  icon: Icon,
  title,
  value,
  subtitle,
  iconClass,
  valueClass = "",
}: {
  icon: any;
  title: string;
  value: string | number;
  subtitle: string;
  iconClass: string;
  valueClass?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className="group rounded-[20px] border border-border/60 bg-card p-4 shadow-sm transition-all hover:shadow-md dark:shadow-none"
    >
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