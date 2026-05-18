import { db } from "../db.server";
import { requireUserId } from "../session.server";
import { minutesToHHMM, timeToMinutes } from "../utils/time";

export async function getHomeData(request: Request) {
  const userId = await requireUserId(request);
  const user = db.prepare("SELECT * FROM User WHERE id = ?").get(userId) as any;
  const dateStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const record = db.prepare("SELECT * FROM PunchRecord WHERE userId = ? AND date = ?").get(userId, dateStr) as any;

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
  const isOvertime = formData.get("isOvertime") === "true" ? 1 : 0;
  const goal = formData.get("goal") as string;

  const goalMins = timeToMinutes(goal);
  const existing = db.prepare("SELECT id FROM PunchRecord WHERE userId = ? AND date = ?").get(userId, date);

  if (existing) {
    db.prepare(
      "UPDATE PunchRecord SET punches = ?, workMins = ?, diffMins = ?, isOvertime = ?, goalMins = ? WHERE userId = ? AND date = ?"
    ).run(punches, workMins, diffMins, isOvertime, goalMins, userId, date);
  } else {
    db.prepare(
      "INSERT INTO PunchRecord (id, userId, date, punches, workMins, diffMins, isOvertime, goalMins) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(crypto.randomUUID(), userId, date, punches, workMins, diffMins, isOvertime, goalMins);
  }

  // Atualiza a meta padrão do usuário para que os próximos dias herdem esse valor
  db.prepare("UPDATE User SET goal = ? WHERE id = ?").run(goal, userId);
}
