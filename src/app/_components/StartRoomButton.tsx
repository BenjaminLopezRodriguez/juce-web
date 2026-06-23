"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

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
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-80"
        style={{
          background: "var(--color-live-accent)",
          borderRadius: "var(--radius-pill)",
        }}
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div
            className="w-full max-w-sm flex flex-col gap-5 p-6"
            style={{
              background: "var(--color-surface-elevated)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-float)",
            }}
          >
            {credentials ? (
              /* Success state — show streaming credentials */
              <>
                <div className="flex items-center justify-between">
                  <h2
                    className="text-lg font-black"
                    style={{ fontFamily: "var(--font-rounded)", color: "var(--color-app-primary)" }}
                  >
                    Room created
                  </h2>
                  <button onClick={close} style={{ color: "var(--color-muted)" }}>✕</button>
                </div>

                <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                  Configure your streaming app (OBS, Streamlabs, etc.) with these settings:
                </p>

                <div className="flex flex-col gap-3">
                  <CredentialField label="Server URL" value={`rtmps://${credentials.ingestEndpoint}:443/app/`} />
                  <CredentialField label="Stream Key" value={credentials.streamKey} secret />
                </div>

                <button
                  onClick={close}
                  className="py-3 text-sm font-semibold text-white"
                  style={{
                    background: "var(--color-live-accent)",
                    borderRadius: "var(--radius-pill)",
                  }}
                >
                  Done
                </button>
              </>
            ) : (
              /* Create form */
              <>
                <div className="flex items-center justify-between">
                  <h2
                    className="text-lg font-black"
                    style={{ fontFamily: "var(--font-rounded)", color: "var(--color-app-primary)" }}
                  >
                    Start a room
                  </h2>
                  <button onClick={close} style={{ color: "var(--color-muted)" }}>✕</button>
                </div>

                <input
                  type="text"
                  placeholder="What are you talking about?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={128}
                  autoFocus
                  className="w-full px-4 py-3 text-sm outline-none"
                  style={{
                    background: "var(--color-muted-bg)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-app-primary)",
                  }}
                />

                {create.error && (
                  <p className="text-xs" style={{ color: "#ef4444" }}>
                    {create.error.message}
                  </p>
                )}

                <button
                  disabled={!title.trim() || create.isPending}
                  onClick={() =>
                    create.mutate({
                      title: title.trim(),
                      paletteFrom: "#6c63ff",
                      paletteTo: "#0c0c14",
                    })
                  }
                  className="py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                  style={{
                    background: "var(--color-live-accent)",
                    borderRadius: "var(--radius-pill)",
                  }}
                >
                  {create.isPending ? "Creating…" : "Go Live"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
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
        style={{ color: "var(--color-muted)" }}
      >
        {label}
      </span>
      <div
        className="flex items-center gap-2 px-3 py-2.5"
        style={{
          background: "var(--color-muted-bg)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--color-border)",
        }}
      >
        <span
          className="flex-1 text-xs font-mono truncate"
          style={{ color: "var(--color-app-primary)" }}
        >
          {secret && !revealed ? "•".repeat(24) : value}
        </span>
        {secret && (
          <button
            onClick={() => setRevealed((r) => !r)}
            className="text-xs flex-shrink-0"
            style={{ color: "var(--color-muted)" }}
          >
            {revealed ? "hide" : "show"}
          </button>
        )}
        <button
          onClick={copy}
          className="text-xs flex-shrink-0 font-medium"
          style={{ color: copied ? "var(--color-live-accent)" : "var(--color-muted)" }}
        >
          {copied ? "copied!" : "copy"}
        </button>
      </div>
    </div>
  );
}
