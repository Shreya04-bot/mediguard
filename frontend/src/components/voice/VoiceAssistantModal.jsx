import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  X,
  Loader2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

import { VoiceWaveVisualizer } from "./VoiceWaveVisualizer";
import { useVoice } from "../../hooks/useVoice";
import { processVoiceQueryApi } from "../../services/voiceService";
import { useAuth } from "../../hooks/useAuth";

export const VoiceAssistantModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const {
    isListening,
    transcript,
    isSpeaking,
    startListening,
    stopListening,
    speakText,
    setTranscript,
  } = useVoice();

  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const lastProcessedTranscript = useRef("");

  const handleQuery = useCallback(
    async (queryText) => {
      if (!queryText?.trim() || loading) return;

      setLoading(true);
      setResponse("");

      try {
        const role = user?.role?.toLowerCase() || "patient";

        const res = await processVoiceQueryApi(
          queryText.trim(),
          role
        );

        const reply =
          res?.reply ||
          "I received your question, but I couldn't generate a response.";

        setResponse(reply);

        // Read response aloud
        speakText(reply);
      } catch (error) {
        console.error("Voice query failed:", error);

        setResponse(
          "I couldn't process your request right now. Please try again."
        );
      } finally {
        setLoading(false);
      }
    },
    [user?.role, speakText, loading]
  );

  /*
   * Automatically submit the transcript when
   * browser speech recognition finishes.
   */
  useEffect(() => {
    if (
      !isListening &&
      transcript?.trim() &&
      transcript.trim() !== lastProcessedTranscript.current &&
      !loading
    ) {
      const query = transcript.trim();

      lastProcessedTranscript.current = query;

      handleQuery(query);
    }
  }, [isListening, transcript, loading, handleQuery]);

  const handleMicToggle = () => {
    if (loading) return;

    if (isListening) {
      stopListening();
      return;
    }

    setResponse("");
    setTranscript("");
    lastProcessedTranscript.current = "";

    startListening();
  };

  const handleClose = () => {
    if (isListening) {
      stopListening();
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    onClose?.();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent
        className="
          max-w-2xl
          w-[95vw]
          max-h-[90vh]
          overflow-hidden
          p-0
          border
          border-white/10
          bg-[#071018]
          text-white
          shadow-2xl
          rounded-3xl
        "
      >
        {/* HEADER */}
        <div className="relative px-6 py-5 border-b border-white/10 bg-gradient-to-r from-teal-500/10 via-transparent to-emerald-500/10">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500/15 border border-teal-400/20">
              <Sparkles className="h-5 w-5 text-teal-400" />
            </div>

            <div>
              <h2 className="text-lg font-semibold">
                MediGuard AI
              </h2>

              <p className="text-xs text-slate-400">
                Voice health assistant
              </p>
            </div>

          </div>

          <button
            onClick={handleClose}
            className="
              absolute
              right-4
              top-4
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-full
              text-slate-400
              hover:bg-white/10
              hover:text-white
              transition
            "
          >
            <X className="h-4 w-4" />
          </button>

        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="max-h-[calc(90vh-80px)] overflow-y-auto">

          <div className="px-6 py-8">

            {/* VOICE AREA */}
            <div className="flex flex-col items-center">

              {/* AI ORB */}
              <div
                className={`
                  relative
                  flex
                  h-24
                  w-24
                  items-center
                  justify-center
                  rounded-full
                  transition-all
                  duration-500
                  ${
                    isListening
                      ? "bg-teal-500/20 ring-4 ring-teal-400/10 scale-105"
                      : loading
                      ? "bg-blue-500/20 ring-4 ring-blue-400/10"
                      : isSpeaking
                      ? "bg-emerald-500/20 ring-4 ring-emerald-400/10"
                      : "bg-slate-800/80"
                  }
                `}
              >

                <div
                  className="
                    flex
                    h-14
                    w-14
                    items-center
                    justify-center
                    rounded-full
                    bg-gradient-to-br
                    from-teal-400
                    to-emerald-500
                    shadow-lg
                    shadow-teal-500/20
                  "
                >
                  {loading ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : isListening ? (
                    <Mic className="h-6 w-6 text-white" />
                  ) : isSpeaking ? (
                    <Volume2 className="h-6 w-6 text-white" />
                  ) : (
                    <Sparkles className="h-6 w-6 text-white" />
                  )}
                </div>

              </div>

              {/* WAVE */}
              <div className="mt-5">
                <VoiceWaveVisualizer
                  active={isListening || loading || isSpeaking}
                />
              </div>

              {/* STATUS */}
              <p className="mt-3 text-sm font-medium text-slate-300">
                {loading
                  ? "MediGuard AI is thinking..."
                  : isListening
                  ? "Listening..."
                  : isSpeaking
                  ? "Speaking..."
                  : transcript
                  ? "I heard you"
                  : "Tap the microphone to speak"}
              </p>

              {/* TRANSCRIPT */}
              {transcript && (
                <div
                  className="
                    mt-5
                    w-full
                    max-w-xl
                    rounded-2xl
                    border
                    border-white/10
                    bg-white/[0.03]
                    px-5
                    py-4
                  "
                >
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    You said
                  </div>

                  <p className="text-sm leading-6 text-slate-200">
                    {transcript}
                  </p>
                </div>
              )}

              {/* MICROPHONE BUTTON */}
              <button
                onClick={handleMicToggle}
                disabled={loading}
                className={`
                  mt-6
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-full
                  shadow-xl
                  transition-all
                  duration-300
                  ${
                    loading
                      ? "cursor-not-allowed bg-slate-700 opacity-60"
                      : isListening
                      ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20 scale-105"
                      : "bg-teal-500 hover:bg-teal-400 shadow-teal-500/20 hover:scale-105"
                  }
                `}
              >
                {isListening ? (
                  <MicOff className="h-6 w-6 text-white" />
                ) : (
                  <Mic className="h-6 w-6 text-white" />
                )}
              </button>

              <p className="mt-3 text-[11px] text-slate-500">
                {isListening
                  ? "Tap again to stop"
                  : "Ask about symptoms, reports, or general health"}
              </p>

            </div>

            {/* AI RESPONSE */}
            {response && (
              <div className="mt-8">

                <div className="mb-3 flex items-center gap-2">

                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/15">
                    <Sparkles className="h-4 w-4 text-teal-400" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      MediGuard AI
                    </p>

                    <p className="text-[10px] text-slate-500">
                      AI health guidance
                    </p>
                  </div>

                </div>

                <div
                  className="
                    rounded-2xl
                    border
                    border-white/10
                    bg-[#101923]
                    px-5
                    py-5
                    shadow-lg
                  "
                >

                  <div
                    className="
                      prose
                      prose-invert
                      prose-sm
                      max-w-none

                      prose-p:leading-7
                      prose-p:text-slate-200

                      prose-headings:text-white
                      prose-headings:font-semibold

                      prose-h3:text-base
                      prose-h3:mt-5
                      prose-h3:mb-2

                      prose-strong:text-teal-300

                      prose-li:text-slate-200
                      prose-li:leading-6

                      prose-a:text-teal-400
                    "
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ children }) => (
                          <div className="my-4 overflow-x-auto rounded-xl border border-white/10">
                            <table className="w-full text-sm">
                              {children}
                            </table>
                          </div>
                        ),

                        th: ({ children }) => (
                          <th className="border-b border-white/10 bg-white/[0.03] px-3 py-2 text-left font-semibold text-teal-300">
                            {children}
                          </th>
                        ),

                        td: ({ children }) => (
                          <td className="border-b border-white/5 px-3 py-2 text-slate-300">
                            {children}
                          </td>
                        ),

                        ul: ({ children }) => (
                          <ul className="my-3 list-disc space-y-1 pl-5">
                            {children}
                          </ul>
                        ),

                        ol: ({ children }) => (
                          <ol className="my-3 list-decimal space-y-1 pl-5">
                            {children}
                          </ol>
                        ),
                      }}
                    >
                      {response}
                    </ReactMarkdown>
                  </div>

                </div>

                {/* AUDIO INDICATOR */}
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">

                  <Volume2
                    className={`h-3.5 w-3.5 ${
                      isSpeaking
                        ? "text-teal-400 animate-pulse"
                        : ""
                    }`}
                  />

                  <span>
                    {isSpeaking
                      ? "Playing AI response..."
                      : "AI response"}
                  </span>

                </div>

              </div>
            )}

          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};