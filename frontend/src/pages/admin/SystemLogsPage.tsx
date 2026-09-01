import { useState, useEffect, useMemo } from "react";
import { Database, AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchAuditLogsApi } from "@/services/adminService";
import { cn } from "@/lib/utils";

// Audit log "action" values are business events (user_login,
// doctor_verification, password_reset, ...), not severity levels. This
// maps them to a display level so the UI can keep its ERROR/WARNING/INFO
// styling without the backend needing to track a separate concept.
function levelFor(log: any) {
  if (log.action === "doctor_verification" && log.details?.new_status === "rejected") return "WARNING";
  if (log.action === "password_reset") return "WARNING";
  if (log.action === "user_status_changed" && log.details?.is_active === false) return "WARNING";
  return "INFO";
}

function describeLog(log: any) {
  const who = log.user_name || "System";
  switch (log.action) {
    case "user_login": return `${who} logged in`;
    case "user_logout": return `${who} logged out`;
    case "user_registered": return `${who} registered as ${log.details?.role ?? "a new user"}`;
    case "doctor_verification": return `${who}'s doctor account was ${log.details?.new_status ?? "reviewed"}`;
    case "user_status_changed": return `${who}'s account was ${log.details?.is_active ? "activated" : "deactivated"}`;
    case "password_reset": return `${who} reset their password`;
    default: return `${who}: ${log.action}`;
  }
}

export default function SystemLogsPage() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAuditLogsApi(200)
      .then((data) => { if (!cancelled) setLogs(data); })
      .catch(() => { if (!cancelled) setError("Could not load audit logs."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const enriched = useMemo(
    () => logs.map((l) => ({ ...l, level: levelFor(l), message: describeLog(l), service: l.resource?.split(":")[0] ?? "system" })),
    [logs]
  );

  const filtered = enriched.filter((l) => {
    const matchSearch = l.message.toLowerCase().includes(search.toLowerCase()) || l.service.toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === "all" || l.level === levelFilter;
    return matchSearch && matchLevel;
  });

  const levelIcon = (level: string) => {
    if (level === "ERROR") return <AlertTriangle className="size-4 text-destructive" />;
    if (level === "WARNING") return <AlertTriangle className="size-4 text-warning" />;
    if (level === "INFO") return <Info className="size-4 text-blue-500" />;
    return <CheckCircle2 className="size-4 text-success" />;
  };

  const levelClass = (level: string) => {
    if (level === "ERROR") return "text-destructive border-destructive/30 bg-destructive/5";
    if (level === "WARNING") return "text-warning border-warning/30 bg-warning/5";
    return "text-blue-500 border-blue-500/30 bg-blue-500/5";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System Logs</h1>
        <p className="text-muted-foreground text-sm">Real-time platform activity, errors, and audit trail</p>
      </div>

      <div className="flex gap-3">
        <Input placeholder="Search logs..." className="max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="ERROR">Error</SelectItem>
            <SelectItem value="WARNING">Warning</SelectItem>
            <SelectItem value="INFO">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading audit logs...
            </div>
          ) : error ? (
            <div className="p-10 text-center text-sm text-destructive">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Database className="size-8 mx-auto mb-2 opacity-40" />
              No log entries match your filters.
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                  {levelIcon(log.level)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={cn("text-xs", levelClass(log.level))}>{log.level}</Badge>
                      <Badge variant="secondary" className="text-xs">{log.service}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-sm mt-1.5">{log.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
