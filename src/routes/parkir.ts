import { Hono } from "hono";
import { db } from "../db/pool.ts";
import { parkir } from "../db/schema.ts";
import { eq, desc } from "drizzle-orm";
import { join } from "node:path";

const app = new Hono();

app.get("/", async (c) => {
  try {
    const plateNumber = c.req.query("plateNumber");

    if (!plateNumber) {
      return c.json({ message: "Parameter plateNumber diperlukan" }, 400);
    }

    const lastData = await db.query.parkir.findFirst({
      where: eq(parkir.platNomor, plateNumber),
      orderBy: [desc(parkir.waktuMasuk)],
    });

    return c.json({ message: `Data with plate ${plateNumber}`, data: lastData }, 200);
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

app.put("/", async (c) => {
  try {
    const body = await c.req.parseBody();
    const plateNumber = body["plateNumber"] as string;
    const similarity = Number(body["similarity"]);
    const gambarKeluar = body["gambarKeluar"] as File;

    if (!plateNumber) {
      return c.json({ message: "Parameter plateNumber diperlukan" }, 400);
    }

    let gambarPath = "";
    if (gambarKeluar) {
      gambarPath = `${Date.now()}_${gambarKeluar.name}`;
    }
    const filePath = join("./uploads/", gambarPath);
    const arrayBuffer = await gambarKeluar.arrayBuffer();

    const lastData = await db.query.parkir.findFirst({
      where: eq(parkir.platNomor, plateNumber),
      orderBy: [desc(parkir.waktuMasuk)],
    });

    if (lastData && lastData.status === "keluar") {
      return c.json(
        { success: false, message: "Tidak ada kendaraan dengan plat tersebut terparkir!" },
        400,
      );
    }

    await Bun.write(filePath, arrayBuffer);

    const result = await db
      .update(parkir)
      .set({
        status: "keluar",
        waktuKeluar: new Date(),
        similarity,
        gambarKeluarPath: filePath,
      })
      .where(eq(parkir.platNomor, plateNumber))
      .returning();

    return c.json({ message: `Data with plate ${plateNumber} updated`, data: result }, 200);
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
