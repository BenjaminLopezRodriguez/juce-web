import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { follows, users } from "~/server/db/schema";

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    const [followerCount, followingCount] = await Promise.all([
      ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(follows)
        .where(eq(follows.followingId, ctx.dbUser.id))
        .then((r) => Number(r[0]?.count ?? 0)),
      ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(follows)
        .where(eq(follows.followerId, ctx.dbUser.id))
        .then((r) => Number(r[0]?.count ?? 0)),
    ]);

    return { ...ctx.dbUser, followerCount, followingCount };
  }),

  upsert: protectedProcedure
    .input(
      z.object({
        handle: z.string().min(1).max(32).regex(/^[a-z0-9_]+$/),
        displayName: z.string().min(1).max(64),
        paletteFrom: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        paletteTo: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.users.findFirst({
        where: eq(users.kindeId, ctx.kindeUser.id),
      });

      if (existing) {
        await ctx.db
          .update(users)
          .set(input)
          .where(eq(users.kindeId, ctx.kindeUser.id));
        return { id: existing.id };
      }

      const [created] = await ctx.db
        .insert(users)
        .values({
          kindeId: ctx.kindeUser.id,
          ...input,
        })
        .returning({ id: users.id });

      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return { id: created.id };
    }),

  follow: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.dbUser.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot follow yourself" });
      }
      await ctx.db
        .insert(follows)
        .values({ followerId: ctx.dbUser.id, followingId: input.userId })
        .onConflictDoNothing();
    }),

  unfollow: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(follows)
        .where(
          and(
            eq(follows.followerId, ctx.dbUser.id),
            eq(follows.followingId, input.userId)
          )
        );
    }),
});
