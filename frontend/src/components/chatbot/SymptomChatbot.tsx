import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { Activity, Send, Bot, User, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { useAuth } from "@/context/AuthContext";
import { sendChatMessageApi } from "@/services/chatbotService";
import { mapVernacularSymptomsApi } from "@/services/featuresService";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  time: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    role: "assistant",
    content:
      "Hello! I'm MediGuard AI, your personal health assistant. I can help you understand symptoms, explain medical reports, or answer health-related questions. How can I help you today?",
    time: "now",
  },
];

const QUICK_PROMPTS = [
  "What does high blood pressure mean?",
  "Explain my diabetes risk",
  "What are signs of heart disease?",
  "How can I improve my health score?",
];

export function SymptomChatbot({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { user } = useAuth();

  const [messages, setMessages] =
    useState<Message[]>(INITIAL_MESSAGES);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [mappedSymptoms, setMappedSymptoms] = useState<any>(null);
  const [mappingLoading, setMappingLoading] = useState(false);

  const sendMessage = async (text?: string) => {
    const content = text ?? input.trim();

    if (!content || isTyping) return;

    setInput("");

    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content,
      time: "now",
    };

    const history = messages.map(({ role, content: c }) => ({
      role,
      content: c,
    }));

    setMessages((current) => [...current, userMsg]);
    setIsTyping(true);
    setMappingLoading(true);
    setMappedSymptoms(null);

    try {
      const [chatResult, mappingResult] = await Promise.allSettled([
        sendChatMessageApi(
          content,
          history,
          user?.role ?? "patient"
        ),
        mapVernacularSymptomsApi(content, true),
      ]);

      if (mappingResult.status === "fulfilled") {
        console.log("F3 SYMPTOM MAPPING RESPONSE:", mappingResult.value);
        setMappedSymptoms(mappingResult.value);
      }

      if (chatResult.status === "fulfilled") {
        const { reply } = chatResult.value;

        setMessages((current) => [
          ...current,
          {
            id: Date.now() + 1,
            role: "assistant",
            content: reply,
            time: "now",
          },
        ]);
      } else {
        throw chatResult.reason;
      }
    } catch (err) {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          content:
            err instanceof Error
              ? err.message
              : "Something went wrong reaching the AI assistant. Please try again.",
          time: "now",
        },
      ]);
    } finally {
      setMappingLoading(false);
      setIsTyping(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col",
        embedded ? "h-full" : "h-[600px]"
      )}
    >
      {/* Header */}
      {!embedded && (
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="size-5 text-primary" />
          </div>

          <div>
            <h3 className="font-semibold">
              AI Health Assistant
            </h3>

            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-muted-foreground">
                Online
              </span>
            </div>
          </div>

          <Badge
            variant="secondary"
            className="ml-auto gap-1"
          >
            <Sparkles className="size-3" />
            AI Powered
          </Badge>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        <div className="p-4">
          <div className="space-y-5">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.2,
                }}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" && "flex-row-reverse"
                )}
              >
                {/* Avatar */}
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback
                    className={
                      msg.role === "assistant"
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary"
                    }
                  >
                    {msg.role === "assistant" ? (
                      <Bot className="size-4" />
                    ) : (
                      <User className="size-4" />
                    )}
                  </AvatarFallback>
                </Avatar>

                {/* Message Bubble */}
                <div
                  className={cn(
                    "rounded-2xl px-5 py-4 max-w-[88%] text-sm leading-7",
                    msg.role === "assistant"
                      ? "bg-muted text-foreground rounded-tl-none"
                      : "bg-primary text-primary-foreground rounded-tr-none"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => (
                          <p className="mb-3 last:mb-0 leading-7">
                            {children}
                          </p>
                        ),

                        strong: ({ children }) => (
                          <strong className="font-semibold">
                            {children}
                          </strong>
                        ),

                        em: ({ children }) => (
                          <em className="italic">
                            {children}
                          </em>
                        ),

                        h1: ({ children }) => (
                          <h1 className="text-xl font-bold mt-4 mb-3 first:mt-0">
                            {children}
                          </h1>
                        ),

                        h2: ({ children }) => (
                          <h2 className="text-lg font-bold mt-4 mb-2 first:mt-0">
                            {children}
                          </h2>
                        ),

                        h3: ({ children }) => (
                          <h3 className="text-base font-semibold mt-4 mb-2 first:mt-0 text-primary">
                            {children}
                          </h3>
                        ),

                        ul: ({ children }) => (
                          <ul className="list-disc pl-6 mb-3 space-y-1.5">
                            {children}
                          </ul>
                        ),

                        ol: ({ children }) => (
                          <ol className="list-decimal pl-6 mb-3 space-y-1.5">
                            {children}
                          </ol>
                        ),

                        li: ({ children }) => (
                          <li className="leading-7 pl-1">
                            {children}
                          </li>
                        ),

                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-primary/40 pl-4 my-4 italic text-muted-foreground">
                            {children}
                          </blockquote>
                        ),

                        a: ({ children, href }) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline underline-offset-2 hover:opacity-80"
                          >
                            {children}
                          </a>
                        ),

                        hr: () => (
                          <hr className="my-4 border-border" />
                        ),

                        code: ({ children }) => (
                          <code className="rounded-md bg-background/60 px-1.5 py-0.5 text-xs font-mono">
                            {children}
                          </code>
                        ),

                        table: ({ children }) => (
                          <div className="my-4 overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-sm border-collapse">
                              {children}
                            </table>
                          </div>
                        ),

                        thead: ({ children }) => (
                          <thead className="bg-primary/10">
                            {children}
                          </thead>
                        ),

                        tr: ({ children }) => (
                          <tr className="border-b last:border-b-0">
                            {children}
                          </tr>
                        ),

                        th: ({ children }) => (
                          <th className="border-r last:border-r-0 px-3 py-2 text-left font-semibold whitespace-nowrap">
                            {children}
                          </th>
                        ),

                        td: ({ children }) => (
                          <td className="border-r last:border-r-0 px-3 py-2 align-top">
                            {children}
                          </td>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="whitespace-pre-wrap leading-7">
                      {msg.content}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}

            {mappingLoading && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="ml-11 rounded-2xl rounded-tl-none bg-primary/5 border border-primary/10 px-4 py-3"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="size-4 text-primary animate-pulse" />
                  <span>Understanding your message...</span>
                </div>
              </motion.div>
            )}

            {!mappingLoading &&
              mappedSymptoms &&
              mappedSymptoms.intent !== "medical_question" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-auto w-full max-w-3xl rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5"
                >
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Activity className="h-5 w-5 text-primary" />
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-semibold text-foreground">
                        Symptoms Identified
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        We translated your description into common clinical terms.
                      </p>
                    </div>
                  </div>

                  {Array.isArray(mappedSymptoms.mapped_symptoms) &&
                    mappedSymptoms.mapped_symptoms.length > 0 && (
                      <div className="space-y-3">
                        {mappedSymptoms.mapped_symptoms.map(
                          (symptom: any, index: number) => (
                            <div
                              key={`${symptom.clinical_term}-${index}`}
                              className="rounded-xl border border-border/50 bg-muted/30 p-4"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Your symptom
                                  </p>
                                  <p className="mt-1 text-sm text-foreground">
                                    {symptom.original ?? mappedSymptoms.original_text}
                                  </p>
                                </div>

                                <div className="hidden text-muted-foreground sm:block">
                                  →
                                </div>

                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Clinical term
                                  </p>
                                  <p className="mt-1 font-medium text-foreground">
                                    {symptom.clinical_term}
                                  </p>
                                </div>

                                {symptom.icd11_code && (
                                  <div className="sm:text-right">
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                      ICD-11
                                    </p>
                                    <span className="mt-1 inline-flex rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                      {symptom.icd11_code}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}

                  <div className="mt-4 flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {mappedSymptoms.clinical_summary}
                      </p>

                      {mappedSymptoms.systems_affected?.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Affected system:{" "}
                          {mappedSymptoms.systems_affected.join(", ")}
                        </p>
                      )}
                    </div>

                    <span className="inline-flex w-fit items-center rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                      Clinical terminology
                    </span>
                  </div>
                </motion.div>
              )}

            {/* Typing Indicator */}
            {isTyping && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 5,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="flex gap-3"
              >
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Bot className="size-4" />
                  </AvatarFallback>
                </Avatar>

                <div className="rounded-2xl rounded-tl-none px-5 py-4 bg-muted">
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="size-2 rounded-full bg-muted-foreground"
                        animate={{
                          opacity: [0.3, 1, 0.3],
                          y: [0, -2, 0],
                        }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </ScrollArea>
      {/* Quick Prompts */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
        {QUICK_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            variant="outline"
            size="xs"
            className="shrink-0 text-xs"
            onClick={() => sendMessage(prompt)}
            disabled={isTyping}
          >
            {prompt}
          </Button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <Input
            value={input}
            onChange={(e) =>
              setInput(e.target.value)
            }
            placeholder="Ask about your health..."
            aria-label="Message"
            className="flex-1"
            disabled={isTyping}
          />

          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isTyping}
            aria-label="Send message"
          >
            <Send
              className="size-4"
              aria-hidden="true"
            />
          </Button>
        </form>
      </div>
    </div>
  );
}