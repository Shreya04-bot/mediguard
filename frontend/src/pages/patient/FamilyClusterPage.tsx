import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Activity, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";
import { fetchFamilyDashboardApi, addFamilyMemberApi, removeFamilyMemberApi } from "@/services/patientService";

const RELATION_COLORS: Record<string, string> = {
  father: "bg-blue-500/10 text-blue-600",
  mother: "bg-pink-500/10 text-pink-600",
  sibling: "bg-green-500/10 text-green-600",
  spouse: "bg-violet-500/10 text-violet-600",
  child: "bg-amber-500/10 text-amber-600",
  other: "bg-slate-500/10 text-slate-600",
};

const emptyForm = { name: "", relation: "father", age: "", conditions: "", diabetes_risk_level: "", cvd_risk_level: "" };

export default function FamilyClusterPage() {
  const [family, setFamily] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    fetchFamilyDashboardApi().then(setFamily).catch(() => toast.error("Could not load family cluster.")).finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSubmitting(true);
    try {
      await addFamilyMemberApi({
        name: form.name,
        relation: form.relation,
        age: form.age ? Number(form.age) : null,
        conditions: form.conditions ? form.conditions.split(",").map((c) => c.trim()).filter(Boolean) : [],
        diabetes_risk_level: form.diabetes_risk_level || null,
        cvd_risk_level: form.cvd_risk_level || null,
        combined_score: form.diabetes_risk_level || form.cvd_risk_level
          ? { low: 0.15, moderate: 0.45, high: 0.7, critical: 0.9 }[form.diabetes_risk_level || form.cvd_risk_level] ?? null
          : null,
      });
      toast.success("Family member added");
      setForm(emptyForm);
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Could not add family member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await removeFamilyMemberApi(memberId);
      toast.success("Removed");
      load();
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Could not remove member");
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center gap-2 p-20 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin" /> Loading family cluster...</div>;
  }

  const members = family?.members ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Family Health Cluster</h1>
          <p className="text-muted-foreground text-sm">Monitor hereditary risks and health patterns across your family</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white border-0 hover:opacity-90 gap-2">
              <Plus className="size-4" />Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Family Member</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rajesh Kumar" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Relation</Label>
                  <Select value={form.relation} onValueChange={(v) => setForm({ ...form, relation: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["father", "mother", "sibling", "spouse", "child", "other"].map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Age</Label>
                  <Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="62" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Diabetes Risk (if known)</Label>
                  <Select value={form.diabetes_risk_level} onValueChange={(v) => setForm({ ...form, diabetes_risk_level: v })}>
                    <SelectTrigger><SelectValue placeholder="Unknown" /></SelectTrigger>
                    <SelectContent>
                      {["low", "moderate", "high", "critical"].map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>CVD Risk (if known)</Label>
                  <Select value={form.cvd_risk_level} onValueChange={(v) => setForm({ ...form, cvd_risk_level: v })}>
                    <SelectTrigger><SelectValue placeholder="Unknown" /></SelectTrigger>
                    <SelectContent>
                      {["low", "moderate", "high", "critical"].map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Known Conditions (comma-separated)</Label>
                <Input value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} placeholder="Type 2 Diabetes, Hypertension" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Adding..." : "Add Member"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-gradient-to-r from-primary/5 to-health/5 border-primary/20">
        <CardContent className="p-6">
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl font-extrabold text-gradient">{members.length}</div>
              <div className="text-sm text-muted-foreground mt-1">Family Members</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-extrabold text-warning">{family?.avg_risk_score ?? 0}%</div>
              <div className="text-sm text-muted-foreground mt-1">Avg Family Risk Score</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-extrabold text-destructive">{family?.hereditary_conditions_count ?? 0}</div>
              <div className="text-sm text-muted-foreground mt-1">Hereditary Conditions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {family?.insights?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Insights</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {family.insights.map((insight: any, i: number) => (
              <p key={i} className="text-sm text-muted-foreground">{insight}</p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member: any, i: number) => (
          <motion.div key={member.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="hover:shadow-md transition-all">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-12">
                      <AvatarFallback className="gradient-primary text-white font-bold">{getInitials(member.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold">{member.name}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={`capitalize ${RELATION_COLORS[member.relation] ?? ""}`}>{member.relation}</Badge>
                        {member.age && <span className="text-xs text-muted-foreground">Age {member.age}</span>}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleRemove(member.id)} aria-label={`Remove ${member.name}`}>
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </Button>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Health Risk Score</span>
                    <span className={`font-bold ${member.riskScore > 65 ? "text-destructive" : member.riskScore > 40 ? "text-warning" : "text-success"}`}>
                      {member.riskScore}%
                    </span>
                  </div>
                  <Progress value={member.riskScore} className="h-2" />
                </div>

                {member.conditions.length > 0 ? (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Known Conditions</div>
                    <div className="flex flex-wrap gap-1.5">
                      {member.conditions.map((c: any) => (
                        <Badge key={c} variant="outline" className="text-xs text-destructive border-destructive/30">{c}</Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-success">
                    <Activity className="size-3.5" />No chronic conditions
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {members.length === 0 && (
          <Card className="border-dashed sm:col-span-2 lg:col-span-3">
            <CardContent className="flex flex-col items-center justify-center min-h-[200px] gap-3 text-center p-5">
              <Users className="size-10 text-muted-foreground opacity-40" />
              <div>
                <div className="font-medium text-sm">No family members yet</div>
                <div className="text-xs text-muted-foreground mt-0.5">Add relatives to track hereditary health risks</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
