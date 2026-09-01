import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const SettingsForm = () => {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [aiAutoSync, setAiAutoSync] = useState(true);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-bold">Preferences & Security Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Notifications</h5>
          <Label className="flex items-center justify-between gap-4 font-normal">
            <span>Send Email Alerts for Critical Patient Risk Scores</span>
            <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
          </Label>
          <Label className="flex items-center justify-between gap-4 font-normal">
            <span>SMS Emergency Dispatches</span>
            <Switch checked={smsAlerts} onCheckedChange={setSmsAlerts} />
          </Label>
          <Label className="flex items-center justify-between gap-4 font-normal">
            <span>Auto-Save OCR Lab Report Extractions to My Records</span>
            <Switch checked={aiAutoSync} onCheckedChange={setAiAutoSync} />
          </Label>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="default" size="default">
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
