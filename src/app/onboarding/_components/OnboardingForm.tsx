"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

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
          style={{ color: "var(--color-text-muted)" }}
        >
          Handle
        </label>
        <div
          className="flex items-center gap-1 rounded-xl border px-3 py-0.5"
          style={{ borderColor: "var(--color-juce-border)", background: "var(--color-juce-muted-bg)" }}
        >
          <span className="select-none text-sm" style={{ color: "var(--color-text-muted)" }}>
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
            className="flex-1 bg-transparent py-2.5 text-sm outline-none"
            style={{ color: "var(--color-app-primary)" }}
            placeholder="your_handle"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="displayName"
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          Display Name
        </label>
        <Input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={64}
          required
          className="rounded-xl"
          placeholder="Your Name"
        />
      </div>

      {upsert.error && (
        <p className="text-xs text-destructive">{upsert.error.message}</p>
      )}

      <Button
        type="submit"
        disabled={upsert.isPending || !handle || !displayName}
        className="mt-2 w-full rounded-full font-semibold text-white"
        style={{ background: "var(--color-live-accent)" }}
      >
        {upsert.isPending ? "Creating account…" : "Get started"}
      </Button>
    </form>
  );
}
