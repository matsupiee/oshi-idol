import { protectedProcedure, publicProcedure, router } from "../index";
import { adminRouter } from "./admin";
import { idolsRouter } from "./idols";
import { rankingRouter } from "./ranking";
import { votesRouter } from "./votes";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  idols: idolsRouter,
  votes: votesRouter,
  ranking: rankingRouter,
  admin: adminRouter,
});
export type AppRouter = typeof appRouter;
