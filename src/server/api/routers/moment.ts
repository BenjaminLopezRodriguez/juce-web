import { TRPCError } from "@trpc/server";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { momentLikes, momentSpeakers, moments } from "~/server/db/schema";

export const momentRouter = createTRPCRouter({
  squeeze: protectedProcedure
    .input(
      z.object({
        roomId: z.number(),
        transcript: z.string().min(1),
        clipDurationSecs: z.number().min(0),
        source: z.enum(["room_conversation", "host_moment", "audience_reaction"]),
        caption: z.string().max(280).optional(),
        audioUrl: z.string().url().optional(),
        speakers: z
          .array(
            z.object({
              userId: z.number(),
              speakingFractionPct: z.number().min(0).max(100),
              quote: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { speakers, ...rest } = input;

      const [moment] = await ctx.db
        .insert(moments)
        .values({
          authorId: ctx.dbUser.id,
          ...rest,
        })
        .returning({ id: moments.id, createdAt: moments.createdAt });

      if (!moment) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      if (speakers?.length) {
        await ctx.db.insert(momentSpeakers).values(
          speakers.map((s) => ({ momentId: moment.id, ...s }))
        );
      }

      return {
        id: moment.id,
        createdAt: moment.createdAt.toISOString(),
      };
    }),

  feed: publicProcedure
    .input(
      z.object({
        cursor: z.number().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.query.moments.findMany({
        where: input.cursor ? lt(moments.id, input.cursor) : undefined,
        with: {
          author: true,
          room: true,
          speakers: { with: { user: true } },
        },
        orderBy: [desc(moments.createdAt)],
        limit: input.limit + 1,
      });

      const hasMore = items.length > input.limit;
      const page = hasMore ? items.slice(0, -1) : items;
      const nextCursor = hasMore ? (page.at(-1)?.id ?? null) : null;

      return {
        moments: page.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          speakers: m.speakers.length > 0 ? m.speakers : null,
        })),
        nextCursor,
      };
    }),

  like: protectedProcedure
    .input(z.object({ momentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.momentLikes.findFirst({
        where: and(
          eq(momentLikes.momentId, input.momentId),
          eq(momentLikes.userId, ctx.dbUser.id)
        ),
      });

      if (existing) return; // idempotent

      await ctx.db
        .insert(momentLikes)
        .values({ momentId: input.momentId, userId: ctx.dbUser.id });

      await ctx.db
        .update(moments)
        .set({ likeCount: sql`${moments.likeCount} + 1` })
        .where(eq(moments.id, input.momentId));
    }),

  unlike: protectedProcedure
    .input(z.object({ momentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await ctx.db
        .delete(momentLikes)
        .where(
          and(
            eq(momentLikes.momentId, input.momentId),
            eq(momentLikes.userId, ctx.dbUser.id)
          )
        )
        .returning({ id: momentLikes.id });

      if (deleted.length > 0) {
        await ctx.db
          .update(moments)
          .set({ likeCount: sql`${moments.likeCount} - 1` })
          .where(eq(moments.id, input.momentId));
      }
    }),
});
