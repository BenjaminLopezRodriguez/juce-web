"use client";

import { useState } from "react";
import { Heart, Repeat2, MessageCircle } from "lucide-react";
import { TIMELINE_ROOM_TITLE } from "~/lib/constants";
import { api } from "~/trpc/react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";

interface MomentCardProps {
  moment: {
    id: number;
    transcript: string;
    caption: string | null;
    clipDurationSecs: number;
    likeCount: number;
    repostCount: number;
    replyCount: number;
    source?: "room_conversation" | "host_moment" | "audience_reaction";
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
  const isTimelineBlurt =
    moment.source === "host_moment" && moment.room.title === TIMELINE_ROOM_TITLE;
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
    <article className="juce-card flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar className="size-8 flex-shrink-0">
          <AvatarFallback
            className="bubble-gradient text-xs font-medium text-white"
            style={{
              "--palette-from": moment.author.paletteFrom,
              "--palette-to": moment.author.paletteTo,
            } as React.CSSProperties}
          >
            {moment.author.handle.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium" style={{ color: "var(--color-app-primary)" }}>
            {moment.author.displayName}
          </span>
          <span className="truncate text-xs" style={{ color: "var(--color-text-muted)" }}>
            {isTimelineBlurt ? (
              <>
                voice note
                {moment.clipDurationSecs > 0 ? ` · ${moment.clipDurationSecs}s` : ""}
              </>
            ) : (
              <>
                {moment.room.title}
                {moment.clipDurationSecs > 0 ? ` · ${moment.clipDurationSecs}s` : ""}
              </>
            )}
          </span>
        </div>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: "var(--color-app-primary)" }}>
        {moment.transcript}
      </p>

      {moment.caption && (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {moment.caption}
        </p>
      )}

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLike}
          className="h-9 gap-1.5 px-2"
          style={{ color: liked ? "var(--color-primary)" : "var(--color-muted)" }}
        >
          <Heart className={`size-3.5 ${liked ? "fill-current" : ""}`} />
          <span className="text-xs tabular-nums">{likeCount}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 px-2"
          style={{ color: "var(--color-text-muted)" }}
        >
          <Repeat2 className="size-3.5" />
          <span className="text-xs tabular-nums">{moment.repostCount}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 px-2"
          style={{ color: "var(--color-text-muted)" }}
        >
          <MessageCircle className="size-3.5" />
          <span className="text-xs tabular-nums">{moment.replyCount}</span>
        </Button>
      </div>
    </article>
  );
}
