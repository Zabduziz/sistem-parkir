import { verify } from "hono/jwt";
import type { MiddlewareHandler } from "hono";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface JwtUser {
  id: number;
  username: string;
  role: "admin" | "petugas";
}

declare module "hono" {
  interface ContextVariableMap {
    user: JwtUser;
  }
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  try {
    const payload = (await verify(
      header.slice(7),
      JWT_SECRET,
      "HS256",
    )) as unknown as JwtUser;
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ message: "Unauthorized" }, 401);
  }
};

export const adminMiddleware: MiddlewareHandler = async (c, next) => {
  const user = c.get("user");
  if (user?.role !== "admin") {
    return c.json(
      { message: "Forbidden: hanya admin yang dapat mengakses" },
      403,
    );
  }
  await next();
};
