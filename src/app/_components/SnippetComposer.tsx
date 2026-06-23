"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

type Phase = "idle" | "recording" | "review";

interface BrowserSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: { resultIndex: number; results: SpeechRecognitionResultList }) => void) | null;
  onerror: (() => void) | null;
}

function getSpeechRecognitionCtor(): (new () => BrowserSpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function SnippetComposer() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recognition = useRef<BrowserSpeechRecognition | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptParts = useRef<string[]>([]);

  const blurt = api.moment.blurt.useMutation({
    onSuccess: () => {
      setPhase("idle");
      setTranscript("");
      setSeconds(0);
      setError(null);
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
      recognition.current?.stop();
      mediaRecorder.current?.stop();
    };
  }, []);

  async function startRecording() {
    setError(null);
    transcriptParts.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();

      const SpeechRecognitionCtor = getSpeechRecognitionCtor();
      if (SpeechRecognitionCtor) {
        const sr = new SpeechRecognitionCtor();
        sr.continuous = true;
        sr.interimResults = true;
        sr.lang = "en-US";
        sr.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const chunk = event.results[i]?.[0]?.transcript?.trim();
            if (chunk && event.results[i]?.isFinal) {
              transcriptParts.current.push(chunk);
            }
          }
        };
        sr.onerror = () => {
          /* speech optional — mic still records duration */
        };
        sr.start();
        recognition.current = sr;
      }

      setSeconds(0);
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setPhase("recording");
    } catch {
      setError("Microphone access is required to record a snippet.");
    }
  }

  function stopRecording() {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }

    recognition.current?.stop();
    recognition.current = null;

    if (mediaRecorder.current?.state !== "inactive") {
      mediaRecorder.current?.stop();
    }
    mediaRecorder.current = null;

    const spoken = transcriptParts.current.join(" ").trim();
    setTranscript(spoken);
    setPhase("review");
  }

  function discard() {
    setPhase("idle");
    setTranscript("");
    setSeconds(0);
    setError(null);
  }

  function post() {
    const text = transcript.trim();
    if (!text) {
      setError("Add something to post.");
      return;
    }
    blurt.mutate({
      transcript: text,
      clipDurationSecs: seconds,
    });
  }

  if (phase === "review") {
    return (
      <div
        className="mb-6 flex flex-col gap-3 border-b pb-6"
        style={{ borderColor: "var(--color-juce-border)" }}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
            Review snippet
          </p>
          <span className="text-xs tabular-nums" style={{ color: "var(--color-muted)" }}>
            {seconds}s
          </span>
        </div>

        <Input
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="What did you say?"
          className="rounded-md"
          autoFocus
        />

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button
            onClick={post}
            disabled={blurt.isPending || !transcript.trim()}
            className="flex-1 rounded-md font-medium text-white hover:opacity-90"
            style={{ background: "var(--color-primary)" }}
          >
            {blurt.isPending ? "Posting…" : "Post snippet"}
          </Button>
          <Button onClick={discard} variant="ghost" className="rounded-md">
            Discard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mb-6 flex flex-col items-center gap-3 border-b pb-6"
      style={{ borderColor: "var(--color-juce-border)" }}
    >
      <button
        type="button"
        onClick={phase === "recording" ? stopRecording : startRecording}
        className={`flex size-16 items-center justify-center rounded-full transition-transform active:scale-95${phase === "recording" ? " squeeze-live" : ""}`}
        style={{
          background: phase === "recording" ? "var(--color-accent)" : "var(--color-secondary)",
          border: `2px solid ${phase === "recording" ? "var(--color-accent)" : "var(--color-primary)"}`,
        }}
        aria-label={phase === "recording" ? "Stop recording" : "Record snippet"}
      >
        {phase === "recording" ? (
          <Square className="size-5 text-white" fill="currentColor" />
        ) : (
          <Mic className="size-6" style={{ color: "var(--color-primary)" }} />
        )}
      </button>

      <p className="text-center text-sm" style={{ color: "var(--color-muted)" }}>
        {phase === "recording"
          ? `Recording… ${seconds}s`
          : "Tap to blurt a snippet to your timeline"}
      </p>

      {error && <p className="text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
