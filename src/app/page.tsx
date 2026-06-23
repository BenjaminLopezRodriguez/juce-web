import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { Button } from "~/components/ui/button";
import { HomeScreen } from "./_components/HomeScreen";

export default async function Home() {
  const { getUser, isAuthenticated } = getKindeServerSession();
  const [authed, kindeUser] = await Promise.all([isAuthenticated(), getUser()]);

  if (authed && kindeUser?.id) {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.kindeId, kindeUser.id),
    });
    if (!dbUser) redirect("/onboarding");
    return <HomeScreen user={dbUser} />;
  }

  return (
    <main className="juce-shell flex min-h-dvh flex-col items-center justify-center gap-10 px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-heading text-4xl font-semibold tracking-tight" style={{ color: "var(--color-text)" }}>
          Juce
        </h1>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Say it. Start a room. Leave a snippet.
        </p>
      </div>
      <Button
        asChild
        className="h-9 rounded-md px-5 text-sm font-medium text-white hover:opacity-90"
        style={{ background: "var(--color-primary)" }}
      >
        <LoginLink>Sign in</LoginLink>
      </Button>
    </main>
  );
}
