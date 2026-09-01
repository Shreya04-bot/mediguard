import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  iconBg?: string;
  trend?: "up" | "down" | "neutral";
  index?: number;
}

export function StatCard({ title, value, change, changeLabel, icon: Icon, iconColor, iconBg, trend, index = 0 }: StatCardProps) {
  const trendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const TrendIcon = trendIcon;
  const trendColor = trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card className="relative overflow-hidden hover:shadow-md transition-all duration-300 group">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold tracking-tight">{value}</p>
              {(change !== undefined || changeLabel) && (
                <div className="flex items-center gap-1.5 mt-1">
                  {trend && <TrendIcon className={cn("size-3.5", trendColor)} />}
                  {change !== undefined && (
                    <span className={cn("text-xs font-medium", trendColor)}>
                      {change > 0 ? "+" : ""}{change}%
                    </span>
                  )}
                  {changeLabel && <span className="text-xs text-muted-foreground">{changeLabel}</span>}
                </div>
              )}
            </div>
            <div className={cn("size-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", iconBg ?? "bg-primary/10")}>
              <Icon className={cn("size-6", iconColor ?? "text-primary")} />
            </div>
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </Card>
    </motion.div>
  );
}
