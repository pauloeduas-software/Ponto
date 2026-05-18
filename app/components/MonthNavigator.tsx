import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthNavigatorProps {
  currentDate: Date;
  onChangeMonth: (offset: number) => void;
}

export function MonthNavigator({ currentDate, onChangeMonth }: MonthNavigatorProps) {
  return (
    <div className="month-nav-new">
      <button 
        type="button" 
        className="icon-btn" 
        onClick={() => onChangeMonth(-1)}
      >
        <ChevronLeft size={18} />
      </button>
      <span className="month-label-new">
        {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
      </span>
      <button 
        type="button" 
        className="icon-btn" 
        onClick={() => onChangeMonth(1)}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
