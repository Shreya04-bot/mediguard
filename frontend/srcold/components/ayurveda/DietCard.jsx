import React from "react";
import { Utensils, Check, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const DietCard = () => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Utensils className="h-5 w-5 text-emerald-500" />
          <span>Personalized Pitta Pacifying Diet</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div>
          <h5 className="font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
            <Check className="h-4 w-4" /> Recommended Foods
          </h5>
          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
            <li>Cooling grains: Basmati rice, oats, quinoa</li>
            <li>Sweet & bitter vegetables: Cucumbers, zucchini, leafy greens</li>
            <li>Herbal teas: Fennel, peppermint, coriander tea</li>
          </ul>
        </div>

        <div>
          <h5 className="font-bold text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-1">
            <X className="h-4 w-4" /> Foods to Minimize
          </h5>
          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
            <li>Extremely spicy chilies and pungent garlic</li>
            <li>Fried greasy heavy meals</li>
            <li>Excessive sour fruits or vinegar dressings</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
