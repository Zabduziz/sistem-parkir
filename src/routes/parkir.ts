import { Hono } from "hono";
import { db } from "../db/pool.ts";
import { parkir, gambarValidasiGagal } from "../db/schema.ts";
import { eq, desc, and, sql } from "drizzle-orm";
import { join } from "node:path";
import dayjs from "dayjs";

const app = new Hono();

// --- GET: Ambil Data Parkir Aktif berdasarkan Plat ---
app.get("/", async (c) => {
  try {
    const plateNumber = c.req.query("plateNumber");

    if (!plateNumber) {
      return c.json({ message: "Parameter plateNumber diperlukan" }, 400);
    }

    // Cari transaksi parkir TERAKHIR untuk plat ini
    const lastData = await db.query.parkir.findFirst({
      where: eq(parkir.platNomor, plateNumber),
      orderBy: [desc(parkir.waktuMasuk)],
    });

    // Validasi jika plat tidak ada di DB atau sudah berstatus 'keluar'
    if (!lastData || lastData.status === "keluar") {
      return c.json(
        { message: "Kendaraan tidak ditemukan atau sudah keluar!", data: null },
        404
      );
    }

    // Pastikan faceEmbedding terparse sebagai Array jika tersimpan sebagai JSON string
    let parsedEmbedding = lastData.faceEmbedding;
    if (typeof parsedEmbedding === "string") {
      try {
        parsedEmbedding = JSON.parse(parsedEmbedding);
      } catch (e) {
        console.error("Gagal parse faceEmbedding string:", e);
      }
    }

    const formatted = {
      ...lastData,
      faceEmbedding: parsedEmbedding,
      waktuMasuk: dayjs(lastData.waktuMasuk).format("DD-MM-YYYY HH:mm"),
      waktuKeluar: lastData.waktuKeluar
        ? dayjs(lastData.waktuKeluar).format("DD-MM-YYYY HH:mm")
        : "belum keluar",
      gambarMasukPath: lastData.gambarMasukPath
        ? `http://localhost:3000/${lastData.gambarMasukPath}`
        : "Tidak ada Gambar Masuk",
      gambarKeluarPath: lastData.gambarKeluarPath
        ? `http://localhost:3000/${lastData.gambarKeluarPath}`
        : "Tidak ada Gambar keluar",
    };

    return c.json(
      {
        message: `Data transaksi plat ${plateNumber} ditemukan`,
        data: formatted,
      },
      200
    );
  } catch (e) {
    console.error("GET Error:", e);
    return c.json(
      {
        message: "Terjadi kesalahan saat mengambil data parkir",
        error: e instanceof Error ? e.message : String(e),
      },
      500
    );
  }
});

// --- GET: Cari Plat Mirip yang Masih Aktif (Masuk) ---
app.get("/find", async (c) => {
  try {
    const plateNumber = c.req.query("plateNumber");

    if (!plateNumber) {
      return c.json({ message: "Parameter plateNumber diperlukan" }, 400);
    }

    // Threshold kemiripan pg_trgm (0-1), makin besar makin ketat
    const threshold = 0.2;

    const result = await db
      .select({
        platNomor: parkir.platNomor,
        similarity: sql<number>`similarity(${parkir.platNomor}, ${plateNumber})`,
      })
      .from(parkir)
      .where(
        and(
          eq(parkir.status, "masuk"),
          sql`similarity(${parkir.platNomor}, ${plateNumber}) > ${threshold}`
        )
      )
      .orderBy(
        desc(sql`similarity(${parkir.platNomor}, ${plateNumber})`),
        desc(parkir.waktuMasuk)
      )
      .limit(1);

    if (result.length === 0) {
      return c.text("", 404);
    }

    return c.text(result[0].platNomor);
  } catch (e) {
    console.error("GET /find Error:", e);
    return c.json(
      {
        message: "Terjadi kesalahan saat mencari plat mirip",
        error: e instanceof Error ? e.message : String(e),
      },
      500
    );
  }
});

// --- GET: Ambil Semua Data Gambar Validasi Gagal ---
app.get("/gagal", async (c) => {
  try {
    const result = await db
      .select()
      .from(gambarValidasiGagal)
      .orderBy(desc(gambarValidasiGagal.waktuValidasi));

    const formatted = result.map((item) => ({
      ...item,
      waktuValidasi: dayjs(item.waktuValidasi).format("DD-MM-YYYY HH:mm"),
      gambarGagalPath: item.gambarGagalPath
        ? `http://localhost:3000/${item.gambarGagalPath}`
        : "Tidak ada Gambar",
    }));

    return c.json({ message: "Data Gambar Validasi Gagal", data: formatted }, 200);
  } catch (e) {
    console.error("GET /gagal Error:", e);
    return c.json(
      {
        message: "Terjadi kesalahan saat mengambil data gambar validasi gagal",
        error: e instanceof Error ? e.message : String(e),
      },
      500
    );
  }
});

// --- PUT: Simpan Gambar Validasi Gagal ---
app.put("/gagal", async (c) => {
  try {
    const body = await c.req.parseBody();
    const plateNumber = body["plateNumber"] as string;
    const gambar = body["gambar"] as File | undefined;
    const similarity = Number(body["similarity"]);

    if (!plateNumber) {
      return c.json({ message: "Parameter plateNumber diperlukan" }, 400);
    }

    let filePath = "";
    if (gambar && typeof gambar !== "string" && gambar.name) {
      const gambarName = `${Date.now()}_${gambar.name}`;
      filePath = join("./uploads/", gambarName);
      const arrayBuffer = await gambar.arrayBuffer();
      await Bun.write(filePath, arrayBuffer);
    } else {
      return c.json({ message: "File gambar diperlukan" }, 400);
    }

    const result = await db
      .insert(gambarValidasiGagal)
      .values({
        platNomor: plateNumber,
        gambarGagalPath: filePath,
        similarity: isNaN(similarity) ? null : similarity,
        waktuValidasi: new Date(),
      })
      .returning();

    return c.json(
      { message: `Gambar validasi gagal untuk plat ${plateNumber} berhasil disimpan`, data: result[0] },
      201
    );
  } catch (e) {
    console.error("PUT /gagal Error:", e);
    return c.json(
      {
        message: "Terjadi kesalahan saat menyimpan gambar validasi gagal",
        error: e instanceof Error ? e.message : String(e),
      },
      500
    );
  }
});

// --- PUT: Process Gate Keluar ---
app.put("/", async (c) => {
  try {
    const body = await c.req.parseBody();
    const plateNumber = body["plateNumber"] as string;
    const similarity = Number(body["similarity"]);
    const gambarKeluar = body["gambarKeluar"] as File | undefined;

    if (!plateNumber) {
      return c.json({ message: "Parameter plateNumber diperlukan" }, 400);
    }

    // 1. Cari transaksi parkir aktif
    const lastData = await db.query.parkir.findFirst({
      where: eq(parkir.platNomor, plateNumber),
      orderBy: [desc(parkir.waktuMasuk)],
    });

    if (!lastData || lastData.status === "keluar") {
      return c.json(
        { success: false, message: "Tidak ada kendaraan aktif dengan plat tersebut!" },
        400
      );
    }

    // 2. Handling File Upload Aman
    let filePath = "";
    if (gambarKeluar && typeof gambarKeluar !== "string" && gambarKeluar.name) {
      const gambarName = `${Date.now()}_${gambarKeluar.name}`;
      filePath = join("./uploads/", gambarName);
      const arrayBuffer = await gambarKeluar.arrayBuffer();
      await Bun.write(filePath, arrayBuffer);
    }

    // 3. Update SPESIFIK HANYA pada ID transaksi terkait
    const result = await db
      .update(parkir)
      .set({
        status: "keluar",
        waktuKeluar: new Date(),
        similarity: isNaN(similarity) ? null : similarity,
        gambarKeluarPath: filePath,
      })
      .where(eq(parkir.id, lastData.id)) // FIX: Lock ID transaksi
      .returning();

    return c.json(
      { message: `Data plat ${plateNumber} berhasil diperbarui (Keluar)`, data: result[0] },
      200
    );
  } catch (e) {
    console.error("PUT Error:", e);
    return c.json(
      {
        message: "Terjadi kesalahan saat memperbarui data parkir",
        error: e instanceof Error ? e.message : String(e),
      },
      500
    );
  }
});

export default app;
