import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate, getRiskColor } from "@/lib/utils";
import { mockTimeline } from "@/data/mockData";
import { Brain, FileText, Calendar, Pill, Heart, Activity } from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  prediction: Brain, report: FileText, appointment: Calendar,
  medication: Pill, heart: Heart, activity: Activity,
};

export function HealthTimeline({ items = mockTimeline }: { items?: typeof mockTimeline }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-5 text-primary" />
          Health Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          {items.map((item, i) => {
            const Icon = iconMap[item.type] ?? Activity;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative pl-10"
              >
                <div className="absolute left-2 top-2 size-5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                  <div className="size-2 rounded-full bg-primary" />
                </div>
                <div className="rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm">{item.title}</span>
                    </div>
                    <Badge variant="outline" className={cn("text-xs shrink-0", getRiskColor(item.severity))}>
                      {item.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">{item.description}</p>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">{formatDate(item.date)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
