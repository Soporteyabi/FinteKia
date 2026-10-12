import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, name?: string, role?: string, cargo?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        name: name || email.split('@')[0],
        role: role || 'Admin',
        cargo: cargo || 'Administrador',
        active: true,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(name ? { name } : {}),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database query getOrCreateUser failed:", error);
    throw new Error("Database operation failed. Please try again later.", { cause: error });
  }
}

export async function getUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error("Database query getUsers failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}
