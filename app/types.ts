export interface User {
  id: string;
  name: string;
  username: string;
  role: 'admin' | 'manager' | 'employee';
  teamId?: string;
  avatarUrl?: string;
  goal?: string;
}

export interface Shift {
  userId: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  type: 'trabalho' | 'folga' | 'remoto';
}

export interface SavedDay {
  date: string;
  worked: string;
  diff: string;
  isOvertime: boolean;
  workMins: number;
  diffMins: number;
  goalMins: number;
  goal: string;
  punches?: string[];
  entry?: string;
  exit?: string;
  breaks?: {start: string, end: string}[];
}
