import { db } from "./db.server";
import type { Shift, User, Team, UserTeamMembership } from "../types";

export async function getEscalaData(user: User, selectedTeamParam: string | null) {
  const isAdmin = user.role === "admin";
  const userTeams = (user.userTeams || []) as UserTeamMembership[];
  const managerTeams = userTeams.filter((ut: UserTeamMembership) => ut.role === "manager");

  let employeesQuery = "SELECT id, name, role, avatarUrl, teamId FROM User";
  let shiftsQuery = "SELECT * FROM Shift";
  let params: string[] = [];
  let teamName = "Geral";

  const activeTeamId = selectedTeamParam || userTeams[0]?.teamId || user.teamId || null;
  const activeTeamRole = userTeams.find((ut: UserTeamMembership) => ut.teamId === activeTeamId)?.role || null;
  const canEditActiveTeam = isAdmin || activeTeamRole === "manager";

  if (!isAdmin && activeTeamId) {
    employeesQuery = `
      SELECT DISTINCT u.id, u.name, u.role, u.avatarUrl, u.teamId
      FROM User u
      LEFT JOIN UserTeam ut ON u.id = ut.userId
      WHERE ut.teamId = ? OR u.teamId = ?
    `;
    shiftsQuery = `
      SELECT DISTINCT s.* FROM Shift s
      JOIN User u ON s.userId = u.id
      LEFT JOIN UserTeam ut ON s.userId = ut.userId
      WHERE ut.teamId = ? OR u.teamId = ?
    `;
    params = [activeTeamId, activeTeamId];
    const team = await db.prepare("SELECT name FROM Team WHERE id = ?").get(activeTeamId) as { name: string } | undefined;
    teamName = team?.name || "Equipe";
  } else if (!isAdmin) {
    employeesQuery += " WHERE id = ?";
    shiftsQuery = "SELECT * FROM Shift WHERE userId = ?";
    params = [user.id];
  }

  const employees = await db.prepare(employeesQuery).all(...params) as User[];

  const allUserTeams = await db.prepare(`
    SELECT ut.userId, ut.teamId, ut.role, t.name as teamName
    FROM UserTeam ut
    JOIN Team t ON ut.teamId = t.id
  `).all() as { userId: string; teamId: string; role: "manager" | "employee"; teamName: string }[];

  const userTeamsMap: Record<string, UserTeamMembership[]> = {};
  for (const link of allUserTeams) {
    if (!userTeamsMap[link.userId]) userTeamsMap[link.userId] = [];
    userTeamsMap[link.userId].push({
      teamId: link.teamId,
      teamName: link.teamName,
      role: link.role,
    });
  }
  employees.forEach(emp => {
    emp.userTeams = userTeamsMap[emp.id] || [];
  });

  const shifts = await db.prepare(shiftsQuery).all(...params) as Shift[];
  const teams = await db.prepare("SELECT * FROM Team ORDER BY name").all() as Team[];

  return {
    user, employees, initialShifts: shifts, teamName, teams,
    userTeams, managerTeams, isAdmin, activeTeamId, canEditActiveTeam,
  };
}

export async function saveShifts(
  executorUser: any,
  targetUserId: string,
  shifts: Shift[]
): Promise<{ success?: boolean; error?: string }> {
  const isAdmin = executorUser?.role === "admin";
  let canEdit = isAdmin;

  if (!isAdmin && targetUserId) {
    const sharedManagerTeam = await db.prepare(`
      SELECT ut1.teamId FROM UserTeam ut1
      JOIN UserTeam ut2 ON ut1.teamId = ut2.teamId
      WHERE ut1.userId = ? AND ut1.role = 'manager'
      AND ut2.userId = ?
      LIMIT 1
    `).get(executorUser.id, targetUserId);
    canEdit = !!sharedManagerTeam;
  }

  if (!canEdit) return { error: "Acesso negado." };

  await db.prepare("DELETE FROM Shift WHERE userId = ?").run(targetUserId);
  
  const insertQuery = "INSERT INTO Shift (id, userId, date, startTime, endTime, type) VALUES (?, ?, ?, ?, ?, ?)";
  for (const s of shifts) {
    await db.prepare(insertQuery).run(crypto.randomUUID(), s.userId, s.date, s.startTime, s.endTime, s.type);
  }
  return { success: true };
}
