import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", ...options }).format(new Date(date));
}

export function getRiskColor(risk: string) {
  switch (risk?.toLowerCase()) {
    case "critical": return "text-destructive";
    case "high": return "text-orange-600 dark:text-orange-400";
    case "medium": return "text-yellow-600 dark:text-yellow-400";
    case "low": return "text-health dark:text-green-400";
    default: return "text-muted-foreground";
  }
}

export function getRiskBadgeVariant(risk: string): "default" | "secondary" | "destructive" | "outline" {
  switch (risk?.toLowerCase()) {
    case "critical":
    case "high": return "destructive";
    case "medium": return "secondary";
    default: return "outline";
  }
}

export function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
