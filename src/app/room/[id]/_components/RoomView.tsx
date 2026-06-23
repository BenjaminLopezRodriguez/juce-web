"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Radio } from "lucide-react";
import { api } from "~/trpc/react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { IVSPlayer } from "./IVSPlayer";

const SOLO_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const HEARTBEAT_INTERVAL_MS = 30_000;   // 30 seconds

interface Props {
  room: {
    id: number;
    title: string;
    state: "live" | "ended" | "scheduled";
    paletteFrom: string;
    paletteTo: string;
    listenerCount: number;
    ivsPlaybackUrl: string | null;
    host: { id: number; handle: string; displayName: string; paletteFrom: string; paletteTo: string };
  };
  currentUser: { id: number; handle: string; displayName: string };
  isHost: boolean;
}

export function RoomView({ room: initialRoom, currentUser, isHost }: Props) {
  const router = useRouter();
  const [ended, setEnded] = useState(initialRoom.state === "ended");
  const [listenerCount, setListenerCount] = useState(initialRoom.listenerCount);
  const [soloSince, setSoloSince] = useState<number | null>(null);
  const [soloSecondsLeft, setSoloSecondsLeft] = useState<number | null>(null);
  const hasJoined = useRef(false);
  const soloTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const join = api.room.join.useMutation();
  const leave = api.room.leave.useMutation();
  const end = api.room.end.useMutation({
    onSuccess: () => {
      setEnded(true);
      router.refresh();
    },
  });

  // Poll heartbeat every 30 s to get fresh listener count + state
  const heartbeat = api.room.heartbeat.useQuery(
    { roomId: initialRoom.id },
    {
      refetchInterval: HEARTBEAT_INTERVAL_MS,
      enabled: !ended,
    },
  );

  // Sync heartbeat results
  useEffect(() => {
    if (!heartbeat.data) return;
    setListenerCount(heartbeat.data.listenerCount);
    if (heartbeat.data.state === "ended") setEnded(true);
  }, [heartbeat.data]);

  // ── Solo idle timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (ended) return;

    if (listenerCount <= 1) {
      if (soloSince === null) setSoloSince(Date.now());
    } else {
      setSoloSince(null);
      setSoloSecondsLeft(null);
    }
  }, [listenerCount, ended, soloSince]);

  useEffect(() => {
    if (soloSince === null || ended) {
      if (soloTimer.current) clearInterval(soloTimer.current);
      soloTimer.current = null;
      return;
    }

    soloTimer.current = setInterval(() => {
      const elapsed = Date.now() - soloSince;
      const left = Math.max(0, Math.ceil((SOLO_TIMEOUT_MS - elapsed) / 1000));
      setSoloSecondsLeft(left);

      if (left === 0) {
        clearInterval(soloTimer.current!);
        // Auto-end if host, else just leave (server auto-ends when count → 0)
        if (isHost) {
          end.mutate({ roomId: initialRoom.id });
        } else {
          leave.mutate({ roomId: initialRoom.id });
          setEnded(true);
        }
      }
    }, 1000);

    return () => {
      if (soloTimer.current) clearInterval(soloTimer.current);
    };
  }, [soloSince, ended, isHost, initialRoom.id, end, leave]);

  // ── Join on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasJoined.current || ended) return;
    hasJoined.current = true;
    join.mutate({ roomId: initialRoom.id });
  }, [initialRoom.id, ended, join]);

  // ── Leave on unmount / tab close ─────────────────────────────────────────
  const handleLeave = useCallback(() => {
    if (!ended) {
      leave.mutate({ roomId: initialRoom.id });
    }
  }, [ended, initialRoom.id, leave]);

  useEffect(() => {
    const onUnload = () => {
      // keepalive fetch so the server gets the leave even on tab close
      const url = `/api/trpc/room.leave?batch=1`;
      navigator.sendBeacon(
        url,
        JSON.stringify({ 0: { json: { roomId: initialRoom.id } } }),
      );
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      handleLeave();
    };
  }, [handleLeave, initialRoom.id]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function formatCountdown(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  // ── Ended state ───────────────────────────────────────────────────────────
  if (ended) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ background: "var(--color-surface)" }}
      >
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "var(--color-juce-muted-bg)" }}
        >
          <Radio className="h-7 w-7" style={{ color: "var(--color-text-muted)" }} />
        </div>
        <h2 className="text-xl font-black" style={{ color: "var(--color-app-primary)" }}>
          This room has ended
        </h2>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          &ldquo;{initialRoom.title}&rdquo;
        </p>
        <Button
          onClick={() => router.push("/")}
          className="mt-2 rounded-full font-semibold text-white"
          style={{ background: "var(--color-live-accent)" }}
        >
          Back to home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--color-room-dark)" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => { handleLeave(); router.push("/"); }}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-opacity hover:opacity-70"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-sm font-bold text-white line-clamp-1 max-w-[180px]">
            {initialRoom.title}
          </span>
          <div className="flex items-center gap-1.5">
            <Badge
              className="live-dot rounded-full bg-transparent text-[10px] font-extrabold uppercase tracking-wider text-white"
            >
              Live
            </Badge>
            <span className="flex items-center gap-1 text-xs text-white/60">
              <Users className="h-3 w-3" />
              {listenerCount}
            </span>
          </div>
        </div>

        {isHost ? (
          <Button
            onClick={() => end.mutate({ roomId: initialRoom.id })}
            disabled={end.isPending}
            className="h-9 rounded-full px-4 text-xs font-bold text-white"
            style={{ background: "var(--color-squeeze-accent)" }}
          >
            End
          </Button>
        ) : (
          <Button
            onClick={() => { handleLeave(); router.push("/"); }}
            variant="ghost"
            className="h-9 rounded-full px-4 text-xs font-medium text-white hover:bg-white/10"
          >
            Leave
          </Button>
        )}
      </header>

      {/* Video / Audio stream */}
      <div
        className="relative mx-4 overflow-hidden rounded-3xl"
        style={{
          aspectRatio: "9/16",
          maxHeight: "calc(100vh - 180px)",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        {initialRoom.ivsPlaybackUrl ? (
          <IVSPlayer playbackUrl={initialRoom.ivsPlaybackUrl} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-white/40">Waiting for stream…</p>
          </div>
        )}

        {/* Solo idle warning overlay */}
        {soloSecondsLeft !== null && soloSecondsLeft < 60 && (
          <div
            className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 px-4 py-4"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}
          >
            <p className="text-xs font-semibold text-white/80">
              You&apos;re the only one here
            </p>
            <p className="text-2xl font-black tabular-nums text-white">
              {formatCountdown(soloSecondsLeft)}
            </p>
            <p className="text-[10px] text-white/50">Auto-ending stream</p>
            <Button
              onClick={() => { setSoloSince(null); setSoloSecondsLeft(null); }}
              variant="ghost"
              className="mt-1 h-8 rounded-full px-5 text-xs font-semibold text-white hover:bg-white/10"
            >
              Keep going
            </Button>
          </div>
        )}
      </div>

      {/* Solo banner (not yet in final-minute countdown) */}
      {soloSecondsLeft !== null && soloSecondsLeft >= 60 && (
        <div className="mx-4 mt-3 flex items-center justify-between rounded-2xl px-4 py-3"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          <p className="text-sm text-white/70">
            You&apos;re the only one — ending in{" "}
            <span className="font-bold text-white tabular-nums">
              {formatCountdown(soloSecondsLeft)}
            </span>
          </p>
          <Button
            onClick={() => { setSoloSince(null); setSoloSecondsLeft(null); }}
            variant="ghost"
            className="h-7 rounded-full px-3 text-xs text-white/70 hover:bg-white/10"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Host card */}
      <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{ background: "rgba(255,255,255,0.06)" }}>
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarFallback
            className="bubble-gradient text-xs font-bold text-white"
            style={{
              "--palette-from": initialRoom.host.paletteFrom,
              "--palette-to": initialRoom.host.paletteTo,
            } as React.CSSProperties}
          >
            {initialRoom.host.handle.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col leading-none gap-0.5">
          <span className="text-sm font-semibold text-white">{initialRoom.host.displayName}</span>
          <span className="text-xs text-white/50">@{initialRoom.host.handle} · host</span>
        </div>
      </div>
    </div>
  );
}
