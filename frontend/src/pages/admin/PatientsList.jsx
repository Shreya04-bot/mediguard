import React, { useState, useEffect } from "react";
import { Users, Eye, Loader2 } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "../../components/common/SearchInput";
import { Button } from "@/components/ui/button";
import { fetchUsersApi } from "@/services/adminService";
import { getRiskBadgeColor } from "../../utils/helpers";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "Unknown");

export const PatientsList = () => {
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchUsersApi("patient")
      .then((data) => { if (!cancelled) setPatients(data); })
      .catch(() => { if (!cancelled) setError("Could not load patients."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = patients.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Patient Master Registry"
        description="Comprehensive list of registered patients with their latest AI risk assessment."
      />

      <Card className="mb-6">
        <CardContent className="p-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Filter patients by name..." />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading patients...
            </div>
          ) : error ? (
            <div className="p-10 text-center text-sm text-destructive">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Users className="size-8 mx-auto mb-2 opacity-40" />
              No patients found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 dark:border-slate-800 text-muted-foreground font-semibold bg-slate-50/50 dark:bg-slate-900/50">
                  <tr>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Diabetes Risk</th>
                    <th className="py-3 px-4">CVD Risk</th>
                    <th className="py-3 px-4">Registered</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                        <div>{p.name}</div>
                        <div className="font-normal text-muted-foreground">{p.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${p.is_active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-slate-500/10 text-slate-500 border-slate-500/30"}`}>
                          {p.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {p.latest_prediction ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRiskBadgeColor(capitalize(p.latest_prediction.diabetes_risk_level))}`}>
                            {capitalize(p.latest_prediction.diabetes_risk_level)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No data yet</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {p.latest_prediction ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRiskBadgeColor(capitalize(p.latest_prediction.cvd_risk_level))}`}>
                            {capitalize(p.latest_prediction.cvd_risk_level)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No data yet</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(p.created_at)}</td>
                      <td className="py-3 px-4">
                        <Button size="sm" variant="ghost" onClick={() => toast.info("Full EHR viewer — coming soon")}>
                          <Eye className="size-4" aria-hidden="true" />
                          View EHR
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
