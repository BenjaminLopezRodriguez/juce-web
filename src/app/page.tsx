import { LoginLink, LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";

export default async function Home() {
  const { getUser, isAuthenticated } = getKindeServerSession();
  const [authed, kindeUser] = await Promise.all([isAuthenticated(), getUser()]);

  if (authed && kindeUser?.id) {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.kindeId, kindeUser.id),
    });
    if (!dbUser) redirect("/onboarding");
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-8"
      style={{ background: "var(--color-surface)" }}
    >
      <div className="flex flex-col items-center gap-2">
        <h1
          className="text-6xl font-black tracking-tight"
          style={{ fontFamily: "var(--font-rounded)", color: "var(--color-app-primary)" }}
        >
          Juce
        </h1>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Music. Live. Together.
        </p>
      </div>

      {authed ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Signed in as {kindeUser?.email}
          </p>
          <LogoutLink
            className="px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-70"
            style={{
              background: "var(--color-muted-bg)",
              color: "var(--color-app-primary)",
              borderRadius: "var(--radius-pill)",
            }}
          >
            Sign out
          </LogoutLink>
        </div>
      ) : (
        <LoginLink
          className="px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-80"
          style={{
            background: "var(--color-live-accent)",
            borderRadius: "var(--radius-pill)",
          }}
        >
          Sign in to Juce
        </LoginLink>
      )}
    </main>
  );
}
