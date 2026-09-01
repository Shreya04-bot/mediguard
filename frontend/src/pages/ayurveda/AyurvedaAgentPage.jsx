import React, { useState } from "react";
import {
  Bot,
  Leaf,
  Send,
  User,
  Sparkles,
  AlertCircle,
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";


// =========================================================
// MARKDOWN MESSAGE
// UI ONLY — does not change API/functionality
// =========================================================

const MarkdownMessage = ({ content }) => {
  return (
    <div
      className="
        prose prose-sm max-w-none
        prose-slate
        prose-headings:text-slate-900
        prose-h2:mb-3 prose-h2:mt-6 prose-h2:text-lg prose-h2:font-bold
        prose-h3:mb-2 prose-h3:mt-5 prose-h3:text-base prose-h3:font-semibold
        prose-p:my-2 prose-p:leading-7
        prose-strong:font-semibold prose-strong:text-slate-900
        prose-ul:my-3 prose-ol:my-3
        prose-li:my-1 prose-li:leading-6
        prose-blockquote:border-emerald-400
        prose-blockquote:bg-emerald-50
        prose-blockquote:px-4
        prose-blockquote:py-2
      "
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // -----------------------------------------
          // TABLE
          // -----------------------------------------
          table: ({ children }) => (
            <div className="my-4 w-full overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),

          thead: ({ children }) => (
            <thead className="bg-emerald-50 text-slate-800">
              {children}
            </thead>
          ),

          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-200 bg-white">
              {children}
            </tbody>
          ),

          tr: ({ children }) => (
            <tr className="transition hover:bg-slate-50">
              {children}
            </tr>
          ),

          th: ({ children }) => (
            <th className="border-b border-emerald-100 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-emerald-800">
              {children}
            </th>
          ),

          td: ({ children }) => (
            <td className="border-b border-slate-100 px-4 py-3 align-top leading-6 text-slate-700">
              {children}
            </td>
          ),

          // -----------------------------------------
          // HEADINGS
          // -----------------------------------------
          h1: ({ children }) => (
            <h1 className="mb-4 mt-2 text-xl font-bold text-slate-900">
              {children}
            </h1>
          ),

          h2: ({ children }) => (
            <h2 className="mb-3 mt-6 flex items-center gap-2 text-lg font-bold text-slate-900">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {children}
            </h2>
          ),

          h3: ({ children }) => (
            <h3 className="mb-2 mt-5 text-base font-semibold text-emerald-800">
              {children}
            </h3>
          ),

          // -----------------------------------------
          // PARAGRAPHS
          // -----------------------------------------
          p: ({ children }) => (
            <p className="my-2 leading-7 text-slate-700">
              {children}
            </p>
          ),

          // -----------------------------------------
          // LISTS
          // -----------------------------------------
          ul: ({ children }) => (
            <ul className="my-3 space-y-1.5 pl-6 text-slate-700">
              {children}
            </ul>
          ),

          ol: ({ children }) => (
            <ol className="my-3 space-y-2 pl-6 text-slate-700">
              {children}
            </ol>
          ),

          li: ({ children }) => (
            <li className="leading-7 pl-1">
              {children}
            </li>
          ),

          // -----------------------------------------
          // STRONG / BOLD
          // -----------------------------------------
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900">
              {children}
            </strong>
          ),

          // -----------------------------------------
          // LINKS
          // -----------------------------------------
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
            >
              {children}
            </a>
          ),

          // -----------------------------------------
          // HORIZONTAL RULE
          // -----------------------------------------
          hr: () => (
            <hr className="my-6 border-slate-200" />
          ),

          // -----------------------------------------
          // CODE
          // -----------------------------------------
          code: ({ inline, children }) =>
            inline ? (
              <code className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                {children}
              </code>
            ) : (
              <pre className="my-4 overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm text-slate-100">
                <code>{children}</code>
              </pre>
            ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};


// =========================================================
// MAIN PAGE
// =========================================================

const AyurvedaAgentPage = () => {
  const { user } = useAuth();

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Namaste! 🌿 I'm your Ayurveda AI Assistant. Ask me about your Dosha, Ayurvedic diet, yoga, herbs, or general wellness guidance.",
    },
  ]);

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);


  // =========================================================
  // SEND MESSAGE
  // FUNCTIONALITY UNCHANGED
  // =========================================================

  const sendMessage = async () => {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || loading) {
      return;
    }

    // Show user's message immediately
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: trimmedQuestion,
      },
    ]);

    setQuestion("");
    setLoading(true);


    try {
      const data = await api.post(
        "/features/ayurveda/agent",
        {
          patient_data: {
            name: user?.name || "Patient",
            age: user?.age || null,
            gender: user?.gender || null,
          },

          prediction_result: {},

          prakriti_result: {},

          language: "en",

          messages: [
            {
              role: "user",
              content: trimmedQuestion,
            },
          ],
        }
      );


      console.log("AYURVEDA API RESPONSE:", data);


      const assistantMessage =
        data?.ayurveda_output ||
        data?.response ||
        data?.answer ||
        data?.message ||
        data?.output ||
        data?.result ||
        "I couldn't generate a response right now. Please try again.";


      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: assistantMessage,
        },
      ]);
    } catch (error) {
      console.error("Ayurveda AI error:", error);

      const errorMessage =
        error?.message ||
        error?.details?.detail ||
        error?.details?.message ||
        "Unable to connect to the Ayurveda AI Assistant.";

      setMessages((prev) => [
        ...prev,
        {
          role: "error",
          content: errorMessage,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };


  // =========================================================
  // ENTER KEY
  // FUNCTIONALITY UNCHANGED
  // =========================================================

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };


  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="space-y-6">

      {/* ================================================
          PAGE HEADER
      ================================================= */}

      <PageHeader
        title="Ayurveda AI Assistant"
        description="Personalized Ayurvedic guidance based on your Prakriti and health profile."
      />


      <div className="flex justify-center">

        <Card
          className="
            w-full max-w-5xl
            overflow-hidden
            border-slate-200
            bg-white
            shadow-sm
          "
        >

          {/* ================================================
              ASSISTANT HEADER
          ================================================= */}

          <div
            className="
              relative
              flex items-center gap-4
              overflow-hidden
              border-b
              border-emerald-100
              bg-gradient-to-r
              from-emerald-50
              via-white
              to-teal-50
              px-6 py-5
            "
          >

            {/* Decorative background */}
            <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-emerald-100/40 blur-2xl" />

            {/* Avatar */}
            <div
              className="
                relative
                flex h-14 w-14 shrink-0
                items-center justify-center
                rounded-2xl
                bg-gradient-to-br
                from-emerald-500
                to-teal-600
                text-white
                shadow-md
              "
            >
              <Leaf className="h-7 w-7" />
            </div>


            {/* Header content */}
            <div className="relative flex-1">

              <div className="flex flex-wrap items-center gap-2">

                <h2 className="text-lg font-bold text-slate-900">
                  Your Ayurveda Assistant
                </h2>

                <span
                  className="
                    inline-flex items-center gap-1
                    rounded-full
                    bg-emerald-100
                    px-2.5 py-1
                    text-[11px]
                    font-semibold
                    text-emerald-700
                  "
                >
                  <Sparkles className="h-3 w-3" />
                  AI Powered
                </span>

              </div>

              <p className="mt-1 text-sm text-slate-500">
                Ask about diet, yoga, herbs, Dosha, or Ayurvedic wellness.
              </p>

            </div>

          </div>


          {/* ================================================
              CHAT AREA
          ================================================= */}

          <div
            className="
              h-[560px]
              space-y-6
              overflow-y-auto
              bg-gradient-to-b
              from-slate-50/70
              to-white
              p-5
              sm:p-6
            "
          >

            {messages.map((message, index) => {

              const isUser = message.role === "user";
              const isError = message.role === "error";


              return (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${
                    isUser
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >

                  {/* ========================================
                      ASSISTANT / ERROR AVATAR
                  ======================================== */}

                  {!isUser && (
                    <div
                      className={`
                        flex h-10 w-10 shrink-0
                        items-center justify-center
                        rounded-full
                        shadow-sm
                        ${
                          isError
                            ? "bg-red-100 text-red-600"
                            : "bg-emerald-100 text-emerald-600"
                        }
                      `}
                    >
                      {isError ? (
                        <AlertCircle className="h-5 w-5" />
                      ) : (
                        <Bot className="h-5 w-5" />
                      )}
                    </div>
                  )}


                  {/* ========================================
                      MESSAGE BUBBLE
                  ======================================== */}

                  <div
                    className={`
                      max-w-[92%]
                      sm:max-w-[82%]
                      rounded-2xl
                      ${
                        isUser
                          ? `
                            rounded-br-md
                            bg-gradient-to-br
                            from-emerald-600
                            to-teal-600
                            px-5 py-3.5
                            text-white
                            shadow-sm
                          `
                          : isError
                          ? `
                            rounded-bl-md
                            border
                            border-red-200
                            bg-red-50
                            px-5 py-4
                            text-red-700
                            shadow-sm
                          `
                          : `
                            rounded-bl-md
                            border
                            border-slate-200
                            bg-white
                            px-5 py-4
                            shadow-sm
                          `
                      }
                    `}
                  >

                    {isUser ? (
                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {message.content}
                      </p>
                    ) : isError ? (
                      <p className="text-sm leading-6">
                        {message.content}
                      </p>
                    ) : (
                      <MarkdownMessage content={message.content} />
                    )}

                  </div>


                  {/* ========================================
                      USER AVATAR
                  ======================================== */}

                  {isUser && (
                    <div
                      className="
                        flex h-10 w-10 shrink-0
                        items-center justify-center
                        rounded-full
                        bg-slate-100
                        text-slate-600
                        shadow-sm
                      "
                    >
                      <User className="h-5 w-5" />
                    </div>
                  )}

                </div>
              );
            })}


            {/* ================================================
                LOADING / TYPING INDICATOR
            ================================================= */}

            {loading && (
              <div className="flex items-start gap-3">

                <div
                  className="
                    flex h-10 w-10 shrink-0
                    items-center justify-center
                    rounded-full
                    bg-emerald-100
                    text-emerald-600
                    shadow-sm
                  "
                >
                  <Bot className="h-5 w-5" />
                </div>


                <div
                  className="
                    flex items-center gap-2
                    rounded-2xl
                    rounded-bl-md
                    border
                    border-slate-200
                    bg-white
                    px-5 py-4
                    shadow-sm
                  "
                >

                  <span className="text-sm text-slate-500">
                    Ayurveda AI is thinking
                  </span>

                  <div className="flex gap-1">

                    <span
                      className="
                        h-1.5 w-1.5
                        animate-bounce
                        rounded-full
                        bg-emerald-500
                      "
                    />

                    <span
                      className="
                        h-1.5 w-1.5
                        animate-bounce
                        rounded-full
                        bg-emerald-500
                        [animation-delay:150ms]
                      "
                    />

                    <span
                      className="
                        h-1.5 w-1.5
                        animate-bounce
                        rounded-full
                        bg-emerald-500
                        [animation-delay:300ms]
                      "
                    />

                  </div>

                </div>

              </div>
            )}

          </div>


          {/* ================================================
              INPUT AREA
          ================================================= */}

          <div
            className="
              border-t
              border-slate-200
              bg-white
              p-4
              sm:p-5
            "
          >

            <div
              className="
                flex items-end gap-3
                rounded-2xl
                border
                border-slate-200
                bg-slate-50/60
                p-2
                transition
                focus-within:border-emerald-400
                focus-within:bg-white
                focus-within:ring-4
                focus-within:ring-emerald-50
              "
            >

              <textarea
                value={question}
                onChange={(event) =>
                  setQuestion(event.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder="Ask your Ayurveda question..."
                rows={1}
                disabled={loading}
                className="
                  min-h-[48px]
                  flex-1
                  resize-none
                  border-0
                  bg-transparent
                  px-3
                  py-3
                  text-sm
                  text-slate-800
                  outline-none
                  placeholder:text-slate-400
                  focus:ring-0
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              />


              <button
                type="button"
                onClick={sendMessage}
                disabled={!question.trim() || loading}
                aria-label="Send message"
                className="
                  flex h-11 w-11
                  shrink-0
                  items-center justify-center
                  rounded-xl
                  bg-gradient-to-br
                  from-emerald-600
                  to-teal-600
                  text-white
                  shadow-sm
                  transition-all
                  hover:-translate-y-0.5
                  hover:shadow-md
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                  disabled:hover:translate-y-0
                  disabled:hover:shadow-sm
                "
              >
                <Send className="h-5 w-5" />
              </button>

            </div>


            {/* ================================================
                DISCLAIMER
            ================================================= */}

            <div className="mt-3 flex items-start gap-2 px-1">

              <Leaf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />

              <p className="text-[11px] leading-5 text-slate-400">
                Ayurvedic guidance is complementary wellness information
                and does not replace professional medical advice.
              </p>

            </div>

          </div>

        </Card>

      </div>

    </div>
  );
};


export default AyurvedaAgentPage;