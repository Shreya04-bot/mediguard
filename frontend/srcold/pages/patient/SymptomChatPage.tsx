import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SymptomChatbot } from "@/components/chatbot/SymptomChatbot";
import { MessageSquare } from "lucide-react";

export default function SymptomChatPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">AI Symptom Chat</h1>
        <p className="text-muted-foreground text-sm">Ask our AI health assistant about symptoms, medications, or health concerns</p>
      </div>
      <Card className="overflow-hidden">
        <CardContent className="p-0 h-[600px]">
          <SymptomChatbot embedded />
        </CardContent>
      </Card>
    </div>
  );
}
