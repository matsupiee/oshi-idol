import { createAuth } from "@oshi-idol/auth";
import { createDb } from "@oshi-idol/db";

export async function createContext({ req }: { req: Request }) {
  const session = await createAuth().api.getSession({
    headers: req.headers,
  });
  const ipAddress =
    req.headers.get("CF-Connecting-IP") ??
    req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
    null;
  return {
    auth: null,
    session,
    db: createDb(),
    ipAddress,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
