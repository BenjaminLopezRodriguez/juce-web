"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

interface MomentCardProps {
  moment: {
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
  };
  currentUserId: number;
}

export function MomentCard({ moment }: MomentCardProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(moment.likeCount);

  const like = api.moment.like.useMutation({
    onMutate: () => { setLiked(true); setLikeCount((c) => c + 1); },
    onError: () => { setLiked(false); setLikeCount((c) => Math.max(0, c - 1)); },
  });
  const unlike = api.moment.unlike.useMutation({
    onMutate: () => { setLiked(false); setLikeCount((c) => Math.max(0, c - 1)); },
    onError: () => { setLiked(true); setLikeCount((c) => c + 1); },
  });

  function toggleLike() {
    if (liked) unlike.mutate({ momentId: moment.id });
    else like.mutate({ momentId: moment.id });
  }

  return (
    <div className="juce-card flex flex-col gap-3 p-4">
      {/* Author row */}
      <div className="flex items-center gap-2.5">
        <div
          className="h-8 w-8 flex-shrink-0 rounded-full bubble-gradient"
          style={{
            "--palette-from": moment.author.paletteFrom,
            "--palette-to": moment.author.paletteTo,
          } as React.CSSProperties}
        />
        <div className="flex flex-col leading-none gap-0.5 min-w-0 flex-1">
          <span className="text-sm font-semibold" style={{ color: "var(--color-app-primary)" }}>
            {moment.author.displayName}
          </span>
          <span className="text-xs truncate" style={{ color: "var(--color-muted)" }}>
            from &ldquo;{moment.room.title}&rdquo;
          </span>
        </div>
        {moment.clipDurationSecs > 0 && (
          <span
            className="juce-pill flex-shrink-0"
            style={{ background: "var(--color-muted-bg)", color: "var(--color-muted)" }}
          >
            {moment.clipDurationSecs}s
          </span>
        )}
      </div>

      {/* Transcript */}
      <p
        className="text-sm leading-relaxed line-clamp-5"
        style={{ color: "var(--color-app-primary)" }}
      >
        &ldquo;{moment.transcript}&rdquo;
      </p>

      {moment.caption && (
        <p className="text-xs italic" style={{ color: "var(--color-muted)" }}>
          {moment.caption}
        </p>
      )}

      {/* Actions */}
      <div
        className="flex items-center gap-5 pt-2"
        style={{ borderTop: "1px solid var(--color-border)" }}
      >
        <button
          onClick={toggleLike}
          className="flex items-center gap-1.5 text-sm font-medium transition-all active:scale-90"
          style={{ color: liked ? "var(--color-squeeze-accent)" : "var(--color-muted)" }}
        >
          <span className="text-base leading-none">{liked ? "♥" : "♡"}</span>
          <span>{likeCount}</span>
        </button>

        <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--color-muted)" }}>
          <span className="text-base leading-none">↻</span>
          <span>{moment.repostCount}</span>
        </span>

        <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--color-muted)" }}>
          <span className="text-base leading-none">◎</span>
          <span>{moment.replyCount}</span>
        </span>
      </div>
    </div>
  );
}
