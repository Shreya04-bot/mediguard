import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Brain, TrendingUp, AlertTriangle, UserPlus, Loader2, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { StatCard } from "@/components/dashboard/StatCard";
import { useAuth } from "@/context/AuthContext";
import { getInitials, getRiskColor } from "@/lib/utils";
import { fetchLinkedPatientsApi, fetchLinkRequestsApi, respondLinkRequestApi, fetchDoctorAnalyticsApi } from "@/services/doctorService";
import { toast } from "sonner";

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

  useEffect(() => { load(); }, []);

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

  const criticalCount = patients.filter((p) => p.latest_prediction?.diabetes_risk_level === "critical" || p.latest_prediction?.cvd_risk_level === "critical" || p.latest_prediction?.hypertension_risk_level === "critical").length;

  if (isLoading) {
    return <div className="flex items-center justify-center gap-2 p-20 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin" /> Loading your dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10"><Users className="size-48" /></div>
        <div className="relative z-10">
          <p className="text-white/80 text-sm mb-1">Welcome back</p>
          <h2 className="text-2xl font-bold">Dr. {user?.name?.split(" ").slice(1).join(" ") || user?.name}</h2>
          <p className="text-white/70 text-sm mt-1">
            You have <strong>{patients.length} linked patient{patients.length === 1 ? "" : "s"}</strong>
            {pendingRequests.length > 0 && <> and <strong>{pendingRequests.length} pending connection request{pendingRequests.length === 1 ? "" : "s"}</strong></>}
          </p>
          <div className="flex gap-3 mt-4">
            <Button size="sm" variant="secondary" className="gap-2" asChild>
              <Link to="/dashboard/doctor/patients"><Users className="size-4" />Patient List</Link>
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="My Patients" value={patients.length} icon={Users} iconBg="bg-blue-100 dark:bg-blue-500/10" iconColor="text-blue-500" index={0} />
        <StatCard title="Pending Requests" value={pendingRequests.length} icon={UserPlus} iconBg="bg-violet-100 dark:bg-violet-500/10" iconColor="text-violet-500" index={1} />
        <StatCard title="AI Predictions Run" value={analytics?.total_predictions ?? 0} icon={Brain} iconBg="bg-primary/10" iconColor="text-primary" index={2} />
        <StatCard title="Critical Patients" value={criticalCount} icon={AlertTriangle} iconBg="bg-destructive/10" iconColor="text-destructive" index={3} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Users className="size-5 text-primary" />Recent Patients</CardTitle>
            <Badge variant="secondary">{patients.length} total</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {patients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No linked patients yet.</p>
            ) : patients.slice(0, 5).map((p) => (
              <Link key={p.patient_id} to={`/dashboard/doctor/patients/${p.patient_id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(p.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.email}</div>
                </div>
                {p.latest_prediction?.diabetes_risk_level !== "N/A" && (
                  <Badge variant="outline" className={`text-xs ${getRiskColor(p.latest_prediction?.diabetes_risk_level)}`}>{p.latest_prediction?.diabetes_risk_level}</Badge>
                )}
              </Link>
            ))}
            <Button variant="outline" size="sm" className="w-full mt-2" asChild>
              <Link to="/dashboard/doctor/patients">View All Patients</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="size-5 text-primary" />Connection Requests</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending connection requests.</p>
            ) : pendingRequests.map((req) => (
              <div key={req.link_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <div>
                  <div className="text-sm font-medium">{req.patient_name}</div>
                  <div className="text-xs text-muted-foreground">{req.patient_email}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon-sm" variant="outline" className="text-success border-success/30" disabled={actionInFlight === req.link_id} onClick={() => handleRespond(req.link_id, "accepted")}><Check className="size-3.5" /></Button>
                  <Button size="icon-sm" variant="outline" className="text-destructive border-destructive/30" disabled={actionInFlight === req.link_id} onClick={() => handleRespond(req.link_id, "rejected")}><X className="size-3.5" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
