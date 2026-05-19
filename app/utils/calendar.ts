export interface CalendarDay {
  day: number;
  dateStr: string;
}

export const getDaysInMonth = (currentDate: Date): (CalendarDay | null)[] => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  
  const days: (CalendarDay | null)[] = [];
  
  // Preenche slots vazios do mês anterior
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  
  // Preenche os dias do mês
  for (let i = 1; i <= lastDate; i++) {
    const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
    days.push({ day: i, dateStr });
  }
  
  return days;
};
