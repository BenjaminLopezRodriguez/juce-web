"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { PalettePicker, type Palette } from "~/app/_components/PalettePicker";

const DEFAULT_PALETTE: Palette = { from: "#3b5bdb", to: "#151228" };

interface Props {
  suggestedHandle: string;
  suggestedDisplayName: string;
}

export function OnboardingForm({ suggestedHandle, suggestedDisplayName }: Props) {
  const router = useRouter();
  const [handle, setHandle] = useState(suggestedHandle);
  const [displayName, setDisplayName] = useState(suggestedDisplayName);
  const [palette, setPalette] = useState<Palette>(DEFAULT_PALETTE);

  const upsert = api.user.upsert.useMutation({
    onSuccess: () => {
      router.push("/");
      router.refresh();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    upsert.mutate({ handle, displayName, paletteFrom: palette.from, paletteTo: palette.to });
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
        <div className="flex h-10 items-center gap-1 rounded-xl border border-input bg-background px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <span className="select-none text-sm text-muted-foreground">@</span>
          <input
            id="handle"
            type="text"
            value={handle}
            onChange={(e) =>
              setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
            }
            maxLength={32}
            required
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
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

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          Your colour
        </p>
        <PalettePicker value={palette} onChange={setPalette} />
      </div>

      {upsert.error && (
        <p className="text-xs text-destructive">{upsert.error.message}</p>
      )}

      <Button
        type="submit"
        disabled={upsert.isPending || !handle || !displayName}
        className="mt-2 w-full rounded-md font-medium text-white hover:opacity-90"
        style={{ background: "var(--color-primary)" }}
      >
        {upsert.isPending ? "Creating account…" : "Get started"}
      </Button>
    </form>
  );
}
