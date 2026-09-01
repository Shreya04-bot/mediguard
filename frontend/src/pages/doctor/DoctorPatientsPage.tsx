import { useState, useEffect } from "react";
import { Users, Eye, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchLinkedPatientsApi } from "@/services/doctorService";
import { getInitials, formatDate, getRiskColor, getRiskBadgeVariant } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

function ageFromDob(dob: any) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function overallRisk(p: any) {
  const order: Record<string, number> = { low: 0, moderate: 1, high: 2, critical: 3 };
  const levels = [p.latest_prediction?.diabetes_risk_level, p.latest_prediction?.cvd_risk_level, p.latest_prediction?.hypertension_risk_level].filter((l) => l && l !== "N/A");
  if (levels.length === 0) return "Unknown";
  const worst = levels.reduce((a, b) => (order[b?.toLowerCase()] ?? 0) > (order[a?.toLowerCase()] ?? 0) ? b : a);
  return worst.charAt(0).toUpperCase() + worst.slice(1);
}

export default function DoctorPatientsPage() {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    fetchLinkedPatientsApi()
      .then((data) => { if (!cancelled) setPatients(data); })
      .catch(() => { if (!cancelled) setError("Could not load your patients."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const withRisk = patients.map((p) => ({ ...p, _risk: overallRisk(p) }));
  const filtered = withRisk.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchRisk = riskFilter === "all" || p._risk.toLowerCase() === riskFilter.toLowerCase();
    return matchSearch && matchRisk;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Patients</h1>
        <p className="text-muted-foreground text-sm">Manage and monitor all patients linked to your account</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Patients", value: patients.length, color: "text-primary" },
          { label: "Critical", value: withRisk.filter((p) => p._risk === "Critical").length, color: "text-destructive" },
          { label: "High Risk", value: withRisk.filter((p) => p._risk === "High").length, color: "text-orange-500" },
          { label: "Stable", value: withRisk.filter((p) => p._risk === "Low").length, color: "text-success" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <div className={`text-3xl font-extrabold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2"><Users className="size-5 text-primary" />Patient List</CardTitle>
          <div className="flex gap-3">
            <Input placeholder="Search patients..." className="w-52 h-8"
              value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Risk level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risks</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading patients...
            </div>
          ) : error ? (
            <div className="p-10 text-center text-sm text-destructive">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No patients linked yet. Patients can send a connection request from their dashboard.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Diabetes Risk</TableHead>
                  <TableHead>CVD Risk</TableHead>
                  <TableHead>Hypertension Risk</TableHead>
                  <TableHead>Blood Group</TableHead>
                  <TableHead>Last Prediction</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const age = ageFromDob(p.dob);
                  return (
                    <TableRow key={p.patient_id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(p.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{age ? `${age}y · ` : ""}{p.gender ?? "—"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRiskBadgeVariant(p.latest_prediction?.diabetes_risk_level)} className={getRiskColor(p.latest_prediction?.diabetes_risk_level)}>
                          {p.latest_prediction?.diabetes_risk_level ?? "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRiskBadgeVariant(p.latest_prediction?.cvd_risk_level)} className={getRiskColor(p.latest_prediction?.cvd_risk_level)}>
                          {p.latest_prediction?.cvd_risk_level ?? "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRiskBadgeVariant(p.latest_prediction?.hypertension_risk_level)} className={getRiskColor(p.latest_prediction?.hypertension_risk_level)}>
                          {p.latest_prediction?.hypertension_risk_level ?? "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.blood_group ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{p.latest_prediction?.date ? formatDate(p.latest_prediction.date) : "No predictions yet"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/dashboard/doctor/patients/${p.patient_id}`)} aria-label={`View details for ${p.name}`}>
                            <Eye className="size-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
