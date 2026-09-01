import React, { useEffect, useState } from "react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";

import {
  fetchPreferencesApi,
  updatePreferencesApi,
} from "@/services/preferencesService";


const DEFAULT_PREFERENCES = {
  email_alerts: true,
  sms_alerts: false,
  ai_auto_sync: true,
};


export const SettingsForm = () => {
  const [preferences, setPreferences] = useState(
    DEFAULT_PREFERENCES
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);


  useEffect(() => {
    let mounted = true;

    const loadPreferences = async () => {
      try {
        const data = await fetchPreferencesApi();

        if (!mounted) return;

        setPreferences({
          email_alerts:
            data?.email_alerts ??
            DEFAULT_PREFERENCES.email_alerts,

          sms_alerts:
            data?.sms_alerts ??
            DEFAULT_PREFERENCES.sms_alerts,

          ai_auto_sync:
            data?.ai_auto_sync ??
            DEFAULT_PREFERENCES.ai_auto_sync,
        });

      } catch (error) {
        console.error(
          "Failed to load preferences:",
          error
        );

        if (mounted) {
          toast.error(
            error?.message ||
            "Unable to load your preferences."
          );
        }

      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadPreferences();

    return () => {
      mounted = false;
    };
  }, []);


  const setPreference = (key, value) => {
    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));
  };


  const handleSave = async () => {
    setIsSaving(true);

    try {
      const saved = await updatePreferencesApi(
        preferences
      );

      setPreferences({
        email_alerts:
          saved?.email_alerts ??
          preferences.email_alerts,

        sms_alerts:
          saved?.sms_alerts ??
          preferences.sms_alerts,

        ai_auto_sync:
          saved?.ai_auto_sync ??
          preferences.ai_auto_sync,
      });

      toast.success(
        "Preferences saved successfully."
      );

    } catch (error) {
      console.error(
        "Failed to save preferences:",
        error
      );

      toast.error(
        error?.message ||
        "Unable to save your preferences."
      );

    } finally {
      setIsSaving(false);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-bold">
          Preferences & Security Settings
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">

        <div className="space-y-4">

          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Notifications
          </h5>


          <Label className="flex items-center justify-between gap-4 font-normal">
            <span>
              Send Email Alerts for Critical Patient Risk Scores
            </span>

            <Switch
              checked={preferences.email_alerts}
              onCheckedChange={(value) =>
                setPreference(
                  "email_alerts",
                  value
                )
              }
              disabled={
                isLoading ||
                isSaving
              }
            />
          </Label>


          <Label className="flex items-center justify-between gap-4 font-normal">
            <span>
              SMS Emergency Dispatches
            </span>

            <Switch
              checked={preferences.sms_alerts}
              onCheckedChange={(value) =>
                setPreference(
                  "sms_alerts",
                  value
                )
              }
              disabled={
                isLoading ||
                isSaving
              }
            />
          </Label>


          <Label className="flex items-center justify-between gap-4 font-normal">
            <span>
              Auto-Save OCR Lab Report Extractions to My Records
            </span>

            <Switch
              checked={preferences.ai_auto_sync}
              onCheckedChange={(value) =>
                setPreference(
                  "ai_auto_sync",
                  value
                )
              }
              disabled={
                isLoading ||
                isSaving
              }
            />
          </Label>

        </div>


        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">

          <Button
            onClick={handleSave}
            disabled={
              isLoading ||
              isSaving
            }
          >
            {isLoading
              ? "Loading..."
              : isSaving
              ? "Saving..."
              : "Save Preferences"}
          </Button>

        </div>

      </CardContent>
    </Card>
  );
};