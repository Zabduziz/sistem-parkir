import { Hono } from "hono";

const app = new Hono();

app.get("/in", async (c) => {
  const stream = await fetch(`${process.env.URL_LOCAL_PI}:5000/stream`);
  return new Response(stream.body, {
    headers: {
      "content-type": "multipart/x-mixed-replace; boundary=frame",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

app.get("/out", async (c) => {
  const stream = await fetch(`${process.env.URL_LOCAL_PI}:5001/stream`);
  return new Response(stream.body, {
    headers: {
      "content-type": "multipart/x-mixed-replace; boundary=frame",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

export default app;
