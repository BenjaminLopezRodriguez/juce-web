"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Radio } from "lucide-react";
import { api } from "~/trpc/react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import { IVSPlayer } from "./IVSPlayer";

const SOLO_TIMEOUT_MS = 5 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 30_000;

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
  const [showEndConfirm, setShowEndConfirm] = useState(false);
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
  const heartbeat = api.room.heartbeat.useMutation();

  // Heartbeat — pings presence and returns cleaned active count
  useEffect(() => {
    if (ended) return;

    const ping = () =>
      heartbeat.mutate(
        { roomId: initialRoom.id },
        {
          onSuccess: (data) => {
            setListenerCount(data.listenerCount);
            if (data.state === "ended") setEnded(true);
          },
        },
      );

    ping();
    const id = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
    // heartbeat.mutate is stable; exhaustive-deps would cause interval churn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended, initialRoom.id]);

  // Solo detection
  useEffect(() => {
    if (ended) return;
    if (listenerCount <= 1) {
      if (soloSince === null) setSoloSince(Date.now());
    } else {
      setSoloSince(null);
      setSoloSecondsLeft(null);
    }
  }, [listenerCount, ended, soloSince]);

  // Solo countdown
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
        soloTimer.current = null;
        if (isHost) {
          // Ask the host — don't auto-end
          setShowEndConfirm(true);
        } else {
          leave.mutate({ roomId: initialRoom.id });
          setEnded(true);
        }
      }
    }, 1000);

    return () => {
      if (soloTimer.current) clearInterval(soloTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soloSince, ended, isHost, initialRoom.id]);

  // Join on mount
  useEffect(() => {
    if (hasJoined.current || ended) return;
    hasJoined.current = true;
    join.mutate({ roomId: initialRoom.id });
  }, [initialRoom.id, ended, join]);

  // Leave on unmount / tab close
  // Omit `leave` from deps — leave.mutate is stable in react-query v5;
  // including the mutation object would recreate this callback every render
  // and cause the effect below to call leave.mutate on every render.
  const handleLeave = useCallback(() => {
    if (!ended) leave.mutate({ roomId: initialRoom.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended, initialRoom.id]);

  useEffect(() => {
    const onUnload = () => {
      navigator.sendBeacon(
        `/api/trpc/room.leave?batch=1`,
        JSON.stringify({ 0: { json: { roomId: initialRoom.id } } }),
      );
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      handleLeave();
    };
  }, [handleLeave, initialRoom.id]);

  function formatCountdown(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function keepGoing() {
    setShowEndConfirm(false);
    setSoloSince(Date.now());
    setSoloSecondsLeft(null);
  }

  // ── Ended state ───────────────────────────────────────────────────────────
  if (ended) {
    return (
      <div className="juce-shell flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <div
          className="flex size-16 items-center justify-center"
          style={{ background: "var(--color-secondary)", borderRadius: "var(--radius-base)" }}
        >
          <Radio className="size-7" style={{ color: "var(--color-muted)" }} />
        </div>
        <h2 className="font-heading text-xl font-semibold" style={{ color: "var(--color-text)" }}>
          This room has ended
        </h2>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          &ldquo;{initialRoom.title}&rdquo;
        </p>
        <Button
          onClick={() => router.push("/")}
          className="mt-2 rounded-md font-medium text-white hover:opacity-90"
          style={{ background: "var(--color-primary)" }}
        >
          Back to home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col" style={{ background: "var(--color-background)" }}>
      {/* Confirm-end dialog (shown when solo timer expires — host must decide) */}
      <Dialog open={showEndConfirm} onOpenChange={(open) => !open && keepGoing()}>
        <DialogContent showCloseButton={false} className="text-center">
          <p className="font-heading text-lg font-semibold">Still there?</p>
          <p className="text-sm text-muted-foreground">
            You&apos;ve been the only one here for a while.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={keepGoing}
              className="w-full rounded-md font-medium text-white hover:opacity-90"
              style={{ background: "var(--color-primary)" }}
            >
              Keep going
            </Button>
            <Button
              onClick={() => end.mutate({ roomId: initialRoom.id })}
              disabled={end.isPending}
              variant="ghost"
              className="w-full rounded-md font-medium text-muted-foreground"
            >
              End the room
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--color-juce-border)" }}>
        <button
          aria-label="Leave room"
          onClick={() => { handleLeave(); router.push("/"); }}
          className="flex size-9 items-center justify-center rounded-md transition-opacity hover:opacity-70"
          style={{ background: "var(--color-secondary)" }}
        >
          <ArrowLeft className="size-5" style={{ color: "var(--color-text)" }} />
        </button>

        <div className="flex flex-col items-center gap-0.5">
          <span className="line-clamp-1 max-w-[180px] text-sm font-medium" style={{ color: "var(--color-text)" }}>
            {initialRoom.title}
          </span>
          <div className="flex items-center gap-1.5">
            <Badge className="live-dot rounded-md border-0 bg-transparent px-0 text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
              Live
            </Badge>
            <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-muted)" }}>
              <Users className="size-3" />
              {listenerCount}
            </span>
          </div>
        </div>

        {isHost ? (
          <Button
            onClick={() => end.mutate({ roomId: initialRoom.id })}
            disabled={end.isPending}
            className="h-9 rounded-md px-4 text-xs font-medium text-white hover:opacity-90"
            style={{ background: "var(--color-accent)" }}
          >
            End
          </Button>
        ) : (
          <Button
            onClick={() => { handleLeave(); router.push("/"); }}
            variant="ghost"
            className="h-9 rounded-md px-4 text-xs font-medium"
            style={{ color: "var(--color-muted)" }}
          >
            Leave
          </Button>
        )}
      </header>

      <div
        className="relative mx-4 overflow-hidden"
        style={{
          aspectRatio: "9/16",
          maxHeight: "calc(100dvh - 180px)",
          background: "var(--color-secondary)",
          borderRadius: "var(--radius-base)",
        }}
      >
        {initialRoom.ivsPlaybackUrl ? (
          <IVSPlayer playbackUrl={initialRoom.ivsPlaybackUrl} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>Waiting for stream…</p>
          </div>
        )}

        {/* Solo countdown overlay — final minute */}
        {soloSecondsLeft !== null && soloSecondsLeft < 60 && !showEndConfirm && (
          <div
            className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 px-4 py-4"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}
          >
            <p className="text-xs font-medium" style={{ color: "var(--color-text)" }}>You&apos;re the only one here</p>
            <p className="font-heading text-2xl font-semibold tabular-nums" style={{ color: "var(--color-text)" }}>
              {formatCountdown(soloSecondsLeft)}
            </p>
            <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>Ending soon</p>
            <Button
              onClick={keepGoing}
              variant="ghost"
              className="mt-1 h-8 rounded-md px-5 text-xs font-medium"
              style={{ color: "var(--color-text)" }}
            >
              Keep going
            </Button>
          </div>
        )}
      </div>

      {/* Solo banner — before final minute */}
      {soloSecondsLeft !== null && soloSecondsLeft >= 60 && !showEndConfirm && (
        <div
          className="mx-4 mt-3 flex items-center justify-between px-4 py-3"
          style={{ background: "var(--color-secondary)", borderRadius: "var(--radius-base)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            You&apos;re the only one — ending in{" "}
            <span className="font-medium tabular-nums" style={{ color: "var(--color-text)" }}>{formatCountdown(soloSecondsLeft)}</span>
          </p>
          <Button
            onClick={keepGoing}
            variant="ghost"
            className="h-7 rounded-md px-3 text-xs"
            style={{ color: "var(--color-muted)" }}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Host card */}
      <div
        className="mx-4 mt-4 mb-6 flex items-center gap-3 px-4 py-3"
        style={{ background: "var(--color-secondary)", borderRadius: "var(--radius-base)" }}
      >
        <Avatar className="size-9 flex-shrink-0">
          <AvatarFallback
            className="bubble-gradient text-xs font-medium text-white"
            style={{
              "--palette-from": initialRoom.host.paletteFrom,
              "--palette-to": initialRoom.host.paletteTo,
            } as React.CSSProperties}
          >
            {initialRoom.host.handle.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-0.5 leading-none">
          <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{initialRoom.host.displayName}</span>
          <span className="text-xs" style={{ color: "var(--color-muted)" }}>@{initialRoom.host.handle} · host</span>
        </div>
      </div>
    </div>
  );
}
