import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { TRPCError, initTRPC } from "@trpc/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";

// Cached JWKS — reused across requests (jose caches internally)
const getJWKS = (() => {
  let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  return () => {
    jwks ??= createRemoteJWKSet(
      new URL(`${process.env.KINDE_ISSUER_URL}/.well-known/jwks.json`),
    );
    return jwks;
  };
})();

async function kindeUserFromBearer(token: string) {
  // 1. Try JWKS JWT verification (works for both access tokens and ID tokens)
  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: process.env.KINDE_ISSUER_URL,
    });
    const id = (payload.sub ?? (payload as Record<string, unknown>).id) as string | undefined;
    if (id) return { id, email: (payload.email as string | undefined) ?? "" };
  } catch (e) {
    console.warn("[auth] JWKS verify failed:", (e as Error).message);
  }

  // 2. Fallback: call Kinde userinfo endpoint (works for access tokens with profile scope)
  for (const endpoint of [
    `${process.env.KINDE_ISSUER_URL}/oauth2/v2/user_profile`,
    `${process.env.KINDE_ISSUER_URL}/oauth2/userinfo`,
  ]) {
    try {
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const p = (await res.json()) as { id?: string; sub?: string; email?: string | null };
        const id = p.id ?? p.sub;
        if (id) return { id, email: p.email ?? "" };
      } else {
        console.warn("[auth] userinfo", endpoint, "→", res.status);
      }
    } catch (e) {
      console.warn("[auth] userinfo fetch failed:", (e as Error).message);
    }
  }

  return null;
}

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const { getUser } = getKindeServerSession();
  let kindeUser = await getUser();

  // iOS / native clients send Authorization: Bearer <token>
  if (!kindeUser?.id) {
    const auth = opts.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      const resolved = await kindeUserFromBearer(auth.slice(7));
      if (resolved) {
        kindeUser = resolved as NonNullable<typeof kindeUser>;
      } else {
        console.warn("[auth] Bearer token present but could not resolve Kinde user");
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
