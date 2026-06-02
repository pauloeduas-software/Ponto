import { prisma } from "./prisma.server";
import { requireUserId } from "./session.server";
import { minutesToHHMM, timeToMinutes } from "../utils/time";

export async function getHomeData(request: Request) {
  const userId = await requireUserId(request);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const dateStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const record = await prisma.punchRecord.findFirst({
    where: { userId, date: dateStr }
  });

  return {
    user,
    initialPunches: record ? JSON.parse(record.punches) : [],
    initialGoal: record?.goalMins ? minutesToHHMM(record.goalMins) : user?.goal || "08:00",
    dateStr,
  };
}

export async function saveHomePunchRecord(request: Request, formData: FormData) {
  const userId = await requireUserId(request);

  const date = formData.get("date") as string;
  const punches = formData.get("punches") as string;
  const workMins = parseInt(formData.get("workMins") as string);
  const diffMins = parseInt(formData.get("diffMins") as string);
  const isOvertime = formData.get("isOvertime") === "true";
  const goal = formData.get("goal") as string;

  const goalMins = timeToMinutes(goal);
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
}
