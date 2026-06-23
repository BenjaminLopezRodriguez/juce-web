"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";

interface Props {
  suggestedHandle: string;
  suggestedDisplayName: string;
}

export function OnboardingForm({ suggestedHandle, suggestedDisplayName }: Props) {
  const router = useRouter();
  const [handle, setHandle] = useState(suggestedHandle);
  const [displayName, setDisplayName] = useState(suggestedDisplayName);

  const upsert = api.user.upsert.useMutation({
    onSuccess: () => {
      router.push("/");
      router.refresh();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    upsert.mutate({
      handle,
      displayName,
      paletteFrom: "#f97316",
      paletteTo: "#1a1a1a",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="handle"
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-muted)" }}
        >
          Handle
        </label>
        <div
          className="flex items-center gap-1 px-3 py-2.5"
          style={{
            background: "var(--color-muted-bg)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-border)",
          }}
        >
          <span className="text-sm select-none" style={{ color: "var(--color-muted)" }}>
            @
          </span>
          <input
            id="handle"
            type="text"
            value={handle}
            onChange={(e) =>
              setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
            }
            maxLength={32}
            required
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--color-app-primary)" }}
            placeholder="your_handle"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="displayName"
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-muted)" }}
        >
          Display Name
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={64}
          required
          className="px-3 py-2.5 text-sm outline-none"
          style={{
            background: "var(--color-muted-bg)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-border)",
            color: "var(--color-app-primary)",
          }}
          placeholder="Your Name"
        />
      </div>

      {upsert.error && (
        <p className="text-xs" style={{ color: "#ef4444" }}>
          {upsert.error.message}
        </p>
      )}

      <button
        type="submit"
        disabled={upsert.isPending || !handle || !displayName}
        className="mt-2 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
        style={{
          background: "var(--color-live-accent)",
          borderRadius: "var(--radius-pill)",
        }}
      >
        {upsert.isPending ? "Creating account…" : "Get started"}
      </button>
    </form>
  );
}
