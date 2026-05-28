import { db } from "./db.server";
import bcrypt from "bcryptjs";
import type { User, Team, UserTeamMembership } from "../types";

export async function getManagementData(user: User): Promise<{ teams: Team[]; users: User[] }> {
  if (user.role !== "admin") {
    throw new Response("Acesso negado", { status: 403 });
  }

  const teams = await db.prepare("SELECT * FROM Team ORDER BY name").all() as Team[];
  const users = await db.prepare(`
    SELECT u.id, u.username, u.name, u.role, u.goal, u.avatarUrl, u.teamId, t.name as teamName 
    FROM User u 
    LEFT JOIN Team t ON u.teamId = t.id 
    ORDER BY u.name
  `).all() as (Omit<User, "userTeams"> & { teamName: string | null })[];

  const userTeamLinks = await db.prepare(`
    SELECT ut.userId, ut.teamId, ut.role, t.name as teamName
    FROM UserTeam ut
    JOIN Team t ON ut.teamId = t.id
    ORDER BY t.name
  `).all() as { userId: string; teamId: string; role: "manager" | "employee"; teamName: string }[];

  const userTeamsMap: Record<string, UserTeamMembership[]> = {};
  for (const link of userTeamLinks) {
    if (!userTeamsMap[link.userId]) userTeamsMap[link.userId] = [];
    userTeamsMap[link.userId].push({
      teamId: link.teamId,
      teamName: link.teamName,
      role: link.role,
    });
  }

  const usersWithTeams = users.map(u => ({
    ...u,
    teamName: u.teamName || undefined,
    avatarUrl: u.avatarUrl || undefined,
    goal: u.goal || undefined,
    teamId: u.teamId || undefined,
    userTeams: userTeamsMap[u.id] || [],
  }));

  return { teams, users: usersWithTeams };
}

export async function handleManagementAction(executorUser: User, formData: FormData) {
  if (executorUser.role !== "admin") return { error: "Acesso negado" };

  const actionType = formData.get("_action");

  if (actionType === "createTeam") {
    const name = formData.get("name") as string;
    const existing = await db.prepare("SELECT id FROM Team WHERE name = ?").get(name);
    if (existing) return { error: "Já existe uma equipe com este nome." };
    await db.prepare("INSERT INTO Team (id, name) VALUES (?, ?)").run(crypto.randomUUID(), name);
    return { success: true };
  }

  if (actionType === "deleteTeam") {
    const teamId = formData.get("teamId") as string;
    await db.prepare("DELETE FROM UserTeam WHERE teamId = ?").run(teamId);
    await db.prepare("UPDATE User SET teamId = NULL WHERE teamId = ?").run(teamId);
    await db.prepare("DELETE FROM Team WHERE id = ?").run(teamId);
    return { success: true };
  }

  if (actionType === "addUserTeam") {
    const userId = formData.get("userId") as string;
    const teamId = formData.get("teamId") as string;
    const role = formData.get("role") as string;
    if (!userId || !teamId || !role) return { error: "Dados incompletos." };
    const validRole = role === "manager" ? "manager" : "employee";
    
    // Query universal ON CONFLICT compatível com PostgreSQL
    await db.prepare(
      "INSERT INTO UserTeam (userId, teamId, role) VALUES (?, ?, ?) ON CONFLICT (userId, teamId) DO UPDATE SET role = EXCLUDED.role"
    ).run(userId, teamId, validRole);
    return { success: true };
  }

  if (actionType === "removeUserTeam") {
    const userId = formData.get("userId") as string;
    const teamId = formData.get("teamId") as string;
    await db.prepare("DELETE FROM UserTeam WHERE userId = ? AND teamId = ?").run(userId, teamId);
    return { success: true };
  }

  if (actionType === "removePrimaryTeam") {
    const userId = formData.get("userId") as string;
    await db.prepare("UPDATE User SET teamId = NULL WHERE id = ?").run(userId);
    return { success: true };
  }

  if (actionType === "updateUserTeamRole") {
    const userId = formData.get("userId") as string;
    const teamId = formData.get("teamId") as string;
    const role = formData.get("role") as string;
    const validRole = role === "manager" ? "manager" : "employee";
    await db.prepare("UPDATE UserTeam SET role = ? WHERE userId = ? AND teamId = ?").run(validRole, userId, teamId);
    return { success: true };
  }

  if (actionType === "deleteUser") {
    const userId = formData.get("userId") as string;
    
    // Transação assíncrona robusta para Postgres
    await db.exec("BEGIN");
    try {
      await db.prepare("DELETE FROM PunchRecord WHERE userId = ?").run(userId);
      await db.prepare("DELETE FROM Shift WHERE userId = ?").run(userId);
      await db.prepare("DELETE FROM UserTeam WHERE userId = ?").run(userId);
      try {
        await db.prepare("DELETE FROM TeamManager WHERE userId = ?").run(userId);
      } catch (e) {
        // Ignora se tabela TeamManager não existir
      }
      await db.prepare("DELETE FROM User WHERE id = ?").run(userId);
      await db.exec("COMMIT");
      return { success: true, action: "deleteUser" };
    } catch (e: any) {
      await db.exec("ROLLBACK");
      return { error: "Erro ao excluir: " + e.message, action: "deleteUser" };
    }
  }

  if (actionType === "changePassword") {
    const userId = formData.get("userId") as string;
    const newPassword = formData.get("newPassword") as string;
    if (!newPassword || newPassword.length < 4) return { error: "A senha deve ter pelo menos 4 caracteres.", action: "changePassword" };
    
    const userExists = await db.prepare("SELECT id FROM User WHERE id = ?").get(userId);
    if (!userExists) return { error: "Usuário não encontrado.", action: "changePassword" };

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.prepare("UPDATE User SET password = ? WHERE id = ?").run(hashedPassword, userId);
    return { success: true, message: "Senha alterada com sucesso!", action: "changePassword" };
  }

  return null;
}
