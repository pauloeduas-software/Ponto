import { prisma } from "./prisma.server";
import bcrypt from "bcryptjs";
import { createUserSession } from "./session.server";

// Hash fixo usado quando o usuário não existe, para o tempo de resposta
// não revelar quais usernames estão cadastrados.
const DUMMY_HASH = bcrypt.hashSync("ponto-dummy-password", 10);

export async function loginUser(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username }
  });
  const valid = await bcrypt.compare(password || "", user?.password || DUMMY_HASH);

  if (!user || !valid) {
    return { error: "Usuário ou senha inválidos." };
  }

  return createUserSession({ userId: user.id, redirectTo: "/" });
}
