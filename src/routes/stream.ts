import { Hono } from "hono";

const app = new Hono();

app.get("/in", async (c) => {
  const stream = await fetch(`${process.env.TAILSCALE_PI}:5000/stream`);
  return new Response(stream.body, {
    headers: {
      "content-type": "multipart/x-mixed-replace; boundary=frame",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

app.get("/status", async (c) => {
  try {
    const res = await fetch(`${process.env.TAILSCALE_PI_AP2SC}:5001/status`);
    const data = await res.json();
    return c.json(data);
  } catch (e) {
    console.error("GET /stream/status Error:", e);
    return c.json(
      {
        message: "Terjadi kesalahan saat mengambil status dari Pi",
        error: e instanceof Error ? e.message : String(e),
      },
      500
    );
  }
});

app.get("/out", async (c) => {
  const stream = await fetch(`${process.env.TAILSCALE_PI_AP2SC}:5001/stream`);
  return new Response(stream.body, {
    headers: {
      "content-type": "multipart/x-mixed-replace; boundary=frame",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

export default app;
