import { Hono } from "hono";
import { db } from "../db/pool.ts";
import { parkir } from "../db/schema.ts";
import { eq, desc } from "drizzle-orm";
import { join } from "node:path";

const app = new Hono();

app.post("/", async (c) => {
  try {
    const body = await c.req.parseBody();
    const platNomor = body["platNomor"] as string;
    const userId = Number(body["userId"]);
    const confidencePlat = Number(body["confidencePlat"]);

    const faceEmbeddingRaw = body["faceEmbedding"];
    const faceEmbedding =
      typeof faceEmbeddingRaw === "string"
        ? JSON.parse(faceEmbeddingRaw)
        : faceEmbeddingRaw;

    const gambar = body["gambar"] as File;
    let gambarPath = "";
    if (gambar) {
      gambarPath = `${Date.now()}_${gambar.name}`;
    }
    const filePath = join("./uploads/", gambarPath);
    const arrayBuffer = await gambar.arrayBuffer();

    const lastData = await db.query.parkir.findFirst({
      where: eq(parkir.platNomor, platNomor),
      orderBy: [desc(parkir.waktuMasuk)],
    });
    if (lastData && lastData.status === "masuk") {
      return c.json(
        { success: false, message: "Kendaraan masih terparkir" },
        400,
      );
    }

    await Bun.write(filePath, arrayBuffer);

    const newRecord = await db
      .insert(parkir)
      .values({
        platNomor,
        waktuMasuk: new Date(),
        status: "masuk",
        faceEmbedding,
        gambarMasukPath: filePath,
        userId,
        confidencePlat,
      })
      .returning();

    return c.json(
      { message: "Data deteksi berhasil disimpan", data: newRecord[0] },
      201,
    );
  } catch (e) {
    console.error(e);
    return c.json(
      {
        message: "Terjadi kesalahan saat memproses data",
        error: e instanceof Error ? e.message : String(e),
      },
      400,
    );
  }
});

export default app;
