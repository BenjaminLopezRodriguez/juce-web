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
    <main className="juce-shell flex min-h-dvh flex-col items-center justify-center px-6">
      <div
        className="mb-6 flex size-20 items-center justify-center"
        style={{
          borderRadius: "var(--radius-base)",
          background: `linear-gradient(135deg, ${room.paletteFrom}, ${room.paletteTo})`,
        }}
      >
        <span className="font-heading select-none text-2xl font-semibold text-white">
          {room.title.slice(0, 2).toUpperCase()}
        </span>
      </div>

      <p className="mb-1 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
        You&apos;re invited to join
      </p>

      <h1 className="font-heading mb-1 text-center text-2xl font-semibold leading-tight" style={{ color: "var(--color-text)" }}>
        {room.title}
      </h1>

      <p className="mb-8 text-sm" style={{ color: "var(--color-muted)" }}>
        hosted by @{room.host.handle}
      </p>

      {isEnded ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-medium" style={{ color: "var(--color-muted)" }}>
            This room has ended.
          </p>
          <Button asChild variant="ghost" className="rounded-md">
            <Link href="/">Back to Juce</Link>
          </Button>
        </div>
      ) : authed ? (
        <div className="flex w-full max-w-xs flex-col items-center gap-3">
          <Button
            asChild
            className="w-full rounded-md font-medium text-white hover:opacity-90"
            style={{ background: "var(--color-primary)" }}
          >
            <Link href={`/room/${room.id}`}>
              Join room · {room.listenerCount} listening
            </Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-md text-sm" style={{ color: "var(--color-muted)" }}>
            <Link href="/">Maybe later</Link>
          </Button>
        </div>
      ) : (
        <div className="flex w-full max-w-xs flex-col items-center gap-3">
          <p className="text-center text-sm" style={{ color: "var(--color-muted)" }}>
            Sign in to Juce to join the room
          </p>
          <LoginLink
            postLoginRedirectURL={`/room/${room.id}`}
            className="w-full rounded-md py-2.5 text-center text-sm font-medium text-white transition-opacity hover:opacity-80"
            style={{ background: "var(--color-primary)" }}
          >
            Sign in &amp; Join
          </LoginLink>
        </div>
      )}
    </main>
  );
}
