import { prisma } from "./prisma.server";
import type { Shift, User, Team, UserTeamMembership } from "../types";
import { getCachedOrFetch, invalidateCache } from "../utils/cache.server";

export async function getEscalaData(user: User, selectedTeamParam: string | null) {
  const cacheKey = `escala_data_${user.id}_${selectedTeamParam || 'none'}`;

  return getCachedOrFetch(cacheKey, async () => {
    const isAdmin = user.role === "admin";
    const userTeams = (user.userTeams || []) as UserTeamMembership[];
    const managerTeams = userTeams.filter((ut: UserTeamMembership) => ut.role === "manager");

    const activeTeamId = selectedTeamParam || userTeams[0]?.teamId || user.teamId || null;
    const activeTeamRole = userTeams.find((ut: UserTeamMembership) => ut.teamId === activeTeamId)?.role || null;
    const canEditActiveTeam = isAdmin || activeTeamRole === "manager";

    let employeesData: any[] = [];
    let shiftsData: any[] = [];
    let teamName = "Geral";

  if (isAdmin && !selectedTeamParam) {
    employeesData = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        avatarUrl: true,
        teamId: true,
        userTeams: {
          select: {
            teamId: true,
            role: true,
            team: { select: { name: true } }
          }
        }
      }
    });
    shiftsData = await prisma.shift.findMany();
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
        userTeams: {
          select: {
            teamId: true,
            role: true,
            team: { select: { name: true } }
          }
        }
      }
    });
    shiftsData = await prisma.shift.findMany({
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
    employeesData = await prisma.user.findMany({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        avatarUrl: true,
        teamId: true,
        userTeams: {
          select: {
            teamId: true,
            role: true,
            team: { select: { name: true } }
          }
        }
      }
    });
    shiftsData = await prisma.shift.findMany({
      where: { userId: user.id }
    });
    teamName = "Sem Equipe";
  }

  const employees: User[] = employeesData.map(emp => ({
    id: emp.id,
    username: emp.username,
    name: emp.name,
    role: emp.role as any,
    avatarUrl: emp.avatarUrl || undefined,
    teamId: emp.teamId || undefined,
    userTeams: emp.userTeams.map((ut: any) => ({
      teamId: ut.teamId,
      role: ut.role as any,
      teamName: ut.team.name
    }))
  }));

  const shifts: Shift[] = shiftsData.map(s => ({
    id: s.id,
    userId: s.userId || "",
    date: s.date,
    startTime: s.startTime || "",
    endTime: s.endTime || "",
    type: s.type as any
  }));

  const teamsData = await prisma.team.findMany({
    orderBy: { name: "asc" }
  });
  const teams: Team[] = teamsData.map(t => ({
    id: t.id,
    name: t.name
  }));

    return {
      user, employees, initialShifts: shifts, teamName, teams,
      userTeams, managerTeams, isAdmin, activeTeamId, canEditActiveTeam,
    };
  });
}

export async function saveShifts(
  executorUser: any,
  targetUserId: string,
  shifts: Shift[]
): Promise<{ success?: boolean; error?: string }> {
  const isAdmin = executorUser?.role === "admin";
  let canEdit = isAdmin;

  if (!isAdmin && targetUserId) {
    const sharedManagerTeam = await prisma.userTeam.findFirst({
      where: {
        userId: executorUser.id,
        role: "manager",
        team: {
          userTeams: {
            some: {
              userId: targetUserId
            }
          }
        }
      }
    });
    canEdit = !!sharedManagerTeam;
  }

  if (!canEdit) return { error: "Acesso negado." };

  await prisma.$transaction([
    prisma.shift.deleteMany({
      where: { userId: targetUserId }
    }),
    prisma.shift.createMany({
      data: shifts.map(s => ({
        id: crypto.randomUUID(),
        userId: targetUserId,
        date: s.date,
        startTime: s.startTime || null,
        endTime: s.endTime || null,
        type: s.type
      }))
    })
  ]);

  invalidateCache();
  return { success: true };
}
