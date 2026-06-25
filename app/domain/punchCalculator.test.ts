import { describe, it, expect } from "vitest";
import { calculatePunchMetrics } from "./punchCalculator";

describe("calculatePunchMetrics", () => {
  it("deve calcular corretamente para um dia padrão de 8 horas", () => {
    const punches = ["08:00", "12:00", "13:00", "17:00"];
    const dailyGoal = "08:00";
    
    const result = calculatePunchMetrics(punches, dailyGoal);
    
    expect(result.workMins).toBe(480); // 4 + 4 horas
    expect(result.diffMins).toBe(0);
    expect(result.totalWorkedStr).toBe("08:00");
    expect(result.diffStr).toBe("00:00");
    expect(result.isOvertime).toBe(true);
    expect(result.firstEntryMins).toBe(480); // 08:00 são 480 minutos
    expect(result.breakMins).toBe(60); // 12:00 às 13:00 são 60 minutos
  });

  it("deve lidar com horas extras corretamente", () => {
    const punches = ["08:00", "12:00", "13:00", "18:00"];
    const dailyGoal = "08:00";
    
    const result = calculatePunchMetrics(punches, dailyGoal);
    
    expect(result.workMins).toBe(540); // 9 horas trabalhadas
    expect(result.diffMins).toBe(60); // +1 hora extra
    expect(result.totalWorkedStr).toBe("09:00");
    expect(result.diffStr).toBe("+01:00");
    expect(result.isOvertime).toBe(true);
    expect(result.breakMins).toBe(60);
  });

  it("deve lidar com saldo negativo corretamente", () => {
    const punches = ["08:00", "12:00", "13:00", "16:00"];
    const dailyGoal = "08:00";
    
    const result = calculatePunchMetrics(punches, dailyGoal);
    
    expect(result.workMins).toBe(420); // 7 horas trabalhadas
    expect(result.diffMins).toBe(-60); // -1 hora a menos
    expect(result.totalWorkedStr).toBe("07:00");
    expect(result.diffStr).toBe("-01:00");
    expect(result.isOvertime).toBe(false);
  });

  it("não deve calcular a diferença se o dia estiver incompleto", () => {
    const punches = ["08:00", "12:00", "13:00", ""];
    const dailyGoal = "08:00";
    
    const result = calculatePunchMetrics(punches, dailyGoal);
    
    expect(result.workMins).toBe(240); // apenas o primeiro par completo conta
    expect(result.diffMins).toBe(0); // dia incompleto não tem diferença
    expect(result.totalWorkedStr).toBe("04:00");
    expect(result.diffStr).toBe("00:00");
    expect(result.breakMins).toBe(60); // intervalo de almoço é da primeira saída até a segunda entrada
  });

  it("deve retornar métricas vazias quando não houver batidas", () => {
    const result = calculatePunchMetrics([], "08:00");
    expect(result.workMins).toBe(0);
    expect(result.diffMins).toBe(0);
    expect(result.firstEntryMins).toBe(-1);
    expect(result.breakMins).toBe(0);
  });
});
