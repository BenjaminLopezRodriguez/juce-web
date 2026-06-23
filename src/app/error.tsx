"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="juce-shell flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
        Something went wrong
      </p>
      <p className="text-sm" style={{ color: "var(--color-muted)" }}>
        {error.digest ?? "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-md px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ background: "var(--color-primary)" }}
      >
        Try again
      </button>
    </main>
  );
}
