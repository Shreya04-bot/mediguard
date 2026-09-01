import React from "react";
import { Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const YogaCard = () => {
  const asanas = [
    { name: "Sheetali Pranayama", desc: "Cooling breath exercise to reduce metabolic heat and lower systemic inflammation." },
    { name: "Chandra Namaskar", desc: "Moon salutations for soothing nervous system tension." },
    { name: "Paschimottanasana", desc: "Seated forward bend promoting deep relaxation and abdominal digestive harmony." },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <span>Ayurvedic Yoga & Asana Regimen</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {asanas.map((a, i) => (
          <div key={i} className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <h5 className="text-xs font-bold text-purple-700 dark:text-purple-300">{a.name}</h5>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{a.desc}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
