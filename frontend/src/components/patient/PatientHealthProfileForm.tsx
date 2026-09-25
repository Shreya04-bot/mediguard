import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { fetchPatientProfileApi, updatePatientProfileApi } from "@/services/patientService";
import { useAuth } from "@/context/AuthContext";

export type PatientHealthProfile = {
  dob: string | null;
  age?: number | null;
  gender: "female" | "male" | "other" | "neutral" | null;
  blood_group: string | null;
  phone: string | null;
  address: string | null;
  emergency_contact: string | null;
  medical_history: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  bmi?: number | null;
  bmi_category?: string | null;
  smoking: boolean;
  physical_activity_level: "sedentary" | "light" | "moderate" | "active" | null;
  family_history_diabetes: boolean;
  family_history_cvd: boolean;
  allergies: string | null;
  current_medications: string | null;
  dietary_preference: "vegetarian" | "vegan" | "non_vegetarian" | "eggetarian" | "other" | null;
  profile_complete?: boolean;
};

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
// Exactly the 4 activity levels ml.model.ACTIVITY_MAP can encode — adding
// a 5th ("very active") here would silently collapse to "moderate" in the
// model, per ml/model.py's ACTIVITY_MAP.get(..., 2) fallback, so the
// options offered to the patient are kept to what the model actually
// distinguishes rather than implying a distinction that doesn't exist.
const ACTIVITY_LEVELS: { value: string; label: string }[] = [
  { value: "sedentary", label: "Sedentary (little to no exercise)" },
  { value: "light", label: "Light (1–3 days/week)" },
  { value: "moderate", label: "Moderate (3–5 days/week)" },
  { value: "active", label: "Active (6+ days/week or physical job)" },
];
const DIET_OPTIONS: { value: string; label: string }[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "non_vegetarian", label: "Non-vegetarian" },
  { value: "eggetarian", label: "Eggetarian" },
  { value: "other", label: "Other" },
];
const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "neutral", label: "Prefer not to say" },
];

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Editable form for every PatientProfile field the app actually uses
 * (AI risk prediction, BMI, doctor patient-detail view, health-related
 * features). Same field set, validation, and API call whether it's
 * rendered inside the post-registration onboarding wizard or the
 * profile/settings page — single source of truth.
 */
export type PatientHealthProfileFormHandle = { save: () => Promise<boolean> };

const PatientHealthProfileForm = forwardRef<PatientHealthProfileFormHandle, {
  onSaved?: (profile: PatientHealthProfile) => void;
  compact?: boolean;
  hideSaveButton?: boolean;
}>(function PatientHealthProfileForm({ onSaved, compact = false, hideSaveButton = false }, ref) {
  const { updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<PatientHealthProfile>({
    dob: null, gender: null, blood_group: null, phone: null, address: null,
    emergency_contact: null, medical_history: null, height_cm: null, weight_kg: null,
    smoking: false, physical_activity_level: null, family_history_diabetes: false,
    family_history_cvd: false, allergies: null, current_medications: null, dietary_preference: null,
  });

  useEffect(() => {
    let mounted = true;
    fetchPatientProfileApi()
      .then((data: PatientHealthProfile) => { if (mounted) setForm((prev) => ({ ...prev, ...data })); })
      .catch(() => { /* new accounts have no profile row yet — defaults above are fine */ })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const set = <K extends keyof PatientHealthProfile>(key: K, value: PatientHealthProfile[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (form.dob) {
      const d = new Date(form.dob);
      if (Number.isNaN(d.getTime())) next.dob = "Enter a valid date.";
      else if (form.dob > todayIso()) next.dob = "Date of birth can't be in the future.";
    }
    if (form.height_cm != null && (form.height_cm < 50 || form.height_cm > 250)) {
      next.height_cm = "Height should be between 50 and 250 cm.";
    }
    if (form.weight_kg != null && (form.weight_kg < 2 || form.weight_kg > 400)) {
      next.weight_kg = "Weight should be between 2 and 400 kg.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return false;
    }
    setSaving(true);
    try {
      const { profile } = await updatePatientProfileApi({
        dob: form.dob || undefined,
        gender: form.gender || undefined,
        blood_group: form.blood_group || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        emergency_contact: form.emergency_contact || undefined,
        medical_history: form.medical_history || undefined,
        height_cm: form.height_cm ?? undefined,
        weight_kg: form.weight_kg ?? undefined,
        smoking: form.smoking,
        physical_activity_level: form.physical_activity_level || undefined,
        family_history_diabetes: form.family_history_diabetes,
        family_history_cvd: form.family_history_cvd,
        allergies: form.allergies || undefined,
        current_medications: form.current_medications || undefined,
        dietary_preference: form.dietary_preference || undefined,
      });
      setForm((prev) => ({ ...prev, ...profile }));
      // Gender set here is the same canonical value the avatar/UI uses —
      // reflect it in AuthContext immediately so the navbar/sidebar don't
      // show a stale avatar until the next full /auth/me refresh.
      if (profile.gender) updateUser({ gender: profile.gender, profile_complete: profile.profile_complete });
      onSaved?.(profile);
      toast.success("Health profile saved.");
      return true;
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Could not save your health profile.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({ save: handleSave }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your health profile...
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", compact && "space-y-4")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="hp-dob">Date of Birth</Label>
          <Input id="hp-dob" type="date" max={todayIso()} value={form.dob || ""}
            onChange={(e) => set("dob", e.target.value || null)}
            className={cn(errors.dob && "border-destructive")} />
          {errors.dob && <p className="text-xs text-destructive">{errors.dob}</p>}
          {form.age != null && <p className="text-xs text-muted-foreground">Age: {form.age} years</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hp-gender">Gender</Label>
          <select id="hp-gender" value={form.gender || ""} onChange={(e) => set("gender", (e.target.value || null) as PatientHealthProfile["gender"])}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
            <option value="">Select...</option>
            {GENDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hp-height">Height (cm)</Label>
          <Input id="hp-height" type="number" min={50} max={250} value={form.height_cm ?? ""}
            onChange={(e) => set("height_cm", e.target.value === "" ? null : Number(e.target.value))}
            className={cn(errors.height_cm && "border-destructive")} />
          {errors.height_cm && <p className="text-xs text-destructive">{errors.height_cm}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hp-weight">Weight (kg)</Label>
          <Input id="hp-weight" type="number" min={2} max={400} value={form.weight_kg ?? ""}
            onChange={(e) => set("weight_kg", e.target.value === "" ? null : Number(e.target.value))}
            className={cn(errors.weight_kg && "border-destructive")} />
          {errors.weight_kg && <p className="text-xs text-destructive">{errors.weight_kg}</p>}
          {form.bmi != null && <p className="text-xs text-muted-foreground">BMI: {form.bmi} ({form.bmi_category})</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hp-blood">Blood Group</Label>
          <select id="hp-blood" value={form.blood_group || ""} onChange={(e) => set("blood_group", e.target.value || null)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
            <option value="">Select...</option>
            {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hp-phone">Phone</Label>
          <Input id="hp-phone" type="tel" placeholder="+91 98765 43210" value={form.phone || ""}
            onChange={(e) => set("phone", e.target.value || null)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hp-address">Address</Label>
        <Textarea id="hp-address" rows={2} value={form.address || ""} onChange={(e) => set("address", e.target.value || null)} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hp-emergency">Emergency Contact</Label>
        <Input id="hp-emergency" placeholder="Name and phone number" value={form.emergency_contact || ""}
          onChange={(e) => set("emergency_contact", e.target.value || null)} />
      </div>

      <div className="pt-4 border-t border-border/60 space-y-4">
        <p className="text-sm font-semibold">Lifestyle & risk factors</p>
        <p className="text-xs text-muted-foreground -mt-2">
          Used to pre-fill your AI risk assessment and inform your dashboard — you can still edit any value before running a prediction.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="hp-activity">Physical Activity Level</Label>
            <select id="hp-activity" value={form.physical_activity_level || ""} onChange={(e) => set("physical_activity_level", (e.target.value || null) as PatientHealthProfile["physical_activity_level"])}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
              <option value="">Select...</option>
              {ACTIVITY_LEVELS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hp-diet">Dietary Preference</Label>
            <select id="hp-diet" value={form.dietary_preference || ""} onChange={(e) => set("dietary_preference", (e.target.value || null) as PatientHealthProfile["dietary_preference"])}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
              <option value="">Select...</option>
              {DIET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.smoking} onChange={(e) => set("smoking", e.target.checked)} className="h-4 w-4 rounded border-input" />
            I currently smoke
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.family_history_diabetes} onChange={(e) => set("family_history_diabetes", e.target.checked)} className="h-4 w-4 rounded border-input" />
            Family history of diabetes
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.family_history_cvd} onChange={(e) => set("family_history_cvd", e.target.checked)} className="h-4 w-4 rounded border-input" />
            Family history of heart disease
          </label>
        </div>
      </div>

      <div className="pt-4 border-t border-border/60 space-y-4">
        <p className="text-sm font-semibold">Medical background</p>
        <div className="space-y-1.5">
          <Label htmlFor="hp-conditions">Existing Medical Conditions / History</Label>
          <Textarea id="hp-conditions" rows={2} placeholder="e.g. Type 2 diabetes diagnosed 2019, Hypertension"
            value={form.medical_history || ""} onChange={(e) => set("medical_history", e.target.value || null)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hp-allergies">Allergies</Label>
          <Textarea id="hp-allergies" rows={2} placeholder="e.g. Penicillin, peanuts — leave blank if none"
            value={form.allergies || ""} onChange={(e) => set("allergies", e.target.value || null)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hp-meds">Current Medications</Label>
          <Textarea id="hp-meds" rows={2} placeholder="e.g. Metformin 500mg twice daily"
            value={form.current_medications || ""} onChange={(e) => set("current_medications", e.target.value || null)} />
        </div>
      </div>

      {!hideSaveButton && (
        <div className="pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Health Profile
          </Button>
        </div>
      )}
    </div>
  );
});

export default PatientHealthProfileForm;