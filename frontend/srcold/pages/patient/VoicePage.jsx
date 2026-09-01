import React, { useState } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { VoiceAssistantModal } from "../../components/voice/VoiceAssistantModal";
import { Button } from "@/components/ui/button";
import { Mic, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

export const VoicePage = () => {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <PageHeader
        title="Voice Health Assistant"
        description="Speak directly to the MediGuard AI assistant for hands-free health advice."
      />

      <Card className="p-8 text-center space-y-4 max-w-lg mx-auto">
        <div className="p-4 rounded-full bg-teal-500/10 text-teal-500 w-fit mx-auto">
          <Mic className="h-10 w-10 animate-pulse" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Voice Assistant Active</h3>
        <p className="text-xs text-muted-foreground">Click below to open the speech recognition dialog.</p>
        <Button onClick={() => setOpen(true)} variant="default" className="py-3 px-6">
          <Sparkles className="size-4" aria-hidden="true" />
          Start Speaking
        </Button>
      </Card>

      <VoiceAssistantModal isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
};
