"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { CURRENT_USER_COOKIE } from "@/server/current-user";
import { createUser, listUsers, type UserDTO } from "@/server/users";
import { prisma } from "@/lib/prisma";

export interface UserActionResult {
  ok: boolean;
  user?: UserDTO;
  error?: string;
}

// One year — this is a profile selector, not a security session.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

async function setCurrentUserCookie(id: string) {
  const store = await cookies();
  store.set(CURRENT_USER_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function getUsers(): Promise<UserDTO[]> {
  return listUsers();
}

export async function selectUser(id: string): Promise<UserActionResult> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, color: true },
  });
  if (!user) return { ok: false, error: "Utilisateur introuvable" };
  await setCurrentUserCookie(user.id);
  revalidatePath("/");
  return { ok: true, user };
}

const createUserSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(40, "Nom trop long"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide")
    .optional(),
});

export async function createAndSelectUser(
  input: unknown,
): Promise<UserActionResult> {
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides",
    };
  }
  const { name, color } = parsed.data;
  const user = await createUser(name, color ?? null);
  await setCurrentUserCookie(user.id);
  revalidatePath("/");
  return { ok: true, user };
}
