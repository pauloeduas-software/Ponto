import { Clock, Timer, TrendingUp, TrendingDown } from "lucide-react";

interface DayInfoProps {
  punches?: string[] | null;
  worked?: string;
  goal?: string;
  diff?: string;
  isOvertime?: boolean;
  showGoal?: boolean;
  observation?: string;
}

export function DayInfo({
  punches = [],
  worked = "00:00",
  goal,
  diff = "00:00",
  isOvertime = false,
  showGoal = true,
  observation
}: DayInfoProps) {
  const safePunches = punches || [];

  // Group punches into pairs: [[entrada, saida], [entrada, saida]]
  const punchPairs: [string, string][] = [];
  for (let i = 0; i < safePunches.length; i += 2) {
    punchPairs.push([safePunches[i], safePunches[i + 1] || "--:--"]);
  }

  return (
    <div className="day-modal-info-container">
      {/* Linha do Tempo de Batidas (Timeline de Turnos) */}
      <div className="day-modal-section">
        <div className="day-modal-section-title">Registro de Batidas</div>
        {punchPairs.length > 0 ? (
          <div className="day-modal-timeline">
            {punchPairs.map((pair, index) => {
              const [entrada, saida] = pair;
              return (
                <div key={index} className="day-modal-timeline-item">
                  <div className="day-modal-timeline-indicator">
                    <div className="day-modal-timeline-dot entrada" />
                    {index < punchPairs.length - 1 && (
                      <div className="day-modal-timeline-line" />
                    )}
                  </div>
                  <div className="day-modal-timeline-content">
                    <div className="day-modal-timeline-pair">
                      <div className="day-modal-timeline-punch">
                        <span className="day-modal-timeline-time">{entrada}</span>
                        <span className="day-modal-timeline-type">Entrada</span>
                      </div>
                      <span className="day-modal-timeline-arrow">→</span>
                      <div className="day-modal-timeline-punch">
                        <span className="day-modal-timeline-time">{saida}</span>
                        <span className="day-modal-timeline-type">Saída</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="day-modal-empty-state">
            Nenhuma batida registrada para esta data.
          </div>
        )}
      </div>

      {/* Horas e Saldos Typográficos */}
      <div className="day-modal-header-stats">
        <div className="day-modal-stat">
          <span className="day-modal-stat-label">
            <Timer size={12} className="day-modal-stat-icon" /> Trabalhado
          </span>
          <span className="day-modal-stat-value">{worked}</span>
        </div>
        
        {showGoal && goal && (
          <div className="day-modal-stat">
            <span className="day-modal-stat-label">
              <Clock size={12} className="day-modal-stat-icon" /> Meta
            </span>
            <span className="day-modal-stat-value">{goal}</span>
          </div>
        )}

        <div className="day-modal-stat">
          <span className="day-modal-stat-label">
            {isOvertime ? (
              <TrendingUp size={12} className="day-modal-stat-icon" />
            ) : (
              <TrendingDown size={12} className="day-modal-stat-icon" />
            )}{" "}
            Saldo
          </span>
          <span className={`day-modal-stat-value ${isOvertime ? "overtime" : "missing"}`}>
            {diff}
          </span>
        </div>
      </div>

      {/* Observação com Estilo de Citação */}
      {observation && (
        <div className="day-modal-observation">
          <div className="day-modal-observation-title">Observação</div>
          <p className="day-modal-observation-text">{observation}</p>
        </div>
      )}
    </div>
  );
}
