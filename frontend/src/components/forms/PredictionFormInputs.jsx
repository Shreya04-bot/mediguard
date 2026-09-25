import React from "react";
import { FormField } from "@/components/common/FormField";
import { FormSelect } from "@/components/common/FormSelect";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

/**
 * The joint diabetes + cardiovascular risk model needs a real clinical
 * panel (HbA1c, lipid profile, triglycerides) — not just the 5 vitals
 * this form used to collect. Fields below map 1:1 to what
 * `/ai/predict` requires; nothing here is optional filler.
 */
export const PredictionFormInputs = ({ form, setForm }) => {
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormSelect
          label="Assessment Focus"
          value={form.diseaseType}
          onValueChange={(value) => handleChange("diseaseType", value)}
          options={[
            { label: "Type 2 Diabetes Mellitus", value: "Type 2 Diabetes" },
            { label: "Cardiovascular Risk", value: "Cardiovascular Risk" },
            { label: "Hypertension", value: "Hypertension" },
            { label: "Combined Risk Profile", value: "Combined Risk" },
          ]}
        />
        <FormSelect
          label="Gender"
          value={form.gender}
          onValueChange={(value) => handleChange("gender", value)}
          options={[
            { label: "Male", value: "male" },
            { label: "Female", value: "female" },
            { label: "Other", value: "other" },
          ]}
        />

        <FormField label="Age (Years)" type="number" value={form.age} onChange={(e) => handleChange("age", e.target.value)} placeholder="58" />
        <FormField label="BMI (kg/m²)" type="number" step="0.1" value={form.bmi} onChange={(e) => handleChange("bmi", e.target.value)} placeholder="27.4" />

        <FormField label="Systolic / Diastolic BP (mmHg)" value={form.bloodPressure} onChange={(e) => handleChange("bloodPressure", e.target.value)} placeholder="138/88" />
        <FormField label="Fasting Blood Glucose (mg/dL)" type="number" value={form.glucose} onChange={(e) => handleChange("glucose", e.target.value)} placeholder="118" />

        <FormField label="HbA1c (%)" type="number" step="0.1" value={form.hba1c} onChange={(e) => handleChange("hba1c", e.target.value)} placeholder="6.1" />
        <FormField label="Triglycerides (mg/dL)" type="number" value={form.triglycerides} onChange={(e) => handleChange("triglycerides", e.target.value)} placeholder="165" />

        <FormField label="Total Cholesterol (mg/dL)" type="number" value={form.cholesterolTotal} onChange={(e) => handleChange("cholesterolTotal", e.target.value)} placeholder="210" />
        <FormField label="HDL Cholesterol (mg/dL)" type="number" value={form.cholesterolHdl} onChange={(e) => handleChange("cholesterolHdl", e.target.value)} placeholder="42" />
        <FormField label="LDL Cholesterol (mg/dL)" type="number" value={form.cholesterolLdl} onChange={(e) => handleChange("cholesterolLdl", e.target.value)} placeholder="138" />

        <FormSelect
          label="Physical Activity Level"
          value={form.physicalActivity}
          onValueChange={(value) => handleChange("physicalActivity", value)}
          options={[
            { label: "Sedentary", value: "sedentary" },
            { label: "Light", value: "light" },
            { label: "Moderate", value: "moderate" },
            { label: "Active", value: "active" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="smoking" className="text-sm font-normal">Smoker</Label>
          <Switch id="smoking" checked={form.smoking} onCheckedChange={(v) => handleChange("smoking", v)} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="fh-diabetes" className="text-sm font-normal">Family History: Diabetes</Label>
          <Switch id="fh-diabetes" checked={form.familyHistoryDiabetes} onCheckedChange={(v) => handleChange("familyHistoryDiabetes", v)} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="fh-cvd" className="text-sm font-normal">Family History: Heart Disease</Label>
          <Switch id="fh-cvd" checked={form.familyHistoryCvd} onCheckedChange={(v) => handleChange("familyHistoryCvd", v)} />
        </div>
      </div>
    </div>
  );
};
