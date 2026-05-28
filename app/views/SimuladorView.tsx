import { useState, useMemo, useEffect } from "react";
import { Calculator, RefreshCcw, TrendingUp, TrendingDown, AlertCircle, Lightbulb } from "lucide-react";
import { timeToMinutes, minutesToTime, minutesToHHMM, formatTimeInput } from "../utils/time";
import "../styles/simulador.css";

interface SimDay {
  id: string;
  name: string;
  start: string;
  end: string;
  break: string;
  goal: string;
}

interface SimuladorViewProps {
  userGoal: string;
  userId: string;
}

export function SimuladorView({ userGoal, userId }: SimuladorViewProps) {
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
  const [isLoaded, setIsLoaded] = useState(false);

  const storageKey = `ponto_simulador_dados_${userId}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setDays(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar dados salvos do simulador", e);
      }
    } else {
      setDays(initialDays);
    }
    setIsLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(storageKey, JSON.stringify(days));
    }
  }, [days, isLoaded, storageKey]);

  const handleReset = () => {
    localStorage.removeItem(storageKey);
    setDays(initialDays);
  };

  const updateField = (id: string, field: keyof SimDay, value: string) => {
    const formatted = formatTimeInput(value);
    setDays(prev => prev.map(d => d.id === id ? { ...d, [field]: formatted } : d));
  };

  const results = useMemo(() => {
    const daily = days.map(d => {
      const inputs = [d.start, d.end].filter(p => p.trim() !== "");
      const isComplete = inputs.length === 2;
      
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
    <div className="container simulador-container">
      <div className="card simulador-card">
        <div className="header simulador-header">
          <div>
            <h1>Simulador</h1>
          </div>
          <div className="header-actions">
            <button className="icon-btn" onClick={handleReset} title="Resetar"><RefreshCcw size={18} /></button>
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
                <div className="day-header-mob">
                  <strong>{d.name}</strong>
                  <span className={`day-res-mob ${d.diff > 0 ? 'pos' : d.diff < 0 ? 'neg' : ''}`}>
                  {d.diff !== 0 ? minutesToHHMM(Math.abs(d.diff)) : '--:--'}
                  </span>
                </div>

                <div className="col-name desktop-only"><strong>{d.name}</strong></div>
                <div className="day-field goal"><label className="mob-label">Meta</label><input value={d.goal} onChange={e => updateField(d.id, 'goal', e.target.value)} maxLength={5} /></div>
                <div className="day-field"><label className="mob-label">Entrada</label><input placeholder="--:--" value={d.start} onChange={e => updateField(d.id, 'start', e.target.value)} maxLength={5} /></div>
                <div className="day-field"><label className="mob-label">Saída</label><input placeholder="--:--" value={d.end} onChange={e => updateField(d.id, 'end', e.target.value)} maxLength={5} /></div>
                <div className="day-field"><label className="mob-label">Almoço</label><input placeholder="00:00" value={d.break} onChange={e => updateField(d.id, 'break', e.target.value)} maxLength={5} /></div>
                <div className={`col-res-final desktop-only ${d.diff > 0 ? 'pos' : d.diff < 0 ? 'neg' : ''}`}>
                  {d.diff !== 0 ? minutesToHHMM(Math.abs(d.diff)) : '--:--'}
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
                {results.totalDiff === 0 ? '00:00' : minutesToHHMM(Math.abs(results.totalDiff))}
              </div>
            </div>

            <div className="stats-compact">
              <div className="stat-item">Meta: <strong>{minutesToHHMM(results.totalGoal)}</strong></div>
              <div className="stat-item">Real: <strong>{minutesToHHMM(results.totalWorked)}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
