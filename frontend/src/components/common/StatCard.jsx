import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "../../lib/utils";

export function StatCard({ title, value, icon: Icon, change, trend, className }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          {change && (
            <p className={cn("mt-1 text-xs font-medium", trend === "down" ? "text-destructive" : "text-health")}>
              {change}
            </p>
          )}
        </div>
        {Icon && (
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
