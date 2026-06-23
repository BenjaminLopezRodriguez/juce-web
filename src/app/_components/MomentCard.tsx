"use client";

import { useState } from "react";
import { Heart, Repeat2, MessageCircle } from "lucide-react";
import { api } from "~/trpc/react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
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
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback
            className="bubble-gradient text-white text-xs font-bold"
            style={{
              "--palette-from": moment.author.paletteFrom,
              "--palette-to": moment.author.paletteTo,
            } as React.CSSProperties}
          >
            {moment.author.handle.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-none">
          <span className="text-sm font-semibold" style={{ color: "var(--color-app-primary)" }}>
            {moment.author.displayName}
          </span>
          <span className="truncate text-xs" style={{ color: "var(--color-text-muted)" }}>
            from &ldquo;{moment.room.title}&rdquo;
          </span>
        </div>

        {moment.clipDurationSecs > 0 && (
          <Badge
            variant="secondary"
            className="flex-shrink-0 rounded-full text-[10px] font-extrabold uppercase tracking-wider"
          >
            {moment.clipDurationSecs}s
          </Badge>
        )}
      </div>

      {/* Transcript */}
      <p
        className="line-clamp-5 text-sm leading-relaxed"
        style={{ color: "var(--color-app-primary)" }}
      >
        &ldquo;{moment.transcript}&rdquo;
      </p>

      {moment.caption && (
        <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>
          {moment.caption}
        </p>
      )}

      {/* Actions */}
      <div
        className="flex items-center gap-1 pt-2"
        style={{ borderTop: "1px solid var(--color-juce-border)" }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLike}
          className="flex items-center gap-1.5 rounded-full px-3 transition-all active:scale-90"
          style={{ color: liked ? "var(--color-squeeze-accent)" : "var(--color-text-muted)" }}
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
          <span className="text-sm">{likeCount}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1.5 rounded-full px-3"
          style={{ color: "var(--color-text-muted)" }}
        >
          <Repeat2 className="h-4 w-4" />
          <span className="text-sm">{moment.repostCount}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1.5 rounded-full px-3"
          style={{ color: "var(--color-text-muted)" }}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-sm">{moment.replyCount}</span>
        </Button>
      </div>
    </div>
  );
}
