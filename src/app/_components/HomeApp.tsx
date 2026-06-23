"use client";

import { useState } from "react";
import { Home, Radio, User } from "lucide-react";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { MomentCard } from "./MomentCard";
import { RoomCard } from "./RoomCard";
import { SnippetComposer } from "./SnippetComposer";
import { StartRoomButton } from "./StartRoomButton";

type Tab = "snippets" | "rooms" | "profile";

type User = {
  id: number;
  handle: string;
  displayName: string;
  bio: string | null;
  paletteFrom: string;
  paletteTo: string;
  createdAt: Date;
};

type LiveRoom = {
  id: number;
  title: string;
  paletteFrom: string;
  paletteTo: string;
  listenerCount: number;
  host: { handle: string; displayName: string };
};

type Snippet = {
  id: number;
  transcript: string;
  caption: string | null;
  clipDurationSecs: number;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  author: {
    id: number;
    displayName: string;
    handle: string;
    paletteFrom: string;
    paletteTo: string;
  };
  room: { id: number; title: string };
  source: "room_conversation" | "host_moment" | "audience_reaction";
};

const NAV = [
  { id: "snippets" as const, icon: Home,  label: "Home" },
  { id: "rooms"    as const, icon: Radio, label: "Rooms" },
  { id: "profile"  as const, icon: User,  label: "Profile" },
];

export function HomeApp({
  user,
  liveRooms,
  snippets,
  hostedRoomCount,
}: {
  user: User;
  liveRooms: LiveRoom[];
  snippets: Snippet[];
  hostedRoomCount: number;
}) {
  const [tab, setTab] = useState<Tab>("snippets");

  return (
    <div className="juce-shell flex min-h-dvh flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-20 border-b"
        style={{ background: "var(--color-background)", borderColor: "var(--color-juce-border)" }}
      >
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-3">
          <span
            className="font-heading text-lg font-semibold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            Juce
          </span>
          {tab === "rooms" && <StartRoomButton />}
        </div>
      </header>

      {/* Content */}
      <main
        className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-6"
        style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}
      >
        {tab === "snippets" && (
          <SnippetsPanel snippets={snippets} currentUserId={user.id} />
        )}
        {tab === "rooms" && <RoomsPanel liveRooms={liveRooms} />}
        {tab === "profile" && (
          <ProfilePanel
            user={user}
            hostedRoomCount={hostedRoomCount}
            snippetCount={snippets.filter((s) => s.author.id === user.id).length}
          />
        )}
      </main>

      {/* Bottom nav — Threads style */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t"
        style={{
          background: "var(--color-background)",
          borderColor: "var(--color-juce-border)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="mx-auto flex max-w-lg items-center justify-around py-2">
          {NAV.map(({ id, icon: Icon, label }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-label={label}
                className="flex items-center justify-center p-3 transition-opacity active:opacity-60"
                style={{ color: active ? "var(--color-text)" : "var(--color-muted)" }}
              >
                <Icon
                  className="size-6"
                  strokeWidth={active ? 2.5 : 1.5}
                />
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function SnippetsPanel({
  snippets,
  currentUserId,
}: {
  snippets: Snippet[];
  currentUserId: number;
}) {
  return (
    <section className="flex flex-col">
      <SnippetComposer />
      {snippets.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          No snippets yet. Record one above.
        </p>
      ) : (
        <div className="flex flex-col divide-y" style={{ borderColor: "var(--color-juce-border)" }}>
          {snippets.map((snippet) => (
            <div key={snippet.id} className="py-5 first:pt-0 last:pb-0">
              <MomentCard moment={snippet} currentUserId={currentUserId} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RoomsPanel({ liveRooms }: { liveRooms: LiveRoom[] }) {
  if (liveRooms.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 pt-2">
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>No live rooms.</p>
        <StartRoomButton label="Start a room" />
      </div>
    );
  }

  return (
    <div className="-mx-1 flex gap-5 overflow-x-auto px-1">
      {liveRooms.map((room) => (
        <RoomCard key={room.id} room={room} />
      ))}
    </div>
  );
}

function ProfilePanel({
  user,
  hostedRoomCount,
  snippetCount,
}: {
  user: User;
  hostedRoomCount: number;
  snippetCount: number;
}) {
  const memberSince = user.createdAt.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <section className="flex flex-col gap-8">
      <div className="flex items-start gap-4">
        <Avatar className="size-14 flex-shrink-0">
          <AvatarFallback
            className="bubble-gradient text-base font-medium text-white"
            style={{
              "--palette-from": user.paletteFrom,
              "--palette-to": user.paletteTo,
            } as React.CSSProperties}
          >
            {(user.handle ?? "?").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-col gap-1 pt-0.5">
          <h2 className="text-base font-medium" style={{ color: "var(--color-text)" }}>
            {user.displayName}
          </h2>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            @{user.handle}
          </p>
          {user.bio && (
            <p className="pt-2 text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
              {user.bio}
            </p>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt style={{ color: "var(--color-muted)" }}>Rooms</dt>
          <dd className="mt-0.5 tabular-nums" style={{ color: "var(--color-text)" }}>{hostedRoomCount}</dd>
        </div>
        <div>
          <dt style={{ color: "var(--color-muted)" }}>Snippets</dt>
          <dd className="mt-0.5 tabular-nums" style={{ color: "var(--color-text)" }}>{snippetCount}</dd>
        </div>
        <div className="col-span-2">
          <dt style={{ color: "var(--color-muted)" }}>Member since</dt>
          <dd className="mt-0.5" style={{ color: "var(--color-text)" }}>{memberSince}</dd>
        </div>
      </dl>

      <LogoutLink
        className="text-sm transition-opacity hover:opacity-70"
        style={{ color: "var(--color-muted)" }}
      >
        Sign out
      </LogoutLink>
    </section>
  );
}
