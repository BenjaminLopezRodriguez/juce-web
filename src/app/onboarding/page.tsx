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
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ background: "var(--color-surface)" }}
    >
      <div
        className="w-full max-w-sm p-8 flex flex-col gap-6"
        style={{
          background: "var(--color-surface-elevated)",
          borderRadius: "var(--juce-radius-xl)",
          boxShadow: "var(--shadow-float)",
        }}
      >
        <div className="flex flex-col gap-1">
          <h1
            className="text-2xl font-black"
            style={{ fontFamily: "var(--font-rounded)", color: "var(--color-app-primary)" }}
          >
            Welcome to Juce
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
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
