import { useState, useMemo } from "react";
import { 
  Calculator, 
  RefreshCcw, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Lightbulb
} from "lucide-react";
import { useRouteLoaderData } from "react-router";
import { timeToMinutes, minutesToHHMM, minutesToTime } from "../utils/time";

interface SimDay {
  id: string;
  name: string;
  start: string;
  end: string;
  break: string;
  goal: string;
}

export default function Simulador() {
  const rootData = useRouteLoaderData("root") as { user: any } | undefined;
  const userGoal = rootData?.user?.goal || "08:00";

  const initialDays: SimDay[] = [
    { id: "seg", name: "Segunda", start: "08:00", end: "18:00", break: "02:00", goal: "08:00" },
    { id: "ter", name: "Terça", start: "08:00", end: "18:00", break: "02:00", goal: "08:00" },
    { id: "qua", name: "Quarta", start: "08:00", end: "18:00", break: "02:00", goal: "08:00" },
    { id: "qui", name: "Quinta", start: "08:00", end: "18:00", break: "02:00", goal: "08:00" },
    { id: "sex", name: "Sexta", start: "08:00", end: "18:00", break: "02:00", goal: "08:00" },
    { id: "sab", name: "Sábado", start: "08:00", end: "12:00", break: "00:00", goal: "04:00" },
    { id: "dom", name: "Domingo", start: "00:00", end: "00:00", break: "00:00", goal: "00:00" },
  ];

  const [days, setDays] = useState<SimDay[]>(initialDays);

  const updateField = (id: string, field: keyof SimDay, value: string) => {
    const digits = value.replace(/[^0-9]/g, "");
    let h = digits.slice(0, 2);
    let m = digits.slice(2, 4);
    if (h.length === 2 && parseInt(h) > 23) h = "23";
    if (m.length === 2 && parseInt(m) > 59) m = "59";
    const formatted = digits.length > 2 ? h + ":" + m : h;
    setDays(prev => prev.map(d => d.id === id ? { ...d, [field]: formatted } : d));
  };

  const results = useMemo(() => {
    const daily = days.map(d => {
      const inputs = [d.start, d.end].filter(p => p.trim() !== "");
      const isComplete = inputs.length === 2; // Simulador usa pares fixos por linha geralmente
      
      const s = timeToMinutes(d.start);
      const e = timeToMinutes(d.end);
      const b = timeToMinutes(d.break);
      const g = timeToMinutes(d.goal);
      const worked = (e > s) ? (e - s - b) : 0;
      const diff = isComplete ? (worked - g) : 0;
      return { ...d, worked, diff, isActive: inputs.length > 0 };
    });

    const totalDiff = daily.reduce((acc, d) => acc + d.diff, 0);
    const totalGoal = daily.filter(d => d.isActive).reduce((acc, d) => acc + timeToMinutes(d.goal), 0);
    const totalWorked = daily.reduce((acc, d) => acc + d.worked, 0);
    const hasNegative = totalDiff < 0;

    return { daily, totalDiff, totalGoal, totalWorked, hasNegative };
  }, [days]);

  const suggestion = useMemo(() => {
    if (results.totalDiff === 0) return null;
    const value = Math.abs(results.totalDiff);
    const targetDays = results.daily.filter(d => d.isActive && d.diff === 0 && d.worked > 0);
    if (targetDays.length === 0) return null;
    const perDay = Math.ceil(value / targetDays.length);
    const timeStr = minutesToTime(perDay);
    
    if (results.totalDiff < 0) {
      return `Recomendação: Trabalhe +${timeStr} nos ${targetDays.length} dias restantes.`;
    } else {
      return `Recomendação: Você pode sair ${timeStr} mais cedo nos próximos ${targetDays.length} dias.`;
    }
  }, [results]);

  return (
    <div className="container" style={{ alignItems: 'center' }}>
      <div className="card" style={{ maxWidth: '900px', width: '100%' }}>
        <div className="header" style={{ marginBottom: '16px' }}>
          <div>
            <h1>Simulador</h1>
          </div>
          <div className="header-actions">
            <button className="icon-btn" onClick={() => setDays(initialDays)} title="Resetar"><RefreshCcw size={18} /></button>
          </div>
        </div>

        {suggestion && (
          <div className="suggestion-top-banner">
            <Lightbulb size={16} color="var(--primary)" />
            <span>{suggestion}</span>
          </div>
        )}

        <div className="sim-content">
          <div className="sim-thead-final">
            <span>Dia</span>
            <span>Meta</span>
            <span>Entrada</span>
            <span>Saída</span>
            <span>Almoço</span>
            <span>Saldo</span>
          </div>

          <div className="sim-rows-final">
            {results.daily.map((d) => (
              <div key={d.id} className={`sim-day-row-final ${d.isActive ? 'active' : ''}`}>
                {/* Cabeçalho do Dia (Mobile Only) */}
                <div className="day-header-mob">
                  <strong>{d.name}</strong>
                  <span className={`day-res-mob ${d.diff > 0 ? 'pos' : d.diff < 0 ? 'neg' : ''}`}>
                    {d.diff !== 0 ? (d.diff > 0 ? '+' : '-') + minutesToHHMM(Math.abs(d.diff)) : '--:--'}
                  </span>
                </div>

                {/* Colunas do Desktop (que se adaptam no mobile) */}
                <div className="col-name desktop-only"><strong>{d.name}</strong></div>
                <div className="day-field"><label className="mob-label">Meta</label><input value={d.goal} onChange={e => updateField(d.id, 'goal', e.target.value)} maxLength={5} style={{ color: 'var(--primary)' }} /></div>
                <div className="day-field"><label className="mob-label">Entrada</label><input placeholder="--:--" value={d.start} onChange={e => updateField(d.id, 'start', e.target.value)} maxLength={5} /></div>
                <div className="day-field"><label className="mob-label">Saída</label><input placeholder="--:--" value={d.end} onChange={e => updateField(d.id, 'end', e.target.value)} maxLength={5} /></div>
                <div className="day-field"><label className="mob-label">Almoço</label><input placeholder="00:00" value={d.break} onChange={e => updateField(d.id, 'break', e.target.value)} maxLength={5} /></div>
                <div className={`col-res-final desktop-only ${d.diff > 0 ? 'pos' : d.diff < 0 ? 'neg' : ''}`}>
                  {d.diff !== 0 ? (d.diff > 0 ? '+' : '-') + minutesToHHMM(Math.abs(d.diff)) : '--:--'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sim-footer-compact-final">
          <div className="footer-panel-compact">
            <div className="balance-compact">
              <span className="balance-label">Saldo Semanal</span>
              <div className={`balance-value ${results.hasNegative ? 'neg' : results.totalDiff > 0 ? 'pos' : ''}`}>
                {results.totalDiff !== 0 && (results.hasNegative ? <TrendingDown size={20} /> : <TrendingUp size={20} />)}
                {results.totalDiff === 0 ? '00:00' : (results.hasNegative ? '-' : '+') + minutesToHHMM(Math.abs(results.totalDiff))}
              </div>
            </div>

            <div className="stats-compact">
              <div className="stat-item">Meta: <strong>{minutesToHHMM(results.totalGoal)}</strong></div>
              <div className="stat-item">Real: <strong>{minutesToHHMM(results.totalWorked)}</strong></div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .day-header-mob { display: none; }
        .mob-label { display: none; }
        
        .suggestion-top-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 12px;
          color: #a5b4fc;
          font-size: 0.85rem;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .sim-content { display: flex; flex-direction: column; gap: 8px; }
        .sim-thead-final {
          display: grid;
          grid-template-columns: 100px 1fr 1fr 1fr 1fr 100px;
          gap: 12px;
          text-align: center;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-muted);
          padding: 0 16px;
        }
        .sim-rows-final { display: flex; flex-direction: column; gap: 6px; }
        .sim-day-row-final {
          display: grid;
          grid-template-columns: 100px 1fr 1fr 1fr 1fr 100px;
          gap: 12px;
          align-items: center;
          padding: 8px 16px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--glass-border);
          border-radius: 14px;
        }
        .sim-day-row-final.active { background: rgba(255,255,255,0.05); }
        
        .col-name { font-size: 0.9rem; }
        .col-res-final { text-align: right; font-weight: 800; font-size: 0.95rem; color: var(--text-muted); }
        
        .day-field input {
          width: 100%;
          background: rgba(0,0,0,0.25);
          border: 1px solid var(--glass-border);
          border-radius: 10px;
          padding: 8px;
          color: white;
          text-align: center;
          font-size: 0.95rem;
          font-weight: 600;
          outline: none;
        }
        .day-field input:focus { border-color: var(--primary); background: rgba(0,0,0,0.4); }
        
        .pos { color: var(--success) !important; }
        .neg { color: var(--error) !important; }

        .footer-panel-compact {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          padding: 10px 20px;
          border-radius: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 20px;
        }
        .balance-compact { display: flex; align-items: baseline; gap: 12px; }
        .balance-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; }
        .balance-value { font-size: 1.4rem; font-weight: 900; display: flex; align-items: center; gap: 8px; }
        .stats-compact { display: flex; gap: 20px; font-size: 0.8rem; color: var(--text-muted); }
        .stat-item strong { color: white; margin-left: 4px; }

        @media (max-width: 800px) {
          .desktop-only { display: none !important; }
          .card { padding: 12px; }
          .sim-thead-final { display: none; }
          .sim-day-row-final {
            display: block;
            padding: 12px;
            margin-bottom: 8px;
          }
          .day-header-mob {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
          }
          .day-header-mob strong { font-size: 1.1rem; }
          .day-res-mob { font-size: 1.1rem; font-weight: 800; }
          
          .sim-day-row-final {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .day-header-mob { grid-column: span 2; }
          
          .mob-label { display: block; font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; font-weight: 700; text-align: center; }
          .day-field input { padding: 10px; font-size: 1rem; border-radius: 8px; }
          
          .footer-panel-compact { flex-direction: column; gap: 12px; text-align: center; }
          .balance-compact { flex-direction: column; align-items: center; gap: 4px; }
          .stats-compact { justify-content: center; }
        }
      `}} />
    </div>
  );
}
