import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { desc, eq } from "drizzle-orm";
import { db } from "~/server/db";
import { moments, rooms, type users } from "~/server/db/schema";
import { MomentCard } from "./MomentCard";
import { RoomCard } from "./RoomCard";
import { StartRoomButton } from "./StartRoomButton";

type User = typeof users.$inferSelect;

export async function HomeScreen({ user }: { user: User }) {
  const [liveRooms, recentMoments] = await Promise.all([
    db.query.rooms.findMany({
      where: eq(rooms.state, "live"),
      with: {
        host: {
          columns: { id: true, handle: true, displayName: true, paletteFrom: true, paletteTo: true },
        },
      },
      columns: {
        id: true, title: true, paletteFrom: true, paletteTo: true,
        listenerCount: true, state: true, createdAt: true, hostId: true,
        ivsChannelArn: false, ivsStreamKey: false, ivsIngestEndpoint: false, ivsPlaybackUrl: false,
        endedAt: false, scheduledAt: false,
      },
      orderBy: [desc(rooms.createdAt)],
      limit: 10,
    }),
    db.query.moments.findMany({
      with: {
        author: {
          columns: { id: true, handle: true, displayName: true, paletteFrom: true, paletteTo: true },
        },
        room: {
          columns: { id: true, title: true },
        },
        speakers: {
          with: {
            user: { columns: { id: true, handle: true, displayName: true } },
          },
        },
      },
      orderBy: [desc(moments.createdAt)],
      limit: 20,
    }),
  ]);

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--color-surface)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-5 py-3"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span
          className="text-2xl font-black"
          style={{ fontFamily: "var(--font-rounded)", color: "var(--color-app-primary)" }}
        >
          Juce
        </span>

        <div className="flex items-center gap-2">
          <StartRoomButton />

          <div
            className="h-8 w-8 flex-shrink-0 rounded-full bubble-gradient"
            style={{
              "--palette-from": user.paletteFrom,
              "--palette-to": user.paletteTo,
            } as React.CSSProperties}
          />

          <span className="text-sm font-medium hidden sm:block" style={{ color: "var(--color-app-primary)" }}>
            @{user.handle}
          </span>

          <LogoutLink
            className="text-xs px-3 py-1.5 transition-opacity hover:opacity-70"
            style={{
              background: "var(--color-muted-bg)",
              color: "var(--color-muted)",
              borderRadius: "var(--radius-pill)",
            }}
          >
            Sign out
          </LogoutLink>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-8 px-5 pt-6 pb-12 max-w-2xl mx-auto w-full">
        {/* Live Rooms */}
        <section className="flex flex-col gap-3">
          <h2
            className="live-dot text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--color-muted)" }}
          >
            Live Now
          </h2>

          {liveRooms.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-3 py-10"
              style={{
                background: "var(--color-muted-bg)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                No rooms live right now.
              </p>
              <StartRoomButton label="Start one" />
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-1 -mx-1 px-1">
              {liveRooms.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </section>

        {/* Moments */}
        <section className="flex flex-col gap-3">
          <h2
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--color-muted)" }}
          >
            Moments
          </h2>

          {recentMoments.length === 0 ? (
            <p className="text-sm py-4" style={{ color: "var(--color-muted)" }}>
              No moments yet. They appear here after a room ends.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentMoments.map((moment) => (
                <MomentCard key={moment.id} moment={moment} currentUserId={user.id} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
