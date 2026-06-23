import { Hono } from "hono";
import { db } from "../db/pool.ts";
import { parkir } from "../db/schema.ts";
import { desc } from "drizzle-orm";
import dayjs from "dayjs";

const app = new Hono();

app.get("/", async (c) => {
  try {
    const result = await db
      .select({
        id: parkir.id,
        platNomor: parkir.platNomor,
        confidencePlat: parkir.confidencePlat,
        waktuMasuk: parkir.waktuMasuk,
        waktuKeluar: parkir.waktuKeluar,
        status: parkir.status,
        similarity: parkir.similarity,
        gambarMasukPath: parkir.gambarMasukPath,
        gambarKeluarPath: parkir.gambarKeluarPath,
        userId: parkir.userId,
      })
      .from(parkir)
      .orderBy(desc(parkir.waktuMasuk));

    const formatted = result.map((item) => ({
      ...item,
      waktuMasuk: dayjs(item.waktuMasuk).format("DD-MM-YYYY HH:mm"),
      waktuKeluar: item.waktuKeluar
        ? dayjs(item.waktuKeluar).format("DD-MM-YYYY HH:mm")
        : "belum keluar",
      gambarMasukPath: item.gambarMasukPath
        ? `http://localhost:3000/${item.gambarMasukPath}`
        : "Tidak ada Gambar Masuk",
      gambarKeluarPath: item.gambarKeluarPath
        ? `http://localhost:3000/${item.gambarKeluarPath}`
        : "Tidak ada Gambar keluar",
    }));

    return c.json({ message: "Data History", data: formatted }, 200);
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
