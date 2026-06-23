"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

interface Props {
  playbackUrl: string;
}

export function IVSPlayer({ playbackUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [hasStream, setHasStream] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;

    let hls: import("hls.js").default | null = null;

    async function init() {
      const Hls = (await import("hls.js")).default;
      if (Hls.isSupported()) {
        hls = new Hls({ lowLatencyMode: true });
        hls.loadSource(playbackUrl);
        hls.attachMedia(video!);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setHasStream(true);
          void video!.play().catch(() => null);
        });
      } else if (video!.canPlayType("application/vnd.apple.mpegurl")) {
        // Native HLS (Safari / iOS)
        video!.src = playbackUrl;
        video!.addEventListener("loadedmetadata", () => {
          setHasStream(true);
          void video!.play().catch(() => null);
        }, { once: true });
      }
    }

    void init();

    return () => {
      hls?.destroy();
    };
  }, [playbackUrl]);

  // Keep video element in sync with muted state
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted]);

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        controls={false}
        muted
      />

      {/* Unmute / mute toggle — always visible once stream is live */}
      {hasStream && (
        <button
          onClick={() => setMuted((m) => !m)}
          className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-80 active:scale-95"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted
            ? <VolumeX className="size-5 text-white" />
            : <Volume2 className="size-5 text-white" />
          }
        </button>
      )}

      {/* Muted nudge — shown until user taps */}
      {hasStream && muted && (
        <button
          onClick={() => setMuted(false)}
          className="absolute inset-x-0 bottom-16 mx-auto w-max rounded-full px-4 py-2 text-xs font-semibold text-white"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
        >
          Tap to unmute
        </button>
      )}
    </div>
  );
}
