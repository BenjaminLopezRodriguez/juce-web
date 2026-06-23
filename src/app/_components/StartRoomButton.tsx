"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";

interface RoomResult {
  id: number;
}

export function StartRoomButton({ label = "Go Live" }: { label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [result, setResult] = useState<RoomResult | null>(null);

  const create = api.room.create.useMutation({
    onSuccess: (data) => {
      setResult({ id: data.id });
      router.refresh();
    },
  });

  function close() {
    setOpen(false);
    setTitle("");
    setResult(null);
    create.reset();
  }

  function goToRoom() {
    if (result) router.push(`/room/${result.id}`);
    close();
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="rounded-full text-sm font-semibold text-white"
        style={{ background: "var(--color-live-accent)" }}
      >
        {label}
      </Button>

      <Dialog open={open} onOpenChange={(v) => !v && close()}>
        <DialogContent>
          {result ? (
            <SuccessState result={result} onGoToRoom={goToRoom} onClose={close} />
          ) : (
            <CreateForm
              title={title}
              onTitleChange={setTitle}
              isPending={create.isPending}
              error={create.error?.message}
              onSubmit={() =>
                create.mutate({ title: title.trim(), paletteFrom: "#6c63ff", paletteTo: "#0c0c14" })
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreateForm({
  title,
  onTitleChange,
  isPending,
  error,
  onSubmit,
}: {
  title: string;
  onTitleChange: (v: string) => void;
  isPending: boolean;
  error?: string;
  onSubmit: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle
          className="text-lg font-black"
          style={{ fontFamily: "var(--font-rounded)", color: "var(--color-app-primary)" }}
        >
          Start a room
        </DialogTitle>
      </DialogHeader>

      <Input
        type="text"
        placeholder="What are you talking about?"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && title.trim() && !isPending && onSubmit()}
        maxLength={128}
        autoFocus
        className="rounded-xl"
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button
        disabled={!title.trim() || isPending}
        onClick={onSubmit}
        className="w-full rounded-full font-semibold text-white"
        style={{ background: "var(--color-live-accent)" }}
      >
        {isPending ? "Creating…" : "Go Live"}
      </Button>
    </>
  );
}

function SuccessState({
  result,
  onGoToRoom,
  onClose,
}: {
  result: RoomResult;
  onGoToRoom: () => void;
  onClose: () => void;
}) {
  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/${result.id}`
      : `/invite/${result.id}`;

  return (
    <>
      <DialogHeader>
        <DialogTitle
          className="text-lg font-black"
          style={{ fontFamily: "var(--font-rounded)", color: "var(--color-app-primary)" }}
        >
          Room is live
        </DialogTitle>
      </DialogHeader>

      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        Share this link so others can join:
      </p>

      <CopyField value={inviteUrl} />

      <div className="flex gap-2 pt-1">
        <Button
          onClick={onGoToRoom}
          className="flex-1 rounded-full font-semibold text-white"
          style={{ background: "var(--color-live-accent)" }}
        >
          Enter room
        </Button>
        <Button
          onClick={onClose}
          variant="ghost"
          className="rounded-full px-4"
          style={{ color: "var(--color-text-muted)" }}
        >
          Later
        </Button>
      </div>
    </>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-opacity hover:opacity-80"
      style={{
        background: "var(--color-juce-muted-bg)",
        border: "1.5px solid var(--color-juce-border)",
      }}
    >
      <span
        className="min-w-0 flex-1 truncate font-mono text-xs"
        style={{ color: "var(--color-app-primary)" }}
      >
        {value}
      </span>
      <span
        className="flex-shrink-0"
        style={{ color: copied ? "var(--color-live-accent)" : "var(--color-text-muted)" }}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </span>
    </button>
  );
}
