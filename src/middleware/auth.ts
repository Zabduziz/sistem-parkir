import { jwt } from "hono/jwt";
import type { MiddlewareHandler } from "hono";

const JWT_SECRET = process.env.JWT_SECRET!;

export const authMiddleware: MiddlewareHandler = jwt({
  secret: JWT_SECRET,
  alg: "HS256",
});
