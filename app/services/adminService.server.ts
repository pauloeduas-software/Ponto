import { prisma } from "./prisma.server";
import { minutesToHHMM } from "../utils/time";
import type { SavedDay, User, Team, UserTeamMembership } from "../types";

export async function getAdminData(user: User, selectedManagerTeamId: string | null) {
  const isAdmin = user.role === "admin";
  const managerTeams = (user.userTeams || []).filter((ut: UserTeamMembership) => ut.role === "manager");
  const isManager = managerTeams.length > 0;

  if (!isAdmin && !isManager) {
    throw new Response("Acesso negado", { status: 403 });
  }

  const activeTeamId =
    selectedManagerTeamId ||
    managerTeams[0]?.teamId ||
    user.teamId ||
    (user.userTeams || [])[0]?.teamId ||
    null;

  let employeesData: any[] = [];
  let records: any[] = [];
  let teamName = "Geral";

  if (isAdmin && !selectedManagerTeamId) {
    employeesData = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        avatarUrl: true,
        teamId: true,
        team: { select: { name: true } },
        userTeams: {
          select: {
            teamId: true,
            role: true,
            team: { select: { name: true } }
          }
        }
      }
    });
    records = await prisma.punchRecord.findMany();
  } else if (activeTeamId) {
    employeesData = await prisma.user.findMany({
      where: {
        OR: [
          { teamId: activeTeamId },
          { userTeams: { some: { teamId: activeTeamId } } }
        ]
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        avatarUrl: true,
        teamId: true,
        team: { select: { name: true } },
        userTeams: {
          select: {
            teamId: true,
            role: true,
            team: { select: { name: true } }
          }
        }
      }
    });
    records = await prisma.punchRecord.findMany({
      where: {
        user: {
          OR: [
            { teamId: activeTeamId },
            { userTeams: { some: { teamId: activeTeamId } } }
          ]
        }
      }
    });
    const team = await prisma.team.findUnique({
      where: { id: activeTeamId },
      select: { name: true }
    });
    teamName = team?.name || "Equipe";
  } else {
    employeesData = [];
    records = [];
    teamName = "Sem Equipe";
  }

  const employees: (User & { teamName?: string | null })[] = employeesData.map(emp => ({
    id: emp.id,
    username: emp.username,
    name: emp.name,
    role: emp.role as any,
    avatarUrl: emp.avatarUrl || undefined,
    teamId: emp.teamId || undefined,
    teamName: emp.team?.name || undefined,
    userTeams: emp.userTeams.map((ut: any) => ({
      teamId: ut.teamId,
      role: ut.role as any,
      teamName: ut.team.name
    }))
  }));

  const historyData: Record<string, SavedDay[]> = {};
  records.forEach(r => {
    if (!r.userId) return;
    if (!historyData[r.userId]) historyData[r.userId] = [];
    historyData[r.userId].push({
      date: r.date,
      punches: JSON.parse(r.punches),
      workMins: r.workMins,
      diffMins: r.diffMins,
      isOvertime: r.isOvertime,
      goalMins: r.goalMins || 480,
      goal: minutesToHHMM(r.goalMins || 480),
      worked: minutesToHHMM(r.workMins),
      diff: minutesToHHMM(Math.abs(r.diffMins)),
      observation: r.observation || undefined,
    });
  });

  const teamsData = await prisma.team.findMany({
    orderBy: { name: "asc" }
  });
  const teams: Team[] = teamsData.map(t => ({
    id: t.id,
    name: t.name
  }));

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
