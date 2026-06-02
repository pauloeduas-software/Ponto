import { prisma } from "./prisma.server";
import bcrypt from "bcryptjs";
import { createUserSession } from "./session.server";

export async function registerUser(username: string, password: string, name: string) {
  const existing = await prisma.user.findUnique({
    where: { username }
  });
  if (existing) {
    return { error: "Este usuário já existe." };
  }

  const userId = crypto.randomUUID();
  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      id: userId,
      username,
      password: hashedPassword,
      name,
      role: "employee"
    }
  });

  return createUserSession({ userId, redirectTo: "/" });
}

export async function loginUser(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username }
  });
  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    return { error: "Usuário ou senha inválidos." };
  }

  return createUserSession({ userId: user.id, redirectTo: "/" });
}
