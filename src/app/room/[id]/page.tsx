import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "~/server/db";
import { rooms, users } from "~/server/db/schema";
import { RoomView } from "./_components/RoomView";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RoomPage({ params }: Props) {
  const { id } = await params;
  const roomId = Number(id);
  if (isNaN(roomId)) notFound();

  const { getUser, isAuthenticated } = getKindeServerSession();
  const [authed, kindeUser] = await Promise.all([isAuthenticated(), getUser()]);
  if (!authed || !kindeUser?.id) redirect("/api/auth/login");

  const [room, dbUser] = await Promise.all([
    db.query.rooms.findFirst({
      where: eq(rooms.id, roomId),
      with: {
        host: {
          columns: { id: true, handle: true, displayName: true, paletteFrom: true, paletteTo: true },
        },
      },
      columns: {
        id: true, title: true, state: true, paletteFrom: true, paletteTo: true,
        listenerCount: true, hostId: true, ivsPlaybackUrl: true, createdAt: true,
        ivsChannelArn: false, ivsStreamKey: false, ivsIngestEndpoint: false,
        endedAt: false, scheduledAt: false,
      },
    }),
    db.query.users.findFirst({ where: eq(users.kindeId, kindeUser.id) }),
  ]);

  if (!room) notFound();
  if (!dbUser) redirect("/onboarding");

  return (
    <RoomView
      room={room}
      currentUser={{ id: dbUser.id, handle: dbUser.handle, displayName: dbUser.displayName }}
      isHost={room.hostId === dbUser.id}
    />
  );
}
