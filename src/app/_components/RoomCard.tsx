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
    <div className="group flex w-32 flex-shrink-0 cursor-pointer flex-col gap-2">
      <div
        className="room-bubble aspect-square w-full flex items-center justify-center transition-transform group-hover:scale-105"
        style={{
          "--palette-from": room.paletteFrom,
          "--palette-to": room.paletteTo,
        } as React.CSSProperties}
      >
        <span
          className="select-none text-xl font-black text-white"
          style={{ fontFamily: "var(--font-rounded)" }}
        >
          {room.title.slice(0, 2).toUpperCase()}
        </span>
      </div>

      <div className="flex flex-col gap-0.5 px-0.5">
        <p
          className="line-clamp-2 text-xs font-semibold leading-tight"
          style={{ color: "var(--color-app-primary)" }}
        >
          {room.title}
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          @{room.host.handle}
        </p>
        <p className="live-dot text-xs" style={{ color: "var(--color-text-muted)" }}>
          {room.listenerCount} listening
        </p>
      </div>
    </div>
  );
}
