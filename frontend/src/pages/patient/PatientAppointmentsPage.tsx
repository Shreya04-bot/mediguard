import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Loader2, Stethoscope, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/common/FormSelect";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  fetchAvailableDoctorsApi,
  fetchAvailableSlotsApi,
  bookAppointmentApi,
  fetchAppointmentsApi,
  cancelAppointmentApi,
} from "@/services/appointmentService";

const STATUS_VARIANT: Record<string, any> = {
  pending: "secondary",
  confirmed: "default",
  rejected: "destructive",
  cancelled: "outline",
  completed: "outline",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function PatientAppointmentsPage() {
  const [tab, setTab] = useState("book");

  // Booking state
  const [doctors, setDoctors] = useState<any[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState("");
  const [reason, setReason] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  // List state
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableDoctorsApi().then(setDoctors).catch(() => toast.error("Could not load doctors."));
  }, []);

  const loadAppointments = () => {
    setLoadingList(true);
    fetchAppointmentsApi()
      .then(setAppointments)
      .catch(() => toast.error("Could not load your appointments."))
      .finally(() => setLoadingList(false));
  };
  useEffect(() => { loadAppointments(); }, []);

  useEffect(() => {
    if (!doctorId || !date) { setSlots([]); return; }
    setLoadingSlots(true);
    setSlot("");
    fetchAvailableSlotsApi(doctorId, date)
      .then((res: any) => setSlots(res.available_slots))
      .catch(() => toast.error("Could not load available slots."))
      .finally(() => setLoadingSlots(false));
  }, [doctorId, date]);

  const doctorOptions = useMemo(
    () => doctors.map((d) => ({ value: d.id, label: `${d.name}${d.specialization ? ` — ${d.specialization}` : ""}` })),
    [doctors]
  );

  const handleBook = async () => {
    if (!doctorId || !date || !slot || reason.trim().length < 3) {
      toast.error("Please select a doctor, date, time slot, and enter a reason.");
      return;
    }
    setBooking(true);
    try {
      await bookAppointmentApi({ doctor_id: doctorId, appointment_date: date, start_time: slot, reason: reason.trim() });
      toast.success("Appointment requested — awaiting doctor confirmation.");
      setSlot(""); setReason("");
      fetchAvailableSlotsApi(doctorId, date).then((res: any) => setSlots(res.available_slots)).catch(() => {});
      loadAppointments();
      setTab("mine");
    } catch (err: any) {
      toast.error(err?.message || "Could not book appointment.");
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await cancelAppointmentApi(id);
      toast.success("Appointment cancelled.");
      loadAppointments();
    } catch (err: any) {
      toast.error(err?.message || "Could not cancel appointment.");
    } finally {
      setCancellingId(null);
    }
  };

  const upcoming = appointments.filter((a) => ["pending", "confirmed"].includes(a.status));
  const past = appointments.filter((a) => ["completed", "rejected", "cancelled"].includes(a.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Appointments</h1>
        <p className="text-muted-foreground text-sm">Book a consultation with a doctor, or manage your existing appointments</p>
      </div>

      <div className="flex gap-2 border-b">
        <button className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "book" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`} onClick={() => setTab("book")}>
          Book Appointment
        </button>
        <button className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "mine" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`} onClick={() => setTab("mine")}>
          My Appointments {upcoming.length > 0 && <Badge variant="secondary" className="ml-1.5">{upcoming.length}</Badge>}
        </button>
      </div>

      {tab === "book" && (
        <Card>
          <CardHeader><CardTitle className="text-base">New Appointment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <FormSelect
                label="Doctor"
                placeholder="Select a doctor"
                options={doctorOptions}
                value={doctorId}
                onValueChange={setDoctorId}
              />
              <div>
                <label className="text-sm font-medium mb-1.5 block" htmlFor="appt-date">Date</label>
                <input
                  id="appt-date"
                  type="date"
                  min={todayIso()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                />
              </div>
            </div>

            {doctorId && date && (
              <div>
                <label className="text-sm font-medium mb-2 block">Available time slots</label>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Loader2 className="size-4 animate-spin" />Loading slots...</div>
                ) : slots.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <AlertCircle className="size-4" />No available slots on this date (clinic hours: Mon–Sat, 9:00 AM–5:00 PM). Try another date.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSlot(s)}
                        className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${slot === s ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-muted"}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1.5 block" htmlFor="appt-reason">Reason for visit</label>
              <Textarea id="appt-reason" placeholder="Briefly describe why you'd like to see the doctor..." value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </div>

            <Button onClick={handleBook} disabled={booking || !slot} className="w-full sm:w-auto">
              {booking ? <Loader2 className="size-4 animate-spin" /> : <Calendar className="size-4" />}
              Request Appointment
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "mine" && (
        <div className="space-y-6">
          {loadingList ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading appointments...
            </div>
          ) : appointments.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Stethoscope className="size-8 mx-auto mb-2 opacity-40" />
              No appointments yet. Book one to get started.
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">Upcoming</h2>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
                ) : (
                  <div className="space-y-3">
                    {upcoming.map((a, i) => (
                      <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <Card>
                          <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {a.doctor_name || "Doctor"}
                                <Badge variant={STATUS_VARIANT[a.status]}>{a.status}</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">{a.doctor_specialization || "General"}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                <Calendar className="size-3.5" />{formatDate(a.appointment_date)}
                                <Clock className="size-3.5 ml-2" />{a.start_time}–{a.end_time}
                              </div>
                              <div className="text-sm mt-1">{a.reason}</div>
                            </div>
                            <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" disabled={cancellingId === a.id} onClick={() => handleCancel(a.id)}>
                              {cancellingId === a.id ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                              Cancel
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {past.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground mb-3">Past</h2>
                  <div className="space-y-3">
                    {past.map((a) => (
                      <Card key={a.id} className="opacity-80">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {a.doctor_name || "Doctor"}
                              <Badge variant={STATUS_VARIANT[a.status]}>
                                {a.status === "completed" && <CheckCircle2 className="size-3 mr-1" />}
                                {a.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                              <Calendar className="size-3.5" />{formatDate(a.appointment_date)}
                              <Clock className="size-3.5 ml-2" />{a.start_time}–{a.end_time}
                            </div>
                            {a.notes && <div className="text-sm mt-1 text-muted-foreground">Doctor's notes: {a.notes}</div>}
                            {a.cancellation_reason && <div className="text-sm mt-1 text-muted-foreground">Reason: {a.cancellation_reason}</div>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
