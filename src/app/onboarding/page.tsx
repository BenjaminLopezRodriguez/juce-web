import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { OnboardingForm } from "./_components/OnboardingForm";

export default async function OnboardingPage() {
  const { getUser, isAuthenticated } = getKindeServerSession();
  const [authed, kindeUser] = await Promise.all([isAuthenticated(), getUser()]);

  if (!authed || !kindeUser?.id) redirect("/api/auth/login");

  const dbUser = await db.query.users.findFirst({
    where: eq(users.kindeId, kindeUser.id),
  });

  if (dbUser) redirect("/");

  const suggestedHandle = (kindeUser.given_name ?? kindeUser.email?.split("@")[0] ?? "user")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 30);

  const suggestedDisplayName =
    [kindeUser.given_name, kindeUser.family_name].filter(Boolean).join(" ") ||
    kindeUser.email?.split("@")[0] ||
    "New User";

  return (
    <main className="juce-shell flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-6 p-8">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight" style={{ color: "var(--color-text)" }}>
            Welcome to Juce
          </h1>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Set up your profile to get started.
          </p>
        </div>
        <OnboardingForm
          suggestedHandle={suggestedHandle}
          suggestedDisplayName={suggestedDisplayName}
        />
      </div>
    </main>
  );
}
