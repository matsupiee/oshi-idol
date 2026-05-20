import { createAuth } from "@oshi-idol/auth";
import { createDb } from "@oshi-idol/db";

export async function createContext({ req }: { req: Request }) {
  const session = await createAuth().api.getSession({
    headers: req.headers,
  });
  return {
    auth: null,
    session,
    db: createDb(),
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
