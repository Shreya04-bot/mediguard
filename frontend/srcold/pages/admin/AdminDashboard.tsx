import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Stethoscope, Brain, TrendingUp, Activity, AlertTriangle, BarChart3, Cpu, Loader2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { StatCard } from "@/components/dashboard/StatCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { fetchAdminDashboardStatsApi, fetchAuditLogsApi } from "@/services/adminService";

const monthlyConfig = {
  patients: { label: "Patients", color: "var(--chart-1)" },
  predictions: { label: "Predictions", color: "var(--chart-2)" },
  reports: { label: "Reports", color: "var(--chart-3)" },
};

export default function AdminDashboard() {
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
      .catch(() => { if (!cancelled) setError("Could not load platform statistics."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 p-20 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Loading platform overview...
      </div>
    );
  }

  if (error || !stats) {
    return <div className="p-10 text-center text-sm text-destructive">{error ?? "No data available."}</div>;
  }

  const topDisease = stats.diseaseDistribution[0];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10"><BarChart3 className="size-48" /></div>
        <div className="relative z-10">
          <p className="text-white/80 text-sm mb-1">Platform Overview</p>
          <h2 className="text-2xl font-bold">Admin Control Centre</h2>
          <p className="text-white/70 text-sm mt-1">{stats.pendingDoctorVerifications} doctor verification(s) pending review</p>
          <div className="flex gap-3 mt-4">
            <Button size="sm" variant="secondary" className="gap-2" asChild><Link to="/dashboard/admin/doctors"><Stethoscope className="size-4" />Manage Doctors</Link></Button>
            <Button size="sm" variant="outline" className="gap-2 border-white/30 text-white hover:bg-white/10" asChild><Link to="/dashboard/admin/mlops"><Cpu className="size-4" />ML Ops</Link></Button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Patients" value={stats.totalPatients.toLocaleString()} icon={Users} iconBg="bg-blue-100 dark:bg-blue-500/10" iconColor="text-blue-500" index={0} />
        <StatCard title="Active Doctors" value={stats.activeDoctors.toLocaleString()} icon={Stethoscope} iconBg="bg-violet-100 dark:bg-violet-500/10" iconColor="text-violet-500" index={1} />
        <StatCard title="AI Predictions" value={stats.totalPredictions.toLocaleString()} icon={Brain} iconBg="bg-primary/10" iconColor="text-primary" index={2} />
        <StatCard title="Reports Uploaded" value={stats.totalReports.toLocaleString()} icon={FileText} iconBg="bg-success/10" iconColor="text-success" index={3} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Monthly chart */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="size-5 text-primary" />Platform Activity</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={monthlyConfig} className="h-[240px] w-full">
              <BarChart data={stats.monthlyActivity}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="patients" fill="var(--color-patients)" radius={4} />
                <Bar dataKey="predictions" fill="var(--color-predictions)" radius={4} />
                <Bar dataKey="reports" fill="var(--color-reports)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Disease Stats */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="size-5 text-primary" />Risk Level Distribution</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {stats.diseaseDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">No predictions recorded yet.</p>
            ) : stats.diseaseDistribution.slice(0, 6).map((d: any) => (
              <div key={d.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-medium">{d.count}</span>
                </div>
                <Progress value={topDisease ? (d.count / topDisease.count) * 100 : 0} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick links replacing the previous mocked ML model preview — see /dashboard/admin/mlops for real model metrics */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Cpu className="size-5 text-primary" />ML Ops</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">View deployed model versions, accuracy, and drift detection.</p>
            <Button size="sm" variant="outline" asChild><Link to="/dashboard/admin/mlops">Open ML Ops Monitor</Link></Button>
          </CardContent>
        </Card>

        {/* Recent Activity (real audit logs) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="size-5 text-primary" />Recent Activity</CardTitle>
            <Button size="sm" variant="outline" asChild><Link to="/dashboard/admin/logs">View All</Link></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : recentLogs.map((log) => (
              <div key={log.id} className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 text-sm">
                <Badge variant="outline" className="text-xs shrink-0">{log.action}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="truncate">{log.user_name ?? "System"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
