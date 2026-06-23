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
import { PalettePicker, type Palette } from "./PalettePicker";

const DEFAULT_PALETTE: Palette = { from: "#3b5bdb", to: "#151228" };

interface RoomResult {
  id: number;
}

export function StartRoomButton({ label = "Go Live" }: { label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [palette, setPalette] = useState<Palette>(DEFAULT_PALETTE);
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
    setPalette(DEFAULT_PALETTE);
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
        className="h-10 rounded-full px-4 text-sm font-medium text-white hover:opacity-90"
        style={{ background: "var(--color-primary)" }}
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
              palette={palette}
              onPaletteChange={setPalette}
              isPending={create.isPending}
              error={create.error?.message}
              onSubmit={() =>
                create.mutate({ title: title.trim(), paletteFrom: palette.from, paletteTo: palette.to })
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
  palette,
  onPaletteChange,
  isPending,
  error,
  onSubmit,
}: {
  title: string;
  onTitleChange: (v: string) => void;
  palette: Palette;
  onPaletteChange: (v: Palette) => void;
  isPending: boolean;
  error?: string;
  onSubmit: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-base font-medium">
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
        className="rounded-md"
      />

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
          Room colour
        </p>
        <PalettePicker value={palette} onChange={onPaletteChange} />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button
        disabled={!title.trim() || isPending}
        onClick={onSubmit}
        className="w-full rounded-md font-medium text-white hover:opacity-90"
        style={{ background: "var(--color-primary)" }}
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
        <DialogTitle className="text-base font-medium">
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
          className="flex-1 rounded-md font-medium text-white hover:opacity-90"
          style={{ background: "var(--color-primary)" }}
        >
          Enter room
        </Button>
        <Button
          onClick={onClose}
          variant="ghost"
          className="rounded-md px-4"
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
      className="flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-opacity hover:opacity-80"
      style={{
        background: "transparent",
        borderColor: "var(--color-juce-border)",
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
        style={{ color: copied ? "var(--color-primary)" : "var(--color-muted)" }}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </span>
    </button>
  );
}
