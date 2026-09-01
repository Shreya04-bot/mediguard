import React from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { SymptomChatbot } from "../../components/chatbot/SymptomChatbot";

export const ClinicalAssistantPage = () => {
  return (
    <div>
      <PageHeader
        title="Clinical Decision Assistant"
        description="Interact with the AI clinical assistant for risk interpretation, guideline-grounded reasoning, and follow-up recommendations."
      />
      <SymptomChatbot />
    </div>
  );
};
