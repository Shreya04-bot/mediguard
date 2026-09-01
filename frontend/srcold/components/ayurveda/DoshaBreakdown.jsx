import React from "react";
import { Sparkles, Leaf, Sun, Wind } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const DoshaBreakdown = ({ scores = { vataPercentage: 25, pittaPercentage: 55, kaphaPercentage: 20 } }) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <span>Ayurvedic Prakriti Dosha Profile</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-xs font-bold mb-1">
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Sun className="h-3.5 w-3.5" /> Pitta (Fire & Transformation)
            </span>
            <span>{scores.pittaPercentage}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${scores.pittaPercentage}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-bold mb-1">
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <Wind className="h-3.5 w-3.5" /> Vata (Air & Vital Movement)
            </span>
            <span>{scores.vataPercentage}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${scores.vataPercentage}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-bold mb-1">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Leaf className="h-3.5 w-3.5" /> Kapha (Earth & Structure)
            </span>
            <span>{scores.kaphaPercentage}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${scores.kaphaPercentage}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
