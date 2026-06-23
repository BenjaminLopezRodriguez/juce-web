import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "~/server/db";
import { rooms } from "~/server/db/schema";
import { Button } from "~/components/ui/button";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { id } = await params;
  const roomId = Number(id);
  if (isNaN(roomId)) notFound();

  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, roomId),
    with: {
      host: {
        columns: { handle: true, displayName: true, paletteFrom: true, paletteTo: true },
      },
    },
    columns: {
      id: true, title: true, state: true, paletteFrom: true, paletteTo: true,
      listenerCount: true,
      ivsChannelArn: false, ivsStreamKey: false, ivsIngestEndpoint: false,
      ivsPlaybackUrl: false, endedAt: false, scheduledAt: false,
    },
  });

  if (!room) notFound();

  const { isAuthenticated } = getKindeServerSession();
  const authed = await isAuthenticated();

  const isEnded = room.state === "ended";

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-0 px-6"
      style={{ background: "var(--color-surface)" }}
    >
      {/* Gradient bubble */}
      <div
        className="mb-6 flex h-24 w-24 items-center justify-center rounded-full shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${room.paletteFrom}, ${room.paletteTo})`,
          boxShadow: `0 12px 32px color-mix(in srgb, ${room.paletteFrom} 40%, transparent)`,
        }}
      >
        <span
          className="select-none text-3xl font-black text-white"
          style={{ fontFamily: "var(--font-rounded)" }}
        >
          {room.title.slice(0, 2).toUpperCase()}
        </span>
      </div>

      <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
        You&apos;re invited to join
      </p>

      <h1
        className="mb-1 text-center text-2xl font-black leading-tight"
        style={{ color: "var(--color-app-primary)", fontFamily: "var(--font-rounded)" }}
      >
        {room.title}
      </h1>

      <p className="mb-8 text-sm" style={{ color: "var(--color-text-muted)" }}>
        hosted by @{room.host.handle}
      </p>

      {isEnded ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
            This room has ended.
          </p>
          <Button asChild variant="ghost" className="rounded-full">
            <Link href="/">Back to Juce</Link>
          </Button>
        </div>
      ) : authed ? (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <Button
            asChild
            className="w-full rounded-full font-semibold text-white"
            style={{ background: "var(--color-live-accent)" }}
          >
            <Link href={`/room/${room.id}`}>
              Join room · {room.listenerCount} listening
            </Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-full text-sm" style={{ color: "var(--color-text-muted)" }}>
            <Link href="/">Maybe later</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <p className="text-sm text-center" style={{ color: "var(--color-text-muted)" }}>
            Sign in to Juce to join the room
          </p>
          <LoginLink
            postLoginRedirectURL={`/room/${room.id}`}
            className="w-full rounded-full py-2.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-80"
            style={{ background: "var(--color-live-accent)" }}
          >
            Sign in &amp; Join
          </LoginLink>
        </div>
      )}
    </main>
  );
}
