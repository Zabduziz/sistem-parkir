import { Hono } from "hono";
import { db } from "../db/pool.ts";
import { users, parkir } from "../db/schema.ts";
import { eq, count } from "drizzle-orm";

const app = new Hono();

app.get("/", async (c) => {
  try {
    const result = await db
      .select({
        id: users.id,
        nama: users.nama,
        username: users.username,
        role: users.role,
      })
      .from(users)
      .orderBy(users.id);

    return c.json({ message: "Data Users", data: result }, 200);
  } catch (e) {
    console.error(e);
    return c.json(
      {
        message: "Terjadi kesalahan saat mengambil data user",
        error: e instanceof Error ? e.message : String(e),
      },
      400,
    );
  }
});

app.post("/", async (c) => {
  try {
    const { nama, username, password, role } = await c.req.json<{
      nama: string;
      username: string;
      password: string;
      role?: "petugas" | "admin";
    }>();

    if (!nama || !username || !password) {
      return c.json(
        { message: "nama, username, dan password wajib diisi" },
        400,
      );
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.username, username),
    });
    if (existing) {
      return c.json({ message: "Username sudah digunakan" }, 409);
    }

    const hashedPassword = await Bun.password.hash(password);

    const [newUser] = await db
      .insert(users)
      .values({
        nama,
        username,
        password: hashedPassword,
        role: role ?? "petugas",
      })
      .returning();

    if (!newUser) {
      return c.json({ message: "Gagal membuat user" }, 500);
    }

    return c.json(
      {
        message: "User berhasil ditambahkan",
        data: {
          id: newUser.id,
          nama: newUser.nama,
          username: newUser.username,
          role: newUser.role,
        },
      },
      201,
    );
  } catch (e) {
    console.error(e);
    return c.json(
      {
        message: "Terjadi kesalahan saat menambah user",
        error: e instanceof Error ? e.message : String(e),
      },
      400,
    );
  }
});

app.put("/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    if (Number.isNaN(id)) {
      return c.json({ message: "ID user tidak valid" }, 400);
    }

    const { nama, username, password, role } = await c.req.json<{
      nama?: string;
      username?: string;
      password?: string;
      role?: "petugas" | "admin";
    }>();

    const existing = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    if (!existing) {
      return c.json({ message: "User tidak ditemukan" }, 404);
    }

    const newUsername = username ?? existing.username;
    if (newUsername !== existing.username) {
      const clash = await db.query.users.findFirst({
        where: eq(users.username, newUsername),
      });
      if (clash) {
        return c.json({ message: "Username sudah digunakan" }, 409);
      }
    }

    const values: {
      nama?: string;
      username?: string;
      password?: string;
      role?: "petugas" | "admin";
    } = {
      nama: nama ?? existing.nama,
      username: newUsername,
      role: role ?? existing.role,
    };

    if (password) {
      values.password = await Bun.password.hash(password);
    }

    const [updated] = await db
      .update(users)
      .set(values)
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      return c.json({ message: "Gagal memperbarui user" }, 500);
    }

    return c.json(
      {
        message: "User berhasil diperbarui",
        data: {
          id: updated.id,
          nama: updated.nama,
          username: updated.username,
          role: updated.role,
        },
      },
      200,
    );
  } catch (e) {
    console.error(e);
    return c.json(
      {
        message: "Terjadi kesalahan saat memperbarui user",
        error: e instanceof Error ? e.message : String(e),
      },
      400,
    );
  }
});

app.delete("/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    if (Number.isNaN(id)) {
      return c.json({ message: "ID user tidak valid" }, 400);
    }

    const currentUser = c.get("user");
    if (id === currentUser.id) {
      return c.json({ message: "Tidak dapat menghapus akun sendiri" }, 400);
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    if (!existing) {
      return c.json({ message: "User tidak ditemukan" }, 404);
    }

    const [parkirCount] = await db
      .select({ jumlah: count() })
      .from(parkir)
      .where(eq(parkir.userId, id));
    if (parkirCount && parkirCount.jumlah > 0) {
      return c.json(
        {
          message:
            "User memiliki data parkir, tidak dapat dihapus. Hapus data parkir terlebih dahulu.",
        },
        400,
      );
    }

    await db.delete(users).where(eq(users.id, id));

    return c.json({ message: "User berhasil dihapus" }, 200);
  } catch (e) {
    console.error(e);
    return c.json(
      {
        message: "Terjadi kesalahan saat menghapus user",
        error: e instanceof Error ? e.message : String(e),
      },
      400,
    );
  }
});

export default app;
