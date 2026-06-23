import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";

import { authMiddleware } from "./middleware/auth.ts";
import detection from "./routes/detection.ts";
import parkir from "./routes/parkir.ts";
import history from "./routes/history.ts";
import stream from "./routes/stream.ts";
import auth from "./routes/auth.ts";

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: "http://localhost:5173",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

app.use("/uploads/*", serveStatic({ root: "./" }));

app.get("/", (c) => c.text("Hello Bun!"));

app.route("/auth", auth);

// app.use("/detection/*", authMiddleware);
app.use("/parkir/*", authMiddleware);
app.use("/history/*", authMiddleware);

app.route("/detection", detection);
app.route("/parkir", parkir);
app.route("/history", history);
app.route("/stream", stream);

export default {
  port: 3000,
  hostname: "0.0.0.0",
  fetch: app.fetch,
};
