import { prisma } from "./prisma.server";
import { requireUserId } from "./session.server";
import { minutesToHHMM } from "../utils/time";
import { parsePunchPayload } from "../utils/validation.server";
import { getCachedOrFetch, invalidateCache } from "../utils/cache.server";

export async function getHomeData(request: Request) {
  const userId = await requireUserId(request);
  const dateStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const cacheKey = `home_data_${userId}_${dateStr}`;

  return getCachedOrFetch(cacheKey, async () => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, name: true, role: true, goal: true, avatarUrl: true, teamId: true }
    });
    const record = await prisma.punchRecord.findFirst({
      where: { userId, date: dateStr }
    });

    return {
      user,
      initialPunches: record ? JSON.parse(record.punches) : [],
      initialGoal: record?.goalMins ? minutesToHHMM(record.goalMins) : user?.goal || "08:00",
      dateStr,
    };
  });
}

export async function saveHomePunchRecord(request: Request, formData: FormData) {
  const userId = await requireUserId(request);

  const payload = parsePunchPayload(formData);
  if (!payload) return { error: "Dados inválidos." };
  const { date, punches, workMins, diffMins, isOvertime, goal, goalMins } = payload;

  const existing = await prisma.punchRecord.findFirst({
    where: { userId, date }
  });

  if (existing) {
    await prisma.punchRecord.update({
      where: { id: existing.id },
      data: {
        punches,
        workMins,
        diffMins,
        isOvertime,
        goalMins
      }
    });
  } else {
    await prisma.punchRecord.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        date,
        punches,
        workMins,
        diffMins,
        isOvertime,
        goalMins
      }
    });
  }

  // Atualiza a meta padrão do usuário para que os próximos dias herdem esse valor
  await prisma.user.update({
    where: { id: userId },
    data: { goal }
  });
  
  invalidateCache();
  return { success: true };
}
