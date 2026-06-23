"use client";

import { useEffect, useRef } from "react";

interface Props {
  playbackUrl: string;
}

export function IVSPlayer({ playbackUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

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
          void video!.play().catch(() => null);
        });
      } else if (video!.canPlayType("application/vnd.apple.mpegurl")) {
        // Native HLS (Safari)
        video!.src = playbackUrl;
        void video!.play().catch(() => null);
      }
    }

    void init();

    return () => {
      hls?.destroy();
    };
  }, [playbackUrl]);

  return (
    <video
      ref={videoRef}
      className="w-full h-full object-cover"
      playsInline
      controls={false}
      muted={false}
    />
  );
}
