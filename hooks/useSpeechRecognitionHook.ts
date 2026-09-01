"use client";

import { useEffect, useState, useRef, useCallback } from "react";

export type TranscriptUpdate = {
  finalText: string;
  interimText: string;
};

const useSpeechRecognitionHook = (
  onTranscriptUpdate: (update: TranscriptUpdate) => void
) => {
  const [hasRecognitionSupport, setHasRecognitionSupport] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const shouldListenRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const finalTextRef = useRef("");
  const isStartingRef = useRef(false);

  const onTranscriptUpdateRef = useRef(onTranscriptUpdate);
  useEffect(() => {
    onTranscriptUpdateRef.current = onTranscriptUpdate;
  }, [onTranscriptUpdate]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setHasRecognitionSupport(false);
      return;
    }

    setHasRecognitionSupport(true);

    const recognition = new SpeechRecognition();

    // continuous = false is more stable and avoids the "hellohellohello..." bug
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();

        if (result.isFinal) {
          if (transcript) {
            finalTextRef.current =
              (finalTextRef.current ? finalTextRef.current + " " : "") +
              transcript;
          }
        } else {
          // Always overwrite interim (never append)
          interim = transcript;
        }
      }

      onTranscriptUpdateRef.current({
        finalText: finalTextRef.current,
        interimText: interim,
      });
    };

    recognition.onerror = (event: any) => {
      const err = event.error;

      if (err === "not-allowed" || err === "service-not-allowed") {
        setPermissionDenied(true);
        setErrorMessage(
          "Microphone permission denied. Allow access in the browser address bar."
        );
        shouldListenRef.current = false;
        setIsListening(false);
        return;
      }

      if (
        err === "no-speech" ||
        err === "aborted" ||
        err === "network" ||
        err === "audio-capture"
      ) {
        return;
      }

      console.warn("Speech recognition error:", err);
      setErrorMessage(`Recognition error: ${err}`);
    };

    recognition.onend = () => {
      if (shouldListenRef.current && !isStartingRef.current) {
        setTimeout(() => {
          if (shouldListenRef.current && recognitionRef.current) {
            try {
              isStartingRef.current = true;
              recognitionRef.current.start();
            } catch {
              // ignore
            } finally {
              isStartingRef.current = false;
            }
          }
        }, 250);
      } else {
        setIsListening(false);
      }
    };

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMessage(null);
      isStartingRef.current = false;
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isStartingRef.current) return;

    setPermissionDenied(false);
    setErrorMessage(null);
    shouldListenRef.current = true;

    finalTextRef.current = "";
    onTranscriptUpdateRef.current({ finalText: "", interimText: "" });

    try {
      isStartingRef.current = true;
      recognitionRef.current.start();
    } catch {
      setIsListening(true);
      isStartingRef.current = false;
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    setIsListening(false);
    isStartingRef.current = false;

    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const clearTranscript = useCallback(() => {
    finalTextRef.current = "";
    onTranscriptUpdateRef.current({ finalText: "", interimText: "" });
  }, []);

  return {
    hasRecognitionSupport,
    isListening,
    permissionDenied,
    errorMessage,
    startListening,
    stopListening,
    clearTranscript,
  };
};

export default useSpeechRecognitionHook;
