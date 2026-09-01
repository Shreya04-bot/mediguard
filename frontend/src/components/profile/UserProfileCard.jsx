import React from "react";
import { User, Mail, Building, Award, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../../hooks/useAuth";
import ProfileAvatar from "@/components/profile/ProfileAvatar";

export const UserProfileCard = () => {
  const { user } = useAuth();

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
        <ProfileAvatar user={user} className="h-24 w-24 border-4 border-teal-500/20 shadow-lg" />
        <div className="space-y-1.5 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{user?.name}</h3>
            <Badge variant="teal" size="sm" className="w-fit mx-auto sm:mx-0">
              {user?.role?.toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{user?.specialty || "Medical Specialist"}</p>
          <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 text-teal-500" /> {user?.email}
            </span>
            <span className="flex items-center gap-1">
              <Building className="h-3.5 w-3.5 text-teal-500" /> {user?.hospital || "Johns Hopkins Medical"}
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> HIPAA Certified
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
