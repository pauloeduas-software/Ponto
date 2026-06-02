import { prisma } from "./prisma.server";
import { minutesToHHMM, timeToMinutes } from "../utils/time";
import type { SavedDay } from "../types";

export async function getDashboardHistory(userId: string): Promise<SavedDay[]> {
  const records = await prisma.punchRecord.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  return records.map(r => ({
    date: r.date,
    punches: JSON.parse(r.punches),
    workMins: r.workMins,
    diffMins: r.diffMins,
    goalMins: r.goalMins || 480,
    goal: minutesToHHMM(r.goalMins || 480),
    isOvertime: r.isOvertime,
    worked: minutesToHHMM(r.workMins),
    diff: minutesToHHMM(Math.abs(r.diffMins)),
    observation: r.observation || undefined,
  }));
}

export async function savePunchRecord(
  userId: string,
  date: string,
  punches: string,
  workMins: number,
  diffMins: number,
  isOvertime: number,
  goal: string,
  observation?: string
): Promise<void> {
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
        isOvertime: isOvertime === 1,
        goalMins,
        observation: observation || null
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
        isOvertime: isOvertime === 1,
        goalMins,
        observation: observation || null
      }
    });
  }
}

export async function deletePunchRecord(userId: string, date: string): Promise<void> {
  await prisma.punchRecord.deleteMany({
    where: { userId, date }
  });
}
