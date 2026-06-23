import Link from "next/link";

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
    <Link href={`/room/${room.id}`} className="flex w-28 flex-shrink-0 flex-col gap-2.5">
      <div
        className="room-bubble flex aspect-square w-full items-center justify-center"
        style={{ "--palette-from": room.paletteFrom } as React.CSSProperties}
      >
        <span className="select-none text-sm font-medium text-white/90">
          {room.title.slice(0, 2).toUpperCase()}
        </span>
      </div>

      <div className="flex flex-col gap-0.5">
        <p
          className="line-clamp-2 text-sm font-medium leading-snug"
          style={{ color: "var(--color-app-primary)" }}
        >
          {room.title}
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          @{room.host.handle} · {room.listenerCount}
        </p>
      </div>
    </Link>
  );
}
