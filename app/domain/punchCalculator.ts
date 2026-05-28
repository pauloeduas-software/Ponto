import { timeToMinutes, minutesToHHMM } from "../utils/time";

export interface PunchCalculationResult {
  workMins: number;
  diffMins: number;
  totalWorkedStr: string;
  diffStr: string;
  isOvertime: boolean;
  firstEntryMins: number;
  breakMins: number;
}


// Calcula todas as métricas diárias com base nas batidas de ponto (punches) e na meta do dia (dailyGoal).
export function calculatePunchMetrics(punches: string[], dailyGoal: string): PunchCalculationResult {
  const goalMins = timeToMinutes(dailyGoal);
  
  // 1. Calcula o total trabalhado
  let workMins = 0;
  let lastEntryMins = -1;
  for (let i = 0; i < punches.length; i += 2) {
    const entry = punches[i];
    const exit = punches[i + 1];
    if (entry && exit) {
      const start = timeToMinutes(entry);
      const end = timeToMinutes(exit);
      if (start >= lastEntryMins && end >= start) {
        workMins += (end - start);
        lastEntryMins = start;
      }
    }
  }

  // 2. Determina se o último par de batidas está completo
  const lastFilledIdx = [...punches].reverse().findIndex(p => p.trim() !== "");
  const actualLastIdx = lastFilledIdx === -1 ? -1 : punches.length - 1 - lastFilledIdx;
  const isComplete = actualLastIdx !== -1 && (actualLastIdx + 1) % 2 === 0;

  // 3. Calcula a diferença (saldo) em relação à meta do dia se o par de batidas estiver completo
  const diffMins = isComplete ? (workMins - goalMins) : 0;

  // 4. Calcula o horário da primeira entrada
  const firstEntryMins = (punches.length > 0 && punches[0]?.length === 5) ? timeToMinutes(punches[0]) : -1;

  // 5. Calcula o tempo total de almoço/pausas
  let breakMins = 0;
  for (let i = 1; i < punches.length - 1; i += 2) {
    const exit = punches[i];
    const entry = punches[i + 1];
    if (exit && entry) {
      const exitMins = timeToMinutes(exit);
      const entryMins = timeToMinutes(entry);
      if (entryMins >= exitMins) {
        breakMins += (entryMins - exitMins);
      }
    }
  }

  return {
    workMins,
    diffMins,
    totalWorkedStr: minutesToHHMM(workMins),
    diffStr: minutesToHHMM(Math.abs(diffMins)),
    isOvertime: diffMins >= 0,
    firstEntryMins,
    breakMins,
  };
}
