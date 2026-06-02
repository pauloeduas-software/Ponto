import { prisma } from "./prisma.server";
import { minutesToHHMM } from "../utils/time";
import type { SavedDay, User, Team, UserTeamMembership } from "../types";

export async function getAdminData(user: User, selectedManagerTeamId: string | null) {
  const isAdmin = user.role === "admin";
  const managerTeams = (user.userTeams || []).filter((ut: UserTeamMembership) => ut.role === "manager");
  const isManager = managerTeams.length > 0;

  verifyAccess(isAdmin, isManager);

  const activeTeamId = resolveActiveTeamId(user, managerTeams, selectedManagerTeamId);

  const { employeesData, records, teamName } = await fetchDashboardData(isAdmin, selectedManagerTeamId, activeTeamId);

  const employees = mapEmployeesToDTO(employeesData);
  const historyData = buildHistoryData(records);
  const teams = await fetchAllTeams();

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

// ============================================================================
// Funções Privadas (Extratos de Lógica - SRP)
// ============================================================================

function verifyAccess(isAdmin: boolean, isManager: boolean) {
  if (!isAdmin && !isManager) {
    throw new Response("Acesso negado", { status: 403 });
  }
}

function resolveActiveTeamId(user: User, managerTeams: UserTeamMembership[], selectedManagerTeamId: string | null) {
  return (
    selectedManagerTeamId ||
    managerTeams[0]?.teamId ||
    user.teamId ||
    (user.userTeams || [])[0]?.teamId ||
    null
  );
}

async function fetchDashboardData(isAdmin: boolean, selectedManagerTeamId: string | null, activeTeamId: string | null) {
  if (isAdmin && !selectedManagerTeamId) {
    const employeesData = await prisma.user.findMany({ select: buildUserSelect() });
    const records = await prisma.punchRecord.findMany();
    return { employeesData, records, teamName: "Geral" };
  } 
  
  if (activeTeamId) {
    const employeesData = await prisma.user.findMany({
      where: buildTeamFilter(activeTeamId),
      select: buildUserSelect()
    });
    
    const records = await prisma.punchRecord.findMany({
      where: { user: buildTeamFilter(activeTeamId) }
    });
    
    const team = await prisma.team.findUnique({
      where: { id: activeTeamId },
      select: { name: true }
    });
    
    return { employeesData, records, teamName: team?.name || "Equipe" };
  } 
  
  return { employeesData: [], records: [], teamName: "Sem Equipe" };
}

function buildUserSelect() {
  return {
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
  };
}

function buildTeamFilter(teamId: string) {
  return {
    OR: [
      { teamId: teamId },
      { userTeams: { some: { teamId: teamId } } }
    ]
  };
}

function mapEmployeesToDTO(employeesData: any[]): (User & { teamName?: string | null })[] {
  return employeesData.map(emp => ({
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
}

function buildHistoryData(records: any[]): Record<string, SavedDay[]> {
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
  
  return historyData;
}

async function fetchAllTeams(): Promise<Team[]> {
  const teamsData = await prisma.team.findMany({
    orderBy: { name: "asc" }
  });
  return teamsData.map(t => ({
    id: t.id,
    name: t.name
  }));
}
