"use client";

import { useState } from "react";
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

const TABS: { id: Tab; label: string }[] = [
  { id: "snippets", label: "Snippets" },
  { id: "rooms", label: "Rooms" },
  { id: "profile", label: "Profile" },
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
  const [tab, setTab] = useState<Tab>("rooms");

  return (
    <div className="juce-shell flex min-h-dvh flex-col">
      <header
        className="sticky top-0 z-20 border-b"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-juce-border)",
        }}
      >
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          <span className="font-heading text-lg font-semibold tracking-tight" style={{ color: "var(--color-text)" }}>
            Juce
          </span>
          {tab === "rooms" && <StartRoomButton />}
        </div>

        <nav className="mx-auto flex max-w-lg gap-6 px-5">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="juce-tab -mb-px border-b-2 pb-3 text-sm transition-colors"
              style={{
                borderColor: tab === id ? "var(--color-primary)" : "transparent",
                color: tab === id ? "var(--color-app-primary)" : "var(--color-text-muted)",
                fontWeight: tab === id ? 500 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-6">
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
        <EmptyState message="No snippets yet. Record one above." />
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
        <EmptyState message="No live rooms." />
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
          <h2 className="text-base font-medium" style={{ color: "var(--color-app-primary)" }}>
            {user.displayName}
          </h2>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            @{user.handle}
          </p>
          {user.bio ? (
            <p className="pt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              {user.bio}
            </p>
          ) : null}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt style={{ color: "var(--color-text-muted)" }}>Rooms</dt>
          <dd className="mt-0.5 tabular-nums" style={{ color: "var(--color-app-primary)" }}>{hostedRoomCount}</dd>
        </div>
        <div>
          <dt style={{ color: "var(--color-text-muted)" }}>Snippets</dt>
          <dd className="mt-0.5 tabular-nums" style={{ color: "var(--color-app-primary)" }}>{snippetCount}</dd>
        </div>
        <div className="col-span-2">
          <dt style={{ color: "var(--color-text-muted)" }}>Member since</dt>
          <dd className="mt-0.5" style={{ color: "var(--color-app-primary)" }}>{memberSince}</dd>
        </div>
      </dl>

      <LogoutLink
        className="text-sm transition-opacity hover:opacity-70"
        style={{ color: "var(--color-text-muted)" }}
      >
        Sign out
      </LogoutLink>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
      {message}
    </p>
  );
}
