import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sparkles, Leaf } from "lucide-react";

export const HerbalRecommendationsPage = () => {
  const herbs = [
    { name: "Ashwagandha (Withania somnifera)", purpose: "Cortisol modulator and neuro-protective adaptogen." },
    { name: "Guduchi (Tinospora cordifolia)", purpose: "Immune booster and systemic cellular detoxifier." },
    { name: "Triphala Formulation", purpose: "Digestive rejuvenator supporting micro-biome equilibrium." },
  ];

  return (
    <div>
      <PageHeader
        title="Botanical & Herbal Recommendations"
        description="Evidence-backed Ayurvedic botanical protocols synchronized with clinical lab results."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {herbs.map((h, i) => (
          <Card key={i} className="p-5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 w-fit mb-3">
              <Leaf className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{h.name}</h4>
            <p className="text-xs text-muted-foreground mt-2">{h.purpose}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};
