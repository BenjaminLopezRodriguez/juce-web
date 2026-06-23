import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const { getUser } = getKindeServerSession();
  let kindeUser = await getUser();

  // iOS sends a Bearer token — validate via Kinde userinfo endpoint
  if (!kindeUser?.id) {
    const auth = opts.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      const token = auth.slice(7);
      // Try both Kinde's custom endpoint and the standard OAuth userinfo endpoint
      const endpoints = [
        `${process.env.KINDE_ISSUER_URL}/oauth2/v2/user_profile`,
        `${process.env.KINDE_ISSUER_URL}/oauth2/userinfo`,
      ];
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (res.ok) {
            const profile = (await res.json()) as {
              id?: string;
              sub?: string; // standard OAuth field
              email?: string | null;
            };
            const profileId = profile.id ?? profile.sub;
            if (profileId) {
              kindeUser = { id: profileId, email: profile.email ?? "" } as NonNullable<typeof kindeUser>;
              break;
            }
          }
        } catch {}
      }
    }
  }

  let dbUser = null;
  if (kindeUser?.id) {
    dbUser = await db.query.users.findFirst({
      where: eq(users.kindeId, kindeUser.id),
    });
  }

  return {
    db,
    kindeUser,
    dbUser,
    ...opts,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();
  console.log(`[TRPC] ${path} took ${Date.now() - start}ms`);
  return result;
});

export const publicProcedure = t.procedure.use(timingMiddleware);

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.kindeUser?.id || !ctx.dbUser) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      kindeUser: ctx.kindeUser,
      dbUser: ctx.dbUser,
    },
  });
});

export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(enforceAuth);

const enforceKinde = t.middleware(({ ctx, next }) => {
  if (!ctx.kindeUser?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      kindeUser: ctx.kindeUser,
    },
  });
});

export const kindeProtectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(enforceKinde);
