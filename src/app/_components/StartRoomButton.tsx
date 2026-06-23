"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";

interface Credentials {
  ingestEndpoint: string;
  streamKey: string;
  playbackUrl: string;
}

export function StartRoomButton({ label = "Go Live" }: { label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const create = api.room.create.useMutation({
    onSuccess: (data) => {
      setCredentials({
        ingestEndpoint: data.ivsIngestEndpoint,
        streamKey: data.ivsStreamKey,
        playbackUrl: data.ivsPlaybackUrl,
      });
      router.refresh();
    },
  });

  function close() {
    setOpen(false);
    setTitle("");
    setCredentials(null);
    create.reset();
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
        <DialogContent
          className="max-w-sm rounded-3xl"
          style={{ background: "var(--color-surface-elevated)" }}
        >
          {credentials ? (
            <>
              <DialogHeader>
                <DialogTitle
                  className="text-lg font-black"
                  style={{ fontFamily: "var(--font-rounded)", color: "var(--color-app-primary)" }}
                >
                  Room created
                </DialogTitle>
              </DialogHeader>

              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Configure your streaming app (OBS, Streamlabs, etc.) with these settings:
              </p>

              <div className="flex flex-col gap-3">
                <CredentialField label="Server URL" value={`rtmps://${credentials.ingestEndpoint}:443/app/`} />
                <CredentialField label="Stream Key" value={credentials.streamKey} secret />
              </div>

              <Button
                onClick={close}
                className="w-full rounded-full font-semibold text-white"
                style={{ background: "var(--color-live-accent)" }}
              >
                Done
              </Button>
            </>
          ) : (
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
                onChange={(e) => setTitle(e.target.value)}
                maxLength={128}
                autoFocus
                className="rounded-xl"
              />

              {create.error && (
                <p className="text-xs text-destructive">{create.error.message}</p>
              )}

              <Button
                disabled={!title.trim() || create.isPending}
                onClick={() =>
                  create.mutate({
                    title: title.trim(),
                    paletteFrom: "#6c63ff",
                    paletteTo: "#0c0c14",
                  })
                }
                className="w-full rounded-full font-semibold text-white"
                style={{ background: "var(--color-live-accent)" }}
              >
                {create.isPending ? "Creating…" : "Go Live"}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CredentialField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-1">
      <span
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </span>
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2.5"
        style={{
          background: "var(--color-juce-muted-bg)",
          border: "1px solid var(--color-juce-border)",
        }}
      >
        <span
          className="flex-1 truncate font-mono text-xs"
          style={{ color: "var(--color-app-primary)" }}
        >
          {secret && !revealed ? "•".repeat(24) : value}
        </span>
        {secret && (
          <button
            onClick={() => setRevealed((r) => !r)}
            className="flex-shrink-0 text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            {revealed ? "hide" : "show"}
          </button>
        )}
        <button
          onClick={copy}
          className="flex-shrink-0 text-xs font-medium"
          style={{ color: copied ? "var(--color-live-accent)" : "var(--color-text-muted)" }}
        >
          {copied ? "copied!" : "copy"}
        </button>
      </div>
    </div>
  );
}
