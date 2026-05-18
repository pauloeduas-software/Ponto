import { Clock, Timer, TrendingUp, TrendingDown } from "lucide-react";

interface DayDetailsProps {
  punches?: string[] | null;
  worked?: string;
  goal?: string;
  diff?: string;
  isOvertime?: boolean;
  showGoal?: boolean;
}

export function DayDetails({
  punches = [],
  worked = "00:00",
  goal,
  diff = "00:00",
  isOvertime = false,
  showGoal = true
}: DayDetailsProps) {
  const safePunches = punches || [];
  const punchPairsCount = Math.ceil(safePunches.length / 2);

  return (
    <div className="day-details-container">
      {/* Bloco de Batidas do Dia */}
      <div className="info-box" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
        <div className="day-details-punches">
          {safePunches.length > 0 ? (
            Array.from({ length: punchPairsCount }).map((_, i) => (
              <div key={i} className="day-details-row">
                <div className="day-details-col">
                  <span className="day-details-meta">Entrada</span>
                  <span className="day-details-value">{safePunches[i * 2]}</span>
                </div>
                <div className="day-details-arrow">→</div>
                <div className="day-details-col align-right">
                  <span className="day-details-meta">Saída</span>
                  <span className="day-details-value">{safePunches[i * 2 + 1] || "--:--"}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="day-details-empty">
              Sem batidas registradas.
            </div>
          )}
        </div>
      </div>

      {/* Grid Estatístico de Totais */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: showGoal && goal ? '1fr 1fr 1fr' : '1fr 1fr',
          gap: '12px'
        }}
      >
        {showGoal && goal && (
          <div className="info-box">
            <span className="info-label"><Clock size={12} /> Meta</span>
            <span className="info-value">{goal}</span>
          </div>
        )}
        <div className="info-box">
          <span className="info-label"><Timer size={12} /> Trabalhado</span>
          <span className="info-value">{worked}</span>
        </div>
        <div className="info-box">
          <span className="info-label">
            {isOvertime ? <TrendingUp size={12} /> : <TrendingDown size={12} />} Saldo
          </span>
          <span className={`info-value ${isOvertime ? "overtime" : "missing"}`}>
            {diff}
          </span>
        </div>
      </div>
    </div>
  );
}
