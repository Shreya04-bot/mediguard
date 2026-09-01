import { useState, useEffect } from "react";
import { Stethoscope, Search, Users, CheckCircle2, Clock, Loader2, ShieldCheck, ShieldX, Power } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { fetchUsersApi, verifyDoctorApi, updateUserStatusApi } from "@/services/adminService";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ManageDoctorsPage() {
  const [search, setSearch] = useState("");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    fetchUsersApi("doctor")
      .then(setDoctors)
      .catch(() => setError("Could not load doctors."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = doctors.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.doctor_profile?.specialization ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleVerify = async (doctorId: string, decision: string) => {
    setActionInFlight(doctorId);
    try {
      await verifyDoctorApi(doctorId, decision);
      toast.success(`Doctor ${decision}`);
      load();
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Action failed");
    } finally {
      setActionInFlight(null);
    }
  };

  const handleToggleActive = async (doctor: any) => {
    setActionInFlight(doctor.id);
    try {
      await updateUserStatusApi(doctor.id, !doctor.is_active);
      toast.success(`Doctor ${doctor.is_active ? "deactivated" : "activated"}`);
      load();
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Action failed");
    } finally {
      setActionInFlight(null);
    }
  };

  const pendingCount = doctors.filter((d) => d.verification_status === "pending").length;
  const activeCount = doctors.filter((d) => d.verification_status === "approved" && d.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Doctors</h1>
          <p className="text-muted-foreground text-sm">View, verify, and manage all registered doctors on the platform</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Doctors", value: doctors.length, color: "text-primary" },
          { label: "Active", value: activeCount, color: "text-success" },
          { label: "Pending Verification", value: pendingCount, color: "text-warning" },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4 text-center">
            <div className={`text-3xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex gap-3 items-center">
        <Input placeholder="Search doctors..." className="max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading doctors...
        </div>
      ) : error ? (
        <div className="p-10 text-center text-sm text-destructive">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          <Stethoscope className="size-8 mx-auto mb-2 opacity-40" />
          No doctors found.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doctor, i) => (
            <motion.div key={doctor.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="hover:shadow-md transition-all">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-14">
                      <AvatarFallback className="gradient-primary text-white font-bold">{getInitials(doctor.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold">{doctor.name}</div>
                      <div className="text-sm text-muted-foreground">{doctor.doctor_profile?.specialization ?? "Not specified"}</div>
                      <div className="text-xs text-muted-foreground mt-1">{doctor.doctor_profile?.hospital_name ?? "—"}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <div className="font-bold text-primary">{doctor.linked_patient_count ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Patients</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <div className="font-bold text-violet-500">{doctor.doctor_profile?.experience_years ?? 0}y</div>
                      <div className="text-xs text-muted-foreground">Experience</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant={doctor.verification_status === "approved" ? "default" : doctor.verification_status === "pending" ? "secondary" : "outline"}>
                      {doctor.verification_status === "pending" && <Clock className="size-3 mr-1" />}
                      {doctor.verification_status === "approved" && <CheckCircle2 className="size-3 mr-1" />}
                      {doctor.verification_status}
                    </Badge>
                    <div className="flex gap-1">
                      {doctor.verification_status === "pending" ? (
                        <>
                          <Button size="xs" variant="outline" className="text-success border-success/30 hover:bg-success/10" disabled={actionInFlight === doctor.id} onClick={() => handleVerify(doctor.id, "approved")}>
                            <ShieldCheck className="size-3.5" />Approve
                          </Button>
                          <Button size="xs" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" disabled={actionInFlight === doctor.id} onClick={() => handleVerify(doctor.id, "rejected")}>
                            <ShieldX className="size-3.5" />Reject
                          </Button>
                        </>
                      ) : (
                        <Button size="xs" variant="outline" disabled={actionInFlight === doctor.id} onClick={() => handleToggleActive(doctor)}>
                          <Power className="size-3.5" />{doctor.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
