import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Stethoscope,
  Brain,
  TrendingUp,
  Activity,
  AlertTriangle,
  Cpu,
  Loader2,
  FileText,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { fetchAdminDashboardStatsApi, fetchAuditLogsApi } from "@/services/adminService";
import { useAuth } from "@/context/AuthContext";
import { dashboardAssets, normalizeGender } from "@/components/dashboard/dashboardAssets";

const monthlyConfig = {
  patients: { label: "Patients", color: "var(--chart-1)" },
  predictions: { label: "Predictions", color: "var(--chart-2)" },
  reports: { label: "Reports", color: "var(--chart-3)" },
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAdminDashboardStatsApi(), fetchAuditLogsApi(5)])
      .then(([statsData, logs]) => {
        if (cancelled) return;
        setStats(statsData);
        setRecentLogs(logs);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load platform statistics.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = user?.name?.split(" ")[0] || "Admin";

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { title: "Good Morning", emoji: "🌤️" };
    if (hour >= 12 && hour < 17) return { title: "Good Afternoon", emoji: "☀️" };
    if (hour >= 17 && hour < 21) return { title: "Good Evening", emoji: "🌆" };
    return { title: "Good Night", emoji: "🌙" };
  }, []);

  const gender = normalizeGender(user?.gender);
  const heroImage = dashboardAssets.admin.hero[gender];

  if (isLoading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading platform overview...</span>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4 text-sm text-rose-500">
          {error ?? "No data available."}
        </div>
      </div>
    );
  }

  const topDisease = stats.diseaseDistribution[0];
  const pendingVerifications = stats.pendingDoctorVerifications ?? 0;

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
        <div className="pointer-events-none absolute -bottom-28 left-[38%] h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-[34%] top-10 h-3 w-3 rounded-full bg-primary/30" />
        <div className="pointer-events-none absolute right-[29%] top-20 h-2 w-2 rounded-full bg-violet-400/40" />

        <div className="relative z-10 grid min-h-[320px] lg:grid-cols-[1fr_400px]">
          <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">MediGuard AI</p>
                <p className="text-xs text-muted-foreground">Platform control center</p>
              </div>
            </div>

            <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[42px] lg:leading-[1.1]">
              {greeting.title}, {firstName}! <span>{greeting.emoji}</span>
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              {pendingVerifications > 0
                ? `${pendingVerifications} doctor verification${pendingVerifications === 1 ? "" : "s"} pending review.`
                : "All doctor verifications are up to date."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="gap-2 rounded-xl px-5 shadow-sm">
                <Link to="/dashboard/admin/doctors">
                  <Stethoscope className="h-4 w-4" />
                  Manage Doctors
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button asChild variant="outline" className="rounded-xl border-border/70 bg-background/60 px-5 backdrop-blur">
                <Link to="/dashboard/admin/analytics">View Analytics</Link>
              </Button>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <ShieldCheck className="h-3 w-3" />
              </div>
              Platform data is monitored and securely protected
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
              alt="Admin control center illustration"
              className="relative z-10 max-h-[320px] max-w-[365px] object-contain drop-shadow-xl"
            />
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-20 left-5 z-20 flex h-11 w-11 items-center justify-center rounded-2xl border border-border/50 bg-background/85 text-violet-500 shadow-md backdrop-blur"
            >
              <ShieldCheck className="h-5 w-5" />
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <PlatformStat icon={Users} title="Total Patients" value={stats.totalPatients.toLocaleString()} subtitle="Registered users" iconClass="bg-blue-500/10 text-blue-500" />
        <PlatformStat icon={Stethoscope} title="Active Doctors" value={stats.activeDoctors.toLocaleString()} subtitle="Verified providers" iconClass="bg-violet-500/10 text-violet-500" />
        <PlatformStat icon={Brain} title="AI Predictions" value={stats.totalPredictions.toLocaleString()} subtitle="Assessments run" iconClass="bg-primary/10 text-primary" />
        <PlatformStat icon={FileText} title="Reports Uploaded" value={stats.totalReports.toLocaleString()} subtitle="Medical reports" iconClass="bg-emerald-500/10 text-emerald-500" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="group overflow-hidden rounded-[28px] border border-border/60 bg-card shadow-sm transition-all duration-300 hover:shadow-md dark:shadow-none">
          <div className="border-b border-border/50 px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold tracking-tight sm:text-base">Platform Activity</h2>
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                      LIVE
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Monthly activity across the platform</p>
                </div>
              </div>
              <div className="hidden rounded-xl bg-muted/50 px-3 py-2 text-right sm:block">
                <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Trend</p>
                <p className="mt-0.5 text-xs font-bold text-primary">Monthly</p>
              </div>
            </div>
          </div>
          <div className="px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
            <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                Patients
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-chart-2" />
                Predictions
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-chart-3" />
                Reports
              </div>
            </div>
            <div className="rounded-2xl bg-muted/20 px-1 py-3 sm:px-2">
              <ChartContainer config={monthlyConfig} className="h-[245px] w-full">
                <BarChart data={stats.monthlyActivity} margin={{ top: 8, right: 8, left: -15, bottom: 0 }} barGap={5}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/50" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={10} className="text-[10px] fill-muted-foreground" />
                  <YAxis axisLine={false} tickLine={false} tickMargin={8} width={35} className="text-[10px] fill-muted-foreground" />
                  <ChartTooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }} content={<ChartTooltipContent className="rounded-xl border-border/60 shadow-lg" />} />
                  <Bar dataKey="patients" fill="var(--color-patients)" radius={[5, 5, 2, 2]} maxBarSize={18} />
                  <Bar dataKey="predictions" fill="var(--color-predictions)" radius={[5, 5, 2, 2]} maxBarSize={18} />
                  <Bar dataKey="reports" fill="var(--color-reports)" radius={[5, 5, 2, 2]} maxBarSize={18} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-border/60 bg-card shadow-sm transition-all duration-300 hover:shadow-md dark:shadow-none">
          <div className="border-b border-border/50 px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/10">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight sm:text-base">Risk Distribution</h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">AI prediction breakdown</p>
                </div>
              </div>
              {stats.diseaseDistribution.length > 0 && (
                <div className="rounded-xl bg-rose-500/10 px-3 py-2 text-right">
                  <p className="text-[9px] font-medium uppercase tracking-wider text-rose-500/70">Conditions</p>
                  <p className="mt-0.5 text-xs font-bold text-rose-500">{stats.diseaseDistribution.length}</p>
                </div>
              )}
            </div>
          </div>
          <div className="p-5 sm:p-6">
            {stats.diseaseDistribution.length === 0 ? (
              <div className="flex min-h-[245px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold">No predictions yet</p>
                <p className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-muted-foreground">Risk distribution will appear here once AI predictions are recorded.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.diseaseDistribution.slice(0, 6).map((d: any, index: number) => {
                  const percentage = topDisease ? Math.round((d.count / topDisease.count) * 100) : 0;
                  return (
                    <div key={d.name} className="group/risk rounded-2xl border border-transparent p-2 transition-all duration-200 hover:border-border/60 hover:bg-muted/30">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-bold text-muted-foreground">
                            {String(index + 1).padStart(2, "0")}
                          </div>
                          <span className="truncate text-xs font-medium">{d.name}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{percentage}%</span>
                          <span className="text-xs font-bold">{d.count}</span>
                        </div>
                      </div>
                      <div className="relative ml-[38px] h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-500" style={{ width: `${Math.min(percentage, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
      <motion.section initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative overflow-hidden rounded-[26px] border border-border/60 bg-gradient-to-r from-primary/10 via-card to-violet-500/10 p-5 shadow-sm dark:shadow-none sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-violet-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Platform Tip ✨</p>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                {stats.pendingDoctorVerifications > 0
                  ? "You have pending doctor verifications waiting for review — clear the queue to keep providers active."
                  : "Review the ML Ops monitor regularly to catch model drift before it affects predictions."}
              </p>
            </div>
          </div>
          <Link to="/dashboard/admin/mlops" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline">
            View Model
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.section>
    </div>
  );
}

function PlatformStat({
  icon: Icon,
  title,
  value,
  subtitle,
  iconClass,
}: {
  icon: any;
  title: string;
  value: string | number;
  subtitle: string;
  iconClass: string;
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
      <p className="mt-0.5 truncate text-lg font-bold tracking-tight">{value}</p>
      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{subtitle}</p>
    </motion.div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
  href,
  iconClass,
}: {
  icon: any;
  title: string;
  description: string;
  href: string;
  iconClass: string;
}) {
  return (
    <Link to={href}>
      <motion.div
        whileHover={{ y: -3 }}
        transition={{ duration: 0.18 }}
        className="group h-full rounded-[20px] border border-border/60 bg-card p-4 shadow-sm transition-all hover:shadow-md dark:shadow-none sm:p-5"
      >
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