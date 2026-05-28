import { describe, it, expect } from "vitest";
import { timeToMinutes, minutesToTime, minutesToHHMM, formatTimeInput } from "./time";

describe("timeToMinutes", () => {
  it("deve converter HH:MM para minutos corretamente", () => {
    expect(timeToMinutes("08:00")).toBe(480);
    expect(timeToMinutes("00:30")).toBe(30);
    expect(timeToMinutes("12:15")).toBe(735);
  });

  it("deve retornar 0 para strings vazias ou inválidas", () => {
    expect(timeToMinutes("")).toBe(0);
    expect(timeToMinutes(null as any)).toBe(0);
  });
});

describe("minutesToTime", () => {
  it("deve formatar minutos em Xh YYm corretamente", () => {
    expect(minutesToTime(480)).toBe("8h 00m");
    expect(minutesToTime(30)).toBe("0h 30m");
    expect(minutesToTime(735)).toBe("12h 15m");
  });

  it("deve tratar valor absoluto para minutos negativos", () => {
    expect(minutesToTime(-30)).toBe("0h 30m");
  });
});

describe("minutesToHHMM", () => {
  it("deve formatar minutos para HH:MM corretamente", () => {
    expect(minutesToHHMM(480)).toBe("08:00");
    expect(minutesToHHMM(30)).toBe("00:30");
    expect(minutesToHHMM(735)).toBe("12:15");
  });

  it("deve tratar valor absoluto para minutos negativos", () => {
    expect(minutesToHHMM(-30)).toBe("00:30");
  });
});

describe("formatTimeInput", () => {
  it("deve formatar dígitos corretamente como HH:MM", () => {
    expect(formatTimeInput("08")).toBe("08");
    expect(formatTimeInput("080")).toBe("08:0");
    expect(formatTimeInput("0800")).toBe("08:00");
  });

  it("deve limitar horas em 23 e minutos em 59", () => {
    expect(formatTimeInput("2500")).toBe("23:00");
    expect(formatTimeInput("0899")).toBe("08:59");
  });

  it("deve limpar caracteres não-numéricos", () => {
    expect(formatTimeInput("08a00")).toBe("08:00");
  });
});
