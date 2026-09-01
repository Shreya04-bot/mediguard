import { useState, useCallback, useRef } from "react";

export const useVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef(null);

  const startListening = useCallback(() => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let text = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }

      setTranscript(text);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    setIsListening(false);
  }, []);

  const speakText = useCallback((text) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/#{1,6}\s?/g, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/\|/g, " ")
      .replace(/-{3,}/g, " ")
      .replace(/\n+/g, " ");

    const utterance = new SpeechSynthesisUtterance(cleanText);

    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  return {
    isListening,
    transcript,
    isSpeaking,
    startListening,
    stopListening,
    speakText,
    setTranscript,
  };
};