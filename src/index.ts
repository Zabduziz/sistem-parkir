import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";

import { authMiddleware, adminMiddleware } from "./middleware/auth.ts";
import detection from "./routes/detection.ts";
import parkir from "./routes/parkir.ts";
import history from "./routes/history.ts";
import stream from "./routes/stream.ts";
import auth from "./routes/auth.ts";
import users from "./routes/users.ts";

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.use("/uploads/*", serveStatic({ root: "./" }));

app.get("/", (c) => c.text("Hello Bun!"));

app.route("/auth", auth);

// app.use("/detection/*", authMiddleware);
// app.use("/parkir/*", authMiddleware);
app.use("/history/*", authMiddleware);
app.use("/users/*", authMiddleware, adminMiddleware);

app.route("/detection", detection);
app.route("/parkir", parkir);
app.route("/history", history);
app.route("/stream", stream);
app.route("/users", users);

export default {
  port: 3000,
  hostname: "0.0.0.0",
  fetch: app.fetch,
};
