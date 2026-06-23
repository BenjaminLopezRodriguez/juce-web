import { momentRouter } from "~/server/api/routers/moment";
import { roomRouter } from "~/server/api/routers/room";
import { userRouter } from "~/server/api/routers/user";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  user: userRouter,
  room: roomRouter,
  moment: momentRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
