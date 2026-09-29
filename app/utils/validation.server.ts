import { calculatePunchMetrics } from "../domain/punchCalculator";
import { timeToMinutes } from "./time";

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
// Aceita o que o input de hora gera (inclusive valores parciais enquanto digita): "", "8", "08:", "08:30"
const TIME_RE = /^[0-9:]{0,5}$/;
const MAX_PUNCHES = 20;
const MAX_OBSERVATION = 500;

export type PunchPayload = {
  date: string;
  punches: string;
  goal: string;
  goalMins: number;
  workMins: number;
  diffMins: number;
  isOvertime: boolean;
};

export function isValidDate(date: unknown): date is string {
  return typeof date === "string" && DATE_RE.test(date);
}

export function sanitizeObservation(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, MAX_OBSERVATION);
  return trimmed || undefined;
}

// Valida os dados de batida vindos do cliente e recalcula as métricas no servidor.
// workMins/diffMins/isOvertime enviados pelo navegador são ignorados para que
// ninguém consiga forjar horas trabalhadas editando a requisição.
export function parsePunchPayload(formData: FormData): PunchPayload | null {
  const date = formData.get("date");
  const rawGoal = formData.get("goal");
  const rawPunches = formData.get("punches");

  if (!isValidDate(date)) return null;
  if (typeof rawGoal !== "string" || !TIME_RE.test(rawGoal)) return null;
  const goal = rawGoal || "08:00";
  if (typeof rawPunches !== "string") return null;

  let punches: unknown;
  try {
    punches = JSON.parse(rawPunches);
  } catch {
    return null;
  }

  if (
    !Array.isArray(punches) ||
    punches.length > MAX_PUNCHES ||
    !punches.every(p => typeof p === "string" && TIME_RE.test(p))
  ) {
    return null;
  }

  const metrics = calculatePunchMetrics(punches as string[], goal);

  return {
    date,
    punches: JSON.stringify(punches),
    goal,
    goalMins: timeToMinutes(goal),
    workMins: metrics.workMins,
    diffMins: metrics.diffMins,
    isOvertime: metrics.isOvertime,
  };
}
