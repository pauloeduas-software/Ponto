import { db } from "./db.server";
import bcrypt from "bcryptjs";
import { createUserSession } from "./session.server";

export async function registerUser(username: string, password: string, name: string) {
  const existing = db.prepare("SELECT id FROM User WHERE username = ?").get(username);
  if (existing) {
    return { error: "Este usuário já existe." };
  }

  const userId = crypto.randomUUID();
  const hashedPassword = await bcrypt.hash(password, 10);

  db.prepare(
    "INSERT INTO User (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)"
  ).run(userId, username, hashedPassword, name, "employee");

  return createUserSession({ userId, redirectTo: "/" });
}

export async function loginUser(username: string, password: string) {
  const user = db.prepare("SELECT * FROM User WHERE username = ?").get(username) as any;
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return { error: "Usuário ou senha inválidos." };
  }

  return createUserSession({ userId: user.id, redirectTo: "/" });
}
