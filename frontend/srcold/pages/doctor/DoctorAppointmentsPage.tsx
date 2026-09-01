import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Loader2, Stethoscope, Check, X, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
];

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const load = () => {
    setIsLoading(true);
    fetchAppointmentsApi(filter ? { status: filter } : {})
      .then(setAppointments)
      .catch(() => toast.error("Could not load appointments."))
      .finally(() => setIsLoading(false));
  };
  useEffect(() => { load(); }, [filter]);

  const handleStatusChange = async (id: string, status: string, extra: Record<string, any> = {}) => {
    setActionInFlight(id);
    try {
      await updateAppointmentStatusApi(id, { status, ...extra });
      toast.success(`Appointment ${status}.`);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Action failed.");
    } finally {
      setActionInFlight(null);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const todaysAppointments = appointments.filter((a) => a.appointment_date === today && ["pending", "confirmed"].includes(a.status));
  const pendingCount = appointments.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-muted-foreground text-sm">Manage your patient appointment requests and schedule</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center">
          <div className="text-3xl font-extrabold text-primary">{todaysAppointments.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Today's Schedule</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-3xl font-extrabold text-warning">{pendingCount}</div>
          <div className="text-xs text-muted-foreground mt-1">Pending Requests</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-3xl font-extrabold text-success">{appointments.filter((a) => a.status === "completed").length}</div>
          <div className="text-xs text-muted-foreground mt-1">Completed</div>
        </CardContent></Card>
      </div>

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

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading appointments...
        </div>
      ) : appointments.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          <Stethoscope className="size-8 mx-auto mb-2 opacity-40" />
          No appointments {filter ? `with status "${filter}"` : "yet"}.
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {a.patient_name || "Patient"}
                        <Badge variant={STATUS_VARIANT[a.status]}>{a.status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                        <Calendar className="size-3.5" />{formatDate(a.appointment_date)}
                        <Clock className="size-3.5 ml-2" />{a.start_time}–{a.end_time}
                      </div>
                      <div className="text-sm mt-1">{a.reason}</div>
                      {a.notes && <div className="text-sm mt-1 text-muted-foreground">Notes: {a.notes}</div>}
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      {a.status === "pending" && (
                        <>
                          <Button size="xs" variant="outline" className="text-success border-success/30 hover:bg-success/10" disabled={actionInFlight === a.id} onClick={() => handleStatusChange(a.id, "confirmed")}>
                            <Check className="size-3.5" />Confirm
                          </Button>
                          <Button size="xs" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" disabled={actionInFlight === a.id} onClick={() => handleStatusChange(a.id, "rejected")}>
                            <X className="size-3.5" />Reject
                          </Button>
                        </>
                      )}
                      {a.status === "confirmed" && (
                        <>
                          <Button
                            size="xs" variant="outline" className="text-success border-success/30 hover:bg-success/10"
                            disabled={actionInFlight === a.id}
                            onClick={() => handleStatusChange(a.id, "completed", { notes: notesDraft[a.id] || undefined })}
                          >
                            <CheckCircle2 className="size-3.5" />Mark Completed
                          </Button>
                          <Button size="xs" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" disabled={actionInFlight === a.id} onClick={() => handleStatusChange(a.id, "cancelled")}>
                            <X className="size-3.5" />Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {a.status === "confirmed" && (
                    <Textarea
                      placeholder="Add consultation notes before marking completed (optional)..."
                      value={notesDraft[a.id] || ""}
                      onChange={(e) => setNotesDraft((prev) => ({ ...prev, [a.id]: e.target.value }))}
                      rows={2}
                      className="text-sm"
                    />
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
