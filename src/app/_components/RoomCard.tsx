interface RoomCardProps {
  room: {
    id: number;
    title: string;
    paletteFrom: string;
    paletteTo: string;
    listenerCount: number;
    host: { handle: string; displayName: string };
  };
}

export function RoomCard({ room }: RoomCardProps) {
  return (
    <div className="flex-shrink-0 w-32 flex flex-col gap-2 cursor-pointer group">
      <div
        className="room-bubble w-full aspect-square flex items-center justify-center transition-transform group-hover:scale-105"
        style={{
          "--palette-from": room.paletteFrom,
          "--palette-to": room.paletteTo,
        } as React.CSSProperties}
      >
        <span
          className="text-white text-xl font-black select-none"
          style={{ fontFamily: "var(--font-rounded)" }}
        >
          {room.title.slice(0, 2).toUpperCase()}
        </span>
      </div>

      <div className="flex flex-col gap-0.5 px-0.5">
        <p
          className="text-xs font-semibold leading-tight line-clamp-2"
          style={{ color: "var(--color-app-primary)" }}
        >
          {room.title}
        </p>
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>
          @{room.host.handle}
        </p>
        <p className="live-dot text-xs" style={{ color: "var(--color-muted)" }}>
          {room.listenerCount} listening
        </p>
      </div>
    </div>
  );
}
