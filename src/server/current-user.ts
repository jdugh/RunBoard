import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { UserDTO } from "@/server/users";

export const CURRENT_USER_COOKIE = "currentUserId";

export async function getCurrentUserId(): Promise<string | null> {
  const store = await cookies();
  return store.get(CURRENT_USER_COOKIE)?.value ?? null;
}

// Resolves the cookie to a real user. Returns null when no user is selected OR
// when the cookie points to a user that no longer exists (stale cookie) — the
// caller then falls back to the selection modal.
export async function getCurrentUser(): Promise<UserDTO | null> {
  const id = await getCurrentUserId();
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, color: true },
  });
}

// Returns the current user id or throws — used by mutations that must never run
// without a selected profile. The id is always re-read from the cookie server
// side, never trusted from the client payload.
export async function requireCurrentUserId(): Promise<string> {
  const id = await getCurrentUserId();
  if (!id) throw new Error("Aucun utilisateur sélectionné");
  return id;
}
