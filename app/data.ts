import { type User, type Shift } from "./types";

export const MOCK_USERS: User[] = [
  { id: '2', name: 'Meu Usuário', role: 'employee' },
];

export const getHistory = (userId: string) => {
  const allHistory = JSON.parse(localStorage.getItem('ponto_all_history_v4') || '{}');
  return allHistory[userId] || [];
};

export const saveHistory = (userId: string, history: any[]) => {
  const allHistory = JSON.parse(localStorage.getItem('ponto_all_history_v4') || '{}');
  allHistory[userId] = history;
  localStorage.setItem('ponto_all_history_v4', JSON.stringify(allHistory));
};

export const getEscala = (): Shift[] => {
  return JSON.parse(localStorage.getItem('ponto_escala_v4') || '[]');
};

export const saveEscala = (escala: Shift[]) => {
  localStorage.setItem('ponto_escala_v4', JSON.stringify(escala));
};
export type { User };

