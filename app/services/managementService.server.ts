import { prisma } from "./prisma.server";
import bcrypt from "bcryptjs";
import type { User, Team } from "../types";

export async function getManagementData(user: User): Promise<{ teams: Team[]; users: User[] }> {
  if (user.role !== "admin") {
    throw new Response("Acesso negado", { status: 403 });
  }

  const teamsData = await prisma.team.findMany({
    orderBy: { name: "asc" }
  });
  
  const teams: Team[] = teamsData.map(t => ({
    id: t.id,
    name: t.name
  }));

  const usersData = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      goal: true,
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

  const users: User[] = usersData.map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role as any,
    goal: u.goal || undefined,
    avatarUrl: u.avatarUrl || undefined,
    teamId: u.teamId || undefined,
    teamName: u.team?.name || undefined,
    userTeams: u.userTeams.map(ut => ({
      teamId: ut.teamId,
      role: ut.role as any,
      teamName: ut.team.name
    }))
  }));

  return { teams, users };
}

// ============================================================================
// Action Dispatcher (Strategy Pattern) para evitar o Anti-Pattern "Large Switch"
// ============================================================================

type ActionHandler = (formData: FormData) => Promise<{ success?: boolean; error?: string; message?: string; action?: string }>;

const actionHandlers: Record<string, ActionHandler> = {
  createTeam: async (formData) => {
    const name = formData.get("name") as string;
    const existing = await prisma.team.findFirst({ where: { name } });
    if (existing) return { error: "Já existe uma equipe com este nome." };
    
    await prisma.team.create({
      data: { id: crypto.randomUUID(), name }
    });
    return { success: true };
  },

  deleteTeam: async (formData) => {
    const teamId = formData.get("teamId") as string;
    await prisma.$transaction([
      prisma.userTeam.deleteMany({ where: { teamId } }),
      prisma.user.updateMany({ where: { teamId }, data: { teamId: null } }),
      prisma.team.delete({ where: { id: teamId } })
    ]);
    return { success: true };
  },

  addUserTeam: async (formData) => {
    const userId = formData.get("userId") as string;
    const teamId = formData.get("teamId") as string;
    const role = formData.get("role") as string;
    
    if (!userId || !teamId || !role) return { error: "Dados incompletos." };
    
    const validRole = role === "manager" ? "manager" : "employee";
    await prisma.userTeam.upsert({
      where: { userId_teamId: { userId, teamId } },
      update: { role: validRole },
      create: { userId, teamId, role: validRole }
    });
    return { success: true };
  },

  removeUserTeam: async (formData) => {
    const userId = formData.get("userId") as string;
    const teamId = formData.get("teamId") as string;
    
    await prisma.userTeam.deleteMany({
      where: { userId, teamId }
    });
    return { success: true };
  },

  removePrimaryTeam: async (formData) => {
    const userId = formData.get("userId") as string;
    await prisma.user.update({
      where: { id: userId },
      data: { teamId: null }
    });
    return { success: true };
  },

  updateUserTeamRole: async (formData) => {
    const userId = formData.get("userId") as string;
    const teamId = formData.get("teamId") as string;
    const role = formData.get("role") as string;
    
    const validRole = role === "manager" ? "manager" : "employee";
    await prisma.userTeam.updateMany({
      where: { userId, teamId },
      data: { role: validRole }
    });
    return { success: true };
  },

  deleteUser: async (formData) => {
    const userId = formData.get("userId") as string;
    try {
      await prisma.$transaction([
        prisma.punchRecord.deleteMany({ where: { userId } }),
        prisma.shift.deleteMany({ where: { userId } }),
        prisma.userTeam.deleteMany({ where: { userId } }),
        prisma.user.delete({ where: { id: userId } })
      ]);
      return { success: true, action: "deleteUser" };
    } catch (e: any) {
      return { error: "Erro ao excluir: " + e.message, action: "deleteUser" };
    }
  },

  changePassword: async (formData) => {
    const userId = formData.get("userId") as string;
    const newPassword = formData.get("newPassword") as string;
    
    if (!newPassword || newPassword.length < 4) {
      return { error: "A senha deve ter pelo menos 4 caracteres.", action: "changePassword" };
    }
    
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) return { error: "Usuário não encontrado.", action: "changePassword" };

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });
    return { success: true, message: "Senha alterada com sucesso!", action: "changePassword" };
  }
};

export async function handleManagementAction(executorUser: User, formData: FormData) {
  if (executorUser.role !== "admin") return { error: "Acesso negado" };

  const actionType = formData.get("_action") as string;
  const handler = actionHandlers[actionType];

  if (handler) {
    return await handler(formData);
  }

  return null;
}
