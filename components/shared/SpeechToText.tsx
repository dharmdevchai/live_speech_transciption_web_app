"use client";

import useSpeechRecognitionHook, {
  TranscriptUpdate,
} from "@/hooks/useSpeechRecognitionHook";
import React, { useState, useEffect, useCallback, useRef } from "react";

const SpeechToText2 = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState("http://127.0.0.1:8000");
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastProcessedLengthRef = useRef(0);

  const handleTranscriptUpdate = useCallback((update: TranscriptUpdate) => {
    setFinalText(update.finalText);
    setInterimText(update.interimText);
  }, []);

  const {
    hasRecognitionSupport,
    isListening,
    permissionDenied,
    errorMessage,
    startListening,
    stopListening,
    clearTranscript,
  } = useSpeechRecognitionHook(handleTranscriptUpdate);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [finalText, interimText]);

  useEffect(() => {
    if (!finalText) {
      lastProcessedLengthRef.current = 0;
      return;
    }

    if (finalText.length > lastProcessedLengthRef.current) {
      const newPhrase = finalText.slice(lastProcessedLengthRef.current).trim();
      lastProcessedLengthRef.current = finalText.length;

      if (newPhrase && baseUrl) {
        const cleanBaseUrl = baseUrl.replace(/\/$/, "");
        fetch(`${cleanBaseUrl}/receive-text?query=${encodeURIComponent(newPhrase)}`)
          .then((res) => res.json())
          .then((data) => {
            console.log("Forwarded to agent:", data);
          })
          .catch((err) => {
            console.error("Failed to send phrase:", err);
          });
      }
    }
  }, [finalText, baseUrl]);

  const fullText = [finalText, interimText]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const handleCopy = async () => {
    if (!fullText) return;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = fullText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleClear = () => {
    clearTranscript();
    setFinalText("");
    setInterimText("");
    lastProcessedLengthRef.current = 0;
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-800" />
      </div>
    );
  }

  if (!hasRecognitionSupport) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 px-4">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold text-zinc-900">
            Speech Recognition Not Supported
          </h1>
          <p className="text-zinc-600 text-sm leading-relaxed">
            Please use Google Chrome or Microsoft Edge (desktop or Android).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-zinc-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Live Speech Transcription
          </h1>
          <p className="text-sm text-zinc-500">
            English + Romanized Nepali
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-2">
          <label className="block text-xs font-medium text-zinc-600">
            Agent Base URL
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://127.0.0.1:8000"
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
            autoComplete="off"
          />
        </div>

        <div className="flex justify-center">
          {isListening ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-emerald-700 tracking-wide">
                Listening…
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-100 border border-zinc-200">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-400" />
              <span className="text-xs font-medium text-zinc-600 tracking-wide">
                Ready
              </span>
            </div>
          )}
        </div>

        <div className="relative">
          <div
            ref={scrollRef}
            className="w-full h-56 sm:h-64 overflow-y-auto rounded-xl border border-zinc-200 bg-white px-5 py-4 text-[15px] leading-relaxed shadow-sm"
          >
            {fullText ? (
              <p className="whitespace-pre-wrap break-words">
                <span className="text-zinc-900">{finalText}</span>
                {interimText && (
                  <span className="text-zinc-400">
                    {finalText ? " " : ""}
                    {interimText}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-zinc-400 select-none">
                {isListening
                  ? "Speak now…"
                  : "Press Start Listening and allow the microphone"}
              </p>
            )}
          </div>

          {fullText && (
            <div className="absolute bottom-3 right-3 text-[11px] text-zinc-400 font-medium tabular-nums">
              {fullText.split(/\s+/).filter(Boolean).length} words
            </div>
          )}
        </div>

        {(permissionDenied || errorMessage) && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage ||
              "Microphone permission denied. Allow it from the address bar and try again."}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          {!isListening ? (
            <button
              onClick={startListening}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
            >
              Start Listening
            </button>
          ) : (
            <button
              onClick={stopListening}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
            >
              Stop
            </button>
          )}

          <button
            onClick={handleClear}
            disabled={!fullText}
            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clear
          </button>

          <button
            onClick={handleCopy}
            disabled={!fullText}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <p className="text-center text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
          Black text = finished phrase. Gray text = still recognizing (updates in place).
        </p>
      </div>
    </div>
  );
};

export default SpeechToText2;
