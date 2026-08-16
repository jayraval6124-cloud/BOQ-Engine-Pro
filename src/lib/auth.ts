import { prisma } from "@/lib/db";

// Personal edition — auth is bypassed. We use the first DB user as the session owner.
let _cachedUserId: string | null = null;

export async function auth() {
  if (!_cachedUserId) {
    let user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!user) {
      const bcrypt = await import("bcryptjs");
      const hash   = await bcrypt.hash("admin", 10);
      user = await prisma.user.create({
        data: { name: "Admin", email: "admin@boqengine.local", password: hash },
      });
    }
    _cachedUserId = user.id;
  }
  return {
    user: { id: _cachedUserId, name: "Admin", email: "admin@boqengine.local" },
    expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

// Stub exports used by the NextAuth API route and other imports
export const handlers = {
  GET:  () => new Response(null, { status: 204 }),
  POST: () => new Response(null, { status: 204 }),
};
export const signIn  = async () => {};
export const signOut = async () => {};
