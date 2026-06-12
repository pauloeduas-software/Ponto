import { useMemo } from "react";
import { getDaysInMonth, type CalendarDay } from "../utils/calendar";

interface CalendarGridProps {
  currentDate: Date;
  selectedDateStr: string;
  isModalOpen: boolean;
  onDayClick: (dateStr: string) => void;
  renderDay: (day: CalendarDay, isSelected: boolean, isWeekend: boolean) => React.ReactNode;
}

export function CalendarGrid({
  currentDate,
  selectedDateStr,
  isModalOpen,
  onDayClick,
  renderDay
}: CalendarGridProps) {
  const daysInMonth = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

  return (
    <div className="calendar-wrapper">
      <div className="week-header">
        {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(d => (
          <div key={d} className="weekday-label">{d}</div>
        ))}
      </div>
      <div className="calendar-grid-container">
        {daysInMonth.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} className="calendar-day other-month" />;
          const isSelected = selectedDateStr === d.dateStr && isModalOpen;
          const isWeekend = (i % 7 === 0) || (i % 7 === 6);
          return (
            <div
              key={d.dateStr}
              onClick={() => onDayClick(d.dateStr)}
              style={{ display: 'contents' }}
            >
              {renderDay(d, isSelected, isWeekend)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
