import { useMemo } from "react";
import { getDaysInMonth, type CalendarDay } from "../utils/calendar";

interface CalendarGridProps {
  currentDate: Date;
  selectedDateStr: string;
  isModalOpen: boolean;
  onDayClick: (dateStr: string) => void;
  renderDay: (day: CalendarDay, isSelected: boolean) => React.ReactNode;
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
    <div className="calendar-grid">
      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
        <div key={d} className="weekday-label">{d}</div>
      ))}
      {daysInMonth.map((d, i) => {
        if (!d) return <div key={`empty-${i}`} className="calendar-day other-month" />;
        const isSelected = selectedDateStr === d.dateStr && isModalOpen;
        return (
          <div
            key={d.dateStr}
            onClick={() => onDayClick(d.dateStr)}
            style={{ display: 'contents' }}
          >
            {renderDay(d, isSelected)}
          </div>
        );
      })}
    </div>
  );
}
