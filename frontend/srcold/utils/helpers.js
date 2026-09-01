import { RISK_COLORS } from "../constants/colors";

export const getRiskBadgeColor = (riskLevel) => {
  return RISK_COLORS[riskLevel]?.badge || "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30";
};

export const getRiskGaugeColor = (riskLevel) => {
  return RISK_COLORS[riskLevel]?.gauge || "#94a3b8";
};

export const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const calculateBmi = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return 0;
  const heightM = heightCm / 100;
  return (weightKg / (heightM * heightM)).toFixed(1);
};
