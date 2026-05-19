import { db } from "./db.server";
import bcrypt from "bcryptjs";
import type { User } from "../types";

export async function getManagementData(user: User) {
  if (user.role !== "admin") {
    throw new Response("Acesso negado", { status: 403 });
  }

  const teams = db.prepare("SELECT * FROM Team ORDER BY name").all() as any[];
  const users = db.prepare(`
    SELECT u.*, t.name as teamName 
    FROM User u 
    LEFT JOIN Team t ON u.teamId = t.id 
    ORDER BY u.name
  `).all() as any[];

  const userTeamLinks = db.prepare(`
    SELECT ut.userId, ut.teamId, ut.role, t.name as teamName
    FROM UserTeam ut
    JOIN Team t ON ut.teamId = t.id
    ORDER BY t.name
  `).all() as any[];

  const userTeamsMap: Record<string, any[]> = {};
  for (const link of userTeamLinks) {
    if (!userTeamsMap[link.userId]) userTeamsMap[link.userId] = [];
    userTeamsMap[link.userId].push(link);
  }

  const usersWithTeams = users.map(u => ({
    ...u,
    userTeams: userTeamsMap[u.id] || []
  }));

  return { teams, users: usersWithTeams };
}

export async function handleManagementAction(executorUser: User, formData: FormData) {
  if (executorUser.role !== "admin") return { error: "Acesso negado" };

  const actionType = formData.get("_action");

  if (actionType === "createTeam") {
    const name = formData.get("name") as string;
    const existing = db.prepare("SELECT id FROM Team WHERE name = ?").get(name);
    if (existing) return { error: "Já existe uma equipe com este nome." };
    db.prepare("INSERT INTO Team (id, name) VALUES (?, ?)").run(crypto.randomUUID(), name);
    return { success: true };
  }

  if (actionType === "deleteTeam") {
    const teamId = formData.get("teamId") as string;
    db.prepare("DELETE FROM UserTeam WHERE teamId = ?").run(teamId);
    db.prepare("UPDATE User SET teamId = NULL WHERE teamId = ?").run(teamId);
    db.prepare("DELETE FROM Team WHERE id = ?").run(teamId);
    return { success: true };
  }

  if (actionType === "addUserTeam") {
    const userId = formData.get("userId") as string;
    const teamId = formData.get("teamId") as string;
    const role = formData.get("role") as string;
    if (!userId || !teamId || !role) return { error: "Dados incompletos." };
    const validRole = role === "manager" ? "manager" : "employee";
    db.prepare("INSERT OR REPLACE INTO UserTeam (userId, teamId, role) VALUES (?, ?, ?)").run(userId, teamId, validRole);
    return { success: true };
  }

  if (actionType === "removeUserTeam") {
    const userId = formData.get("userId") as string;
    const teamId = formData.get("teamId") as string;
    db.prepare("DELETE FROM UserTeam WHERE userId = ? AND teamId = ?").run(userId, teamId);
    return { success: true };
  }

  if (actionType === "removePrimaryTeam") {
    const userId = formData.get("userId") as string;
    db.prepare("UPDATE User SET teamId = NULL WHERE id = ?").run(userId);
    return { success: true };
  }

  if (actionType === "updateUserTeamRole") {
    const userId = formData.get("userId") as string;
    const teamId = formData.get("teamId") as string;
    const role = formData.get("role") as string;
    const validRole = role === "manager" ? "manager" : "employee";
    db.prepare("UPDATE UserTeam SET role = ? WHERE userId = ? AND teamId = ?").run(validRole, userId, teamId);
    return { success: true };
  }

  if (actionType === "deleteUser") {
    const userId = formData.get("userId") as string;
    const deleteTx = db.transaction((id: string) => {
      db.prepare("DELETE FROM PunchRecord WHERE userId = ?").run(id);
      db.prepare("DELETE FROM Shift WHERE userId = ?").run(id);
      db.prepare("DELETE FROM UserTeam WHERE userId = ?").run(id);
      try { db.prepare("DELETE FROM TeamManager WHERE userId = ?").run(id); } catch (e) {}
      db.prepare("DELETE FROM User WHERE id = ?").run(id);
    });
    try {
      deleteTx(userId);
      return { success: true };
    } catch (e: any) {
      return { error: "Erro ao excluir: " + e.message };
    }
  }

  if (actionType === "changePassword") {
    const userId = formData.get("userId") as string;
    const newPassword = formData.get("newPassword") as string;
    if (!newPassword || newPassword.length < 4) return { error: "Senha muito curta." };
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare("UPDATE User SET password = ? WHERE id = ?").run(hashedPassword, userId);
    return { success: true };
  }

  return null;
}
