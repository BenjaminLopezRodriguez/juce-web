import { count, desc, eq } from "drizzle-orm";
import { db } from "~/server/db";
import { moments, rooms, type users } from "~/server/db/schema";
import { HomeApp } from "./HomeApp";

type User = typeof users.$inferSelect;

export async function HomeScreen({ user }: { user: User }) {
  const [liveRooms, snippets, hostedRoomCount] = await Promise.all([
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
    db
      .select({ count: count() })
      .from(rooms)
      .where(eq(rooms.hostId, user.id))
      .then((rows) => rows[0]?.count ?? 0),
  ]);

  return (
    <HomeApp
      user={{
        id: user.id,
        handle: user.handle,
        displayName: user.displayName,
        bio: user.bio,
        paletteFrom: user.paletteFrom,
        paletteTo: user.paletteTo,
        createdAt: user.createdAt,
      }}
      liveRooms={liveRooms.map((room) => ({
        id: room.id,
        title: room.title,
        paletteFrom: room.paletteFrom,
        paletteTo: room.paletteTo,
        listenerCount: room.listenerCount,
        host: room.host,
      }))}
      snippets={snippets.map((moment) => ({
        id: moment.id,
        transcript: moment.transcript,
        caption: moment.caption,
        clipDurationSecs: moment.clipDurationSecs,
        likeCount: moment.likeCount,
        repostCount: moment.repostCount,
        replyCount: moment.replyCount,
        source: moment.source,
        author: moment.author,
        room: moment.room,
      }))}
      hostedRoomCount={hostedRoomCount}
    />
  );
}
