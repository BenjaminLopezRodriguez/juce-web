import { and, eq } from "drizzle-orm";
import type { db } from "~/server/db";
import { rooms } from "~/server/db/schema";
import { TIMELINE_ROOM_TITLE } from "~/lib/constants";

export { TIMELINE_ROOM_TITLE };

export async function getOrCreateTimelineRoom(
  database: typeof db,
  user: { id: number; paletteFrom: string; paletteTo: string },
) {
  const existing = await database.query.rooms.findFirst({
    where: and(eq(rooms.hostId, user.id), eq(rooms.title, TIMELINE_ROOM_TITLE)),
    columns: { id: true },
  });

  if (existing) return existing.id;

  const [room] = await database
    .insert(rooms)
    .values({
      hostId: user.id,
      title: TIMELINE_ROOM_TITLE,
      state: "ended",
      endedAt: new Date(),
      paletteFrom: user.paletteFrom,
      paletteTo: user.paletteTo,
      listenerCount: 0,
    })
    .returning({ id: rooms.id });

  if (!room) throw new Error("Failed to create timeline room");

  return room.id;
}
