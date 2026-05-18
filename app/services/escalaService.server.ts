import { db } from "../db.server";
import { type Shift } from "../types";

export function getEscalaData(user: any, selectedTeamParam: string | null) {
  const isAdmin = user.role === "admin";
  const userTeams = (user.userTeams || []) as any[];
  const managerTeams = userTeams.filter((ut: any) => ut.role === "manager");

  let employeesQuery = "SELECT id, name, role, avatarUrl, teamId FROM User";
  let shiftsQuery = "SELECT * FROM Shift";
  let params: any[] = [];
  let teamName = "Geral";

  const activeTeamId = selectedTeamParam || userTeams[0]?.teamId || user.teamId || null;
  const activeTeamRole = userTeams.find((ut: any) => ut.teamId === activeTeamId)?.role || null;
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
    const team = db.prepare("SELECT name FROM Team WHERE id = ?").get(activeTeamId) as any;
    teamName = team?.name || "Equipe";
  } else if (!isAdmin) {
    employeesQuery += " WHERE id = ?";
    shiftsQuery = "SELECT * FROM Shift WHERE userId = ?";
    params = [user.id];
  }

  const employees = db.prepare(employeesQuery).all(...params) as any[];

  const allUserTeams = db.prepare(`
    SELECT ut.userId, ut.teamId, ut.role, t.name as teamName
    FROM UserTeam ut
    JOIN Team t ON ut.teamId = t.id
  `).all() as any[];

  const userTeamsMap: Record<string, any[]> = {};
  for (const link of allUserTeams) {
    if (!userTeamsMap[link.userId]) userTeamsMap[link.userId] = [];
    userTeamsMap[link.userId].push(link);
  }
  employees.forEach(emp => { emp.userTeams = userTeamsMap[emp.id] || []; });

  const shifts = db.prepare(shiftsQuery).all(...params) as any[];
  const teams = db.prepare("SELECT * FROM Team ORDER BY name").all() as any[];

  return {
    user, employees, initialShifts: shifts, teamName, teams,
    userTeams, managerTeams, isAdmin, activeTeamId, canEditActiveTeam,
  };
}

export function saveShifts(
  executorUser: any,
  targetUserId: string,
  shifts: Shift[]
): { success?: boolean; error?: string } {
  const isAdmin = executorUser?.role === "admin";
  let canEdit = isAdmin;

  if (!isAdmin && targetUserId) {
    const sharedManagerTeam = db.prepare(`
      SELECT ut1.teamId FROM UserTeam ut1
      JOIN UserTeam ut2 ON ut1.teamId = ut2.teamId
      WHERE ut1.userId = ? AND ut1.role = 'manager'
      AND ut2.userId = ?
      LIMIT 1
    `).get(executorUser.id, targetUserId);
    canEdit = !!sharedManagerTeam;
  }

  if (!canEdit) return { error: "Acesso negado." };

  db.prepare("DELETE FROM Shift WHERE userId = ?").run(targetUserId);
  const insert = db.prepare(
    "INSERT INTO Shift (id, userId, date, startTime, endTime, type) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const s of shifts) {
    insert.run(crypto.randomUUID(), s.userId, s.date, s.startTime, s.endTime, s.type);
  }
  return { success: true };
}
