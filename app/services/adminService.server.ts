import { db } from "./db.server";
import { minutesToHHMM } from "../utils/time";
import type { SavedDay, User, Team, UserTeamMembership, PunchRecordDbRow } from "../types";

export async function getAdminData(user: User, selectedManagerTeamId: string | null) {
  const isAdmin = user.role === "admin";
  const managerTeams = (user.userTeams || []).filter((ut: UserTeamMembership) => ut.role === "manager");
  const isManager = managerTeams.length > 0;

  if (!isAdmin && !isManager) {
    throw new Response("Acesso negado", { status: 403 });
  }

  let employeesQuery = `
    SELECT u.id, u.username, u.name, u.role, u.avatarUrl, u.teamId, t.name as teamName 
    FROM User u 
    LEFT JOIN Team t ON u.teamId = t.id
  `;
  let recordsQuery = "SELECT * FROM PunchRecord";
  let params: string[] = [];
  let teamName = "Geral";

  const activeTeamId =
    selectedManagerTeamId ||
    managerTeams[0]?.teamId ||
    user.teamId ||
    (user.userTeams || [])[0]?.teamId ||
    null;

  if (!isAdmin && activeTeamId) {
    employeesQuery = `
      SELECT DISTINCT u.id, u.username, u.name, u.role, u.avatarUrl, u.teamId, t.name as teamName
      FROM User u
      LEFT JOIN UserTeam ut ON u.id = ut.userId
      LEFT JOIN Team t ON ut.teamId = t.id OR u.teamId = t.id
      WHERE ut.teamId = ? OR u.teamId = ?
    `;
    recordsQuery = `
      SELECT DISTINCT r.* FROM PunchRecord r
      JOIN User u ON r.userId = u.id
      LEFT JOIN UserTeam ut ON r.userId = ut.userId
      WHERE ut.teamId = ? OR u.teamId = ?
    `;
    params = [activeTeamId, activeTeamId];
    const team = await db.prepare("SELECT name FROM Team WHERE id = ?").get(activeTeamId) as { name: string } | undefined;
    teamName = team?.name || "Equipe";
  } else if (!isAdmin) {
    employeesQuery += " WHERE 1=0";
    recordsQuery += " WHERE 1=0";
    teamName = "Sem Equipe";
  }

  const employees = await db.prepare(employeesQuery).all(...params) as (User & { teamName?: string | null })[];

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

  const allRecords = await db.prepare(recordsQuery).all(...params) as PunchRecordDbRow[];

  const historyData: Record<string, SavedDay[]> = {};
  allRecords.forEach(r => {
    if (!historyData[r.userId]) historyData[r.userId] = [];
    historyData[r.userId].push({
      date: r.date,
      punches: JSON.parse(r.punches),
      workMins: r.workMins,
      diffMins: r.diffMins,
      isOvertime: r.isOvertime === 1,
      goalMins: r.goalMins || 480,
      goal: minutesToHHMM(r.goalMins || 480),
      worked: minutesToHHMM(r.workMins),
      diff: minutesToHHMM(Math.abs(r.diffMins)),
    });
  });

  const teams = await db.prepare("SELECT * FROM Team ORDER BY name").all() as Team[];
  const activeManagerTeamId = isManager
    ? selectedManagerTeamId || managerTeams[0]?.teamId || null
    : null;

  return {
    user,
    employees,
    historyData,
    teamName,
    teams,
    managerTeams,
    isManager,
    isAdmin,
    activeManagerTeamId,
  };
}
