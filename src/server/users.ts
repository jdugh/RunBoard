import "server-only";
import { prisma } from "@/lib/prisma";

export interface UserDTO {
  id: string;
  name: string;
  color: string | null;
}

export async function listUsers(): Promise<UserDTO[]> {
  const rows = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  });
  return rows;
}

export async function createUser(
  name: string,
  color: string | null,
): Promise<UserDTO> {
  return prisma.user.create({
    data: { name, color },
    select: { id: true, name: true, color: true },
  });
}
