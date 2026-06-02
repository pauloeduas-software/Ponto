export interface Team {
  id: string;
  name: string;
  createdAt?: string;
}

export interface UserTeamMembership {
  teamId: string;
  teamName: string;
  role: 'manager' | 'employee';
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: 'admin' | 'manager' | 'employee';
  teamId?: string;
  teamName?: string;
  avatarUrl?: string;
  goal?: string;
  userTeams?: UserTeamMembership[];
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
  observation?: string;
}

export interface UserDbRow {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: 'admin' | 'manager' | 'employee';
  goal?: string;
  avatarUrl?: string;
  teamId?: string;
}

export interface PunchRecordDbRow {
  id: string;
  date: string;
  punches: string;
  workMins: number;
  diffMins: number;
  isOvertime: number;
  goalMins: number;
  userId: string;
  observation?: string;
}
