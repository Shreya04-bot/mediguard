import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Loader2, ClipboardList, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { fetchAppointmentsApi, updateAppointmentStatusApi } from "@/services/appointmentService";

const STATUS_VARIANT: Record<string, any> = {
  pending: "secondary",
  confirmed: "default",
  rejected: "destructive",
  cancelled: "outline",
  completed: "outline",
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    fetchAppointmentsApi(filter ? { status: filter } : {})
      .then(setAppointments)
      .catch(() => toast.error("Could not load appointments."))
      .finally(() => setIsLoading(false));
  };
  useEffect(() => { load(); }, [filter]);

  const handleCancel = async (id: string) => {
    setActionInFlight(id);
    try {
      await updateAppointmentStatusApi(id, { status: "cancelled", cancellation_reason: "Cancelled by admin." });
      toast.success("Appointment cancelled.");
      load();
    } catch (err: any) {
      toast.error(err?.message || "Action failed.");
    } finally {
      setActionInFlight(null);
    }
  };

  const filtered = appointments.filter((a) =>
    (a.patient_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (a.doctor_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    pending: appointments.filter((a) => a.status === "pending").length,
    confirmed: appointments.filter((a) => a.status === "confirmed").length,
    completed: appointments.filter((a) => a.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Appointment Management</h1>
        <p className="text-muted-foreground text-sm">View and manage every appointment across the platform</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <div className="text-3xl font-extrabold text-primary">{appointments.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Total</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-3xl font-extrabold text-warning">{counts.pending}</div>
          <div className="text-xs text-muted-foreground mt-1">Pending</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-3xl font-extrabold text-primary">{counts.confirmed}</div>
          <div className="text-xs text-muted-foreground mt-1">Confirmed</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-3xl font-extrabold text-success">{counts.completed}</div>
          <div className="text-xs text-muted-foreground mt-1">Completed</div>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${filter === f.value ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-muted"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Input placeholder="Search by patient or doctor..." className="max-w-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading appointments...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          <ClipboardList className="size-8 mx-auto mb-2 opacity-40" />
          No appointments found.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.5) }}>
              <Card>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {a.patient_name || "Patient"} <span className="text-muted-foreground">→</span> {a.doctor_name || "Doctor"}
                      <Badge variant={STATUS_VARIANT[a.status]}>{a.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{a.doctor_specialization || "General"}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                      <Calendar className="size-3.5" />{formatDate(a.appointment_date)}
                      <Clock className="size-3.5 ml-2" />{a.start_time}–{a.end_time}
                    </div>
                    <div className="text-sm mt-1">{a.reason}</div>
                  </div>
                  {["pending", "confirmed"].includes(a.status) && (
                    <Button size="xs" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" disabled={actionInFlight === a.id} onClick={() => handleCancel(a.id)}>
                      {actionInFlight === a.id ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                      Cancel
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
