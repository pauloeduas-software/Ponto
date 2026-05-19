import { useMemo } from "react";
import { getDaysInMonth, type CalendarDay } from "../utils/calendar";

interface CalendarVerticalProps {
  currentDate: Date;
  onDayClick: (dateStr: string) => void;
  renderRowContent: (day: CalendarDay) => React.ReactNode;
  renderRowSide?: (day: CalendarDay) => React.ReactNode;
}

export function CalendarVertical({
  currentDate,
  onDayClick,
  renderRowContent,
  renderRowSide
}: CalendarVerticalProps) {
  const daysInMonth = useMemo(() => getDaysInMonth(currentDate), [currentDate]);
  
  const validDays = useMemo(() => {
    return daysInMonth.filter((d): d is CalendarDay => d !== null);
  }, [daysInMonth]);

  return (
    <div className="weekly-schedule-container">
      {validDays.map((wd) => {
        const dObj = new Date(wd.dateStr + 'T12:00:00');
        const dayName = dObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

        return (
          <div
            key={wd.dateStr}
            className="schedule-day-row"
            onClick={() => onDayClick(wd.dateStr)}
          >
            <div className="day-info-mini">
              <span className="day-num">{wd.day}</span>
              <span className="day-name">{dayName}</span>
            </div>
            
            <div className="punches-flow">
              {renderRowContent(wd)}
            </div>

            {renderRowSide && renderRowSide(wd)}
          </div>
        );
      })}
    </div>
  );
}
