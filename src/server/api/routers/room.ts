import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, lt } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { createIvsChannel, deleteIvsChannel, stopIvsStream } from "~/server/ivs";
import { roomParticipants, rooms } from "~/server/db/schema";
import { sql } from "drizzle-orm";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const roomWithHost = {
  host: true,
} as const;

export const roomRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(128),
        paletteFrom: hexColor,
        paletteTo: hexColor,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const channel = await createIvsChannel(
        `juce-${ctx.dbUser.id}-${Date.now()}`
      );

      const [room] = await ctx.db
        .insert(rooms)
        .values({
          hostId: ctx.dbUser.id,
          title: input.title,
          paletteFrom: input.paletteFrom,
          paletteTo: input.paletteTo,
          state: "live",
          ivsChannelArn: channel.channelArn,
          ivsPlaybackUrl: channel.playbackUrl,
          ivsIngestEndpoint: channel.ingestEndpoint,
          ivsStreamKey: channel.streamKey,
        })
        .returning();

      if (!room) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // host is also a participant (speaker)
      await ctx.db.insert(roomParticipants).values({
        roomId: room.id,
        userId: ctx.dbUser.id,
        isSpeaker: true,
      });

      return {
        id: room.id,
        ivsIngestEndpoint: channel.ingestEndpoint,
        ivsStreamKey: channel.streamKey,
        ivsPlaybackUrl: channel.playbackUrl,
        paletteFrom: room.paletteFrom,
        paletteTo: room.paletteTo,
      };
    }),

  list: publicProcedure
    .input(
      z.object({
        state: z.enum(["live", "ended", "scheduled"]).default("live"),
        cursor: z.number().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.query.rooms.findMany({
        where: and(
          eq(rooms.state, input.state),
          input.cursor ? lt(rooms.id, input.cursor) : undefined
        ),
        with: { host: true },
        orderBy: [desc(rooms.createdAt)],
        limit: input.limit + 1,
      });

      const hasMore = items.length > input.limit;
      const page = hasMore ? items.slice(0, -1) : items;
      const nextCursor = hasMore ? (page.at(-1)?.id ?? null) : null;

      return {
        rooms: page.map(({ ivsStreamKey: _sk, ...r }) => r),
        nextCursor,
      };
    }),

  getById: publicProcedure
    .input(z.object({ roomId: z.number() }))
    .query(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
        with: { host: true },
      });

      if (!room) throw new TRPCError({ code: "NOT_FOUND" });

      const { ivsStreamKey: _sk, ...safe } = room;
      return safe;
    }),

  join: protectedProcedure
    .input(z.object({ roomId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: and(eq(rooms.id, input.roomId), eq(rooms.state, "live")),
      });

      if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "Room not live" });

      await ctx.db
        .insert(roomParticipants)
        .values({ roomId: input.roomId, userId: ctx.dbUser.id })
        .onConflictDoNothing();

      await ctx.db
        .update(rooms)
        .set({ listenerCount: sql`${rooms.listenerCount} + 1` })
        .where(eq(rooms.id, input.roomId));

      return { ivsPlaybackUrl: room.ivsPlaybackUrl };
    }),

  leave: protectedProcedure
    .input(z.object({ roomId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: and(eq(rooms.id, input.roomId), eq(rooms.state, "live")),
      });
      if (!room) return;

      // Mark participant as left
      await ctx.db
        .update(roomParticipants)
        .set({ leftAt: new Date() })
        .where(
          and(
            eq(roomParticipants.roomId, input.roomId),
            eq(roomParticipants.userId, ctx.dbUser.id),
          ),
        );

      // Decrement count (floor 0)
      await ctx.db
        .update(rooms)
        .set({ listenerCount: sql`GREATEST(${rooms.listenerCount} - 1, 0)` })
        .where(eq(rooms.id, input.roomId));

      // Re-fetch to get updated count
      const updated = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
        columns: { listenerCount: true, ivsChannelArn: true },
      });

      // Auto-end when everyone is gone
      if (updated && updated.listenerCount <= 0) {
        await endRoom(ctx.db, input.roomId, updated.ivsChannelArn);
      }
    }),

  heartbeat: protectedProcedure
    .input(z.object({ roomId: z.number() }))
    .query(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
        columns: { listenerCount: true, state: true },
      });
      return room ?? { listenerCount: 0, state: "ended" as const };
    }),

  end: protectedProcedure
    .input(z.object({ roomId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: eq(rooms.id, input.roomId),
      });

      if (!room) throw new TRPCError({ code: "NOT_FOUND" });
      if (room.hostId !== ctx.dbUser.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (room.state !== "live") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Room already ended" });
      }

      await endRoom(ctx.db, input.roomId, room.ivsChannelArn);
    }),
});

async function endRoom(
  db: typeof import("~/server/db").db,
  roomId: number,
  channelArn: string | null,
) {
  if (channelArn) {
    await stopIvsStream(channelArn).catch(() => null);
    await deleteIvsChannel(channelArn).catch(() => null);
  }
  await db
    .update(rooms)
    .set({ state: "ended", endedAt: new Date() })
    .where(eq(rooms.id, roomId));
}
