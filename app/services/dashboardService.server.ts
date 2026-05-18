import { db } from "../db.server";
import { minutesToHHMM, timeToMinutes } from "../utils/time";
import { type SavedDay } from "../types";

export function getDashboardHistory(userId: string): SavedDay[] {
  const records = db
    .prepare("SELECT * FROM PunchRecord WHERE userId = ? ORDER BY date DESC")
    .all(userId) as any[];

  return records.map(r => ({
    date: r.date,
    punches: JSON.parse(r.punches),
    workMins: r.workMins,
    diffMins: r.diffMins,
    goalMins: r.goalMins || 480,
    goal: minutesToHHMM(r.goalMins || 480),
    isOvertime: r.isOvertime === 1,
    worked: minutesToHHMM(r.workMins),
    diff: minutesToHHMM(Math.abs(r.diffMins)),
  }));
}

export function savePunchRecord(
  userId: string,
  date: string,
  punches: string,
  workMins: number,
  diffMins: number,
  isOvertime: number,
  goal: string
) {
  const goalMins = timeToMinutes(goal);
  const existing = db
    .prepare("SELECT id FROM PunchRecord WHERE userId = ? AND date = ?")
    .get(userId, date);

  if (existing) {
    db.prepare(
      "UPDATE PunchRecord SET punches = ?, workMins = ?, diffMins = ?, isOvertime = ?, goalMins = ? WHERE userId = ? AND date = ?"
    ).run(punches, workMins, diffMins, isOvertime, goalMins, userId, date);
  } else {
    db.prepare(
      "INSERT INTO PunchRecord (id, userId, date, punches, workMins, diffMins, isOvertime, goalMins) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(crypto.randomUUID(), userId, date, punches, workMins, diffMins, isOvertime, goalMins);
  }
}

export function deletePunchRecord(userId: string, date: string) {
  db.prepare("DELETE FROM PunchRecord WHERE userId = ? AND date = ?").run(userId, date);
}
