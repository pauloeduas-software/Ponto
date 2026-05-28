import { useState, useEffect, useMemo } from "react";
import {Clock, ArrowRight, Loader2, Settings} from "lucide-react";
import { useFetcher } from "react-router";
import { timeToMinutes, minutesToTime, minutesToHHMM, formatTimeInput } from "../utils/time";
import { calculatePunchMetrics } from "../domain/punchCalculator";
import "../styles/home.css";

interface HomeViewProps {
  user: any;
  initialPunches: string[];
  initialGoal: string;
  dateStr: string;
}

export function HomeView({ user, initialPunches, initialGoal, dateStr }: HomeViewProps) {
  const fetcher = useFetcher();
  const syncFetcher = useFetcher();
  
  const [punches, setPunches] = useState<string[]>(initialPunches);
  const [dailyGoal, setDailyGoal] = useState(initialGoal);
  const [showGoalInput, setShowGoalInput] = useState(false);

  // Sincronização Silenciosa: Checa por mudanças no servidor a cada 15 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (fetcher.state === "idle" && syncFetcher.state === "idle" && document.visibilityState === "visible") {
        syncFetcher.load("/"); // Busca os dados da Home sem alarde
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [fetcher.state, syncFetcher]);

  // Atualiza os punches quando os dados vêm do syncFetcher (outras abas/dispositivos)
  useEffect(() => {
    const newData = syncFetcher.data as any;
    if (newData?.initialPunches) {
      setPunches(newData.initialPunches);
      setDailyGoal(newData.initialGoal);
    }
  }, [syncFetcher.data]);

  // Debounce para salvar: evita atropelar a digitação do usuário
  useEffect(() => {
    const isDifferent = JSON.stringify(punches) !== JSON.stringify(initialPunches) || dailyGoal !== initialGoal;
    if (isDifferent) {
      const timer = setTimeout(() => {
        savePunches(punches, dailyGoal);
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [punches, dailyGoal]);

  // Detecta se o dia mudou e recarrega os dados
  useEffect(() => {
    const checkDate = () => {
      const now = new Date();
      const today = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
      if (today !== dateStr) {
        window.location.reload();
      }
    };
    const interval = setInterval(checkDate, 60000);
    window.addEventListener('focus', checkDate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkDate);
    };
  }, [dateStr]);

  const currentResults = useMemo(() => {
    const metrics = calculatePunchMetrics(punches, dailyGoal);
    return {
      totalWorked: metrics.totalWorkedStr,
      overtime: metrics.diffStr,
      isOvertime: metrics.isOvertime,
      workMins: metrics.workMins,
      diffMins: metrics.diffMins,
      firstEntryMins: metrics.firstEntryMins,
      totalBreakMins: metrics.breakMins,
    };
  }, [punches, dailyGoal]);

  const savePunches = (newPunches: string[], goalValue: string) => {
    let cleanedPunches = [...newPunches];
    while (cleanedPunches.length > 0 && cleanedPunches[cleanedPunches.length - 1] === "") {
      cleanedPunches.pop();
    }

    const metrics = calculatePunchMetrics(cleanedPunches, goalValue);

    fetcher.submit(
      {
        date: dateStr,
        punches: JSON.stringify(cleanedPunches),
        goal: goalValue,
        workMins: metrics.workMins.toString(),
        diffMins: metrics.diffMins.toString(),
        isOvertime: metrics.isOvertime.toString()
      },
      { method: "post" }
    );
  };

  const updateAndSavePunches = (newPunches: string[]) => {
    setPunches(newPunches);
  };

  const updatePunch = (index: number, value: string) => {
    const newPunches = [...punches];
    newPunches[index] = value;
    setPunches(newPunches);
  };

  return (
    <div className="container">
      <div className="card">
        <div className="punches-section punches-section-wrapper">
          <div className="admin-header-new home-header-spacing">
            <div className="header-row-1">
              <h1>Linha do Tempo</h1>
              <div className="home-header-actions">
                <span className="home-header-badge">
                  {fetcher.state !== "idle" ? <Loader2 size={12} className="animate-spin" /> : `${punches.filter(p => p !== "").length} batidas hoje`}
                </span>
                <button 
                  onClick={() => setShowGoalInput(!showGoalInput)}
                  className={`btn-settings-glass ${showGoalInput ? 'active' : ''}`}
                  title="Configurar Meta"
                >
                  <Settings size={14} />
                </button>
              </div>
            </div>
          </div>

          {showGoalInput && (
            <div className="home-goal-banner">
              <div className="home-goal-banner-title-container">
                <div className="home-goal-banner-title">Meta do Dia</div>
                <div className="home-goal-banner-desc">Apenas para hoje</div>
              </div>
              <div className="home-goal-input-container">
                <input 
                  type="text"
                  inputMode="numeric"
                  value={dailyGoal}
                  maxLength={5}
                  onChange={(e) => setDailyGoal(formatTimeInput(e.target.value))}
                  className="home-goal-input"
                />
                <Clock size={14} color="white" className="home-goal-input-icon" />
              </div>
            </div>
          )}

          <div className="punches-grid-container">
            {(() => {
              const pairsToShow = Math.max(1, Math.ceil(punches.length / 2));

              return Array.from({ length: pairsToShow }).map((_, pairIndex) => {
                const entryIdx = pairIndex * 2;
                const exitIdx = entryIdx + 1;
                const entryVal = punches[entryIdx];
                const exitVal = punches[exitIdx];

                let isInvalid = false;
                let errorMessage = "";
                
                const currentEntryMins = entryVal?.length === 5 ? timeToMinutes(entryVal) : -1;
                const currentExitMins = exitVal?.length === 5 ? timeToMinutes(exitVal) : -1;

                if (currentEntryMins !== -1 && currentExitMins !== -1 && currentExitMins <= currentEntryMins) {
                  isInvalid = true;
                  errorMessage = "Saída ≤ Entrada";
                }

                if (!isInvalid && pairIndex > 0 && currentEntryMins !== -1) {
                  const prevExitVal = punches[entryIdx - 1];
                  const prevExitMins = prevExitVal?.length === 5 ? timeToMinutes(prevExitVal) : -1;
                  if (prevExitMins !== -1 && currentEntryMins <= prevExitMins) {
                    isInvalid = true;
                    errorMessage = "Menor que anterior";
                  }
                }

                return (
                  <div key={pairIndex} className={`punch-pair-row ${isInvalid ? 'invalid' : ''}`}>
                    {isInvalid && (
                      <span className="punch-pair-error">
                        {errorMessage}
                      </span>
                    )}
                    <div className={`punch-pair-input-col ${isInvalid ? 'invalid' : ''}`}>
                      <label>Entrada</label>
                      <div className="punch-pair-input-wrapper">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="HH:MM"
                          value={entryVal || ""}
                          maxLength={5}
                          onChange={e => updatePunch(entryIdx, formatTimeInput(e.target.value))}
                          className={isInvalid ? 'invalid' : ''}
                        />
                        {entryVal && (
                          <button onClick={() => updatePunch(entryIdx, "")} className="punch-pair-clear-btn">
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    <ArrowRight size={14} className={`punch-pair-arrow ${isInvalid ? 'invalid' : ''}`} />
                    <div className={`punch-pair-input-col ${isInvalid ? 'invalid' : ''}`}>
                      <label>Saída</label>
                      <div className="punch-pair-input-wrapper">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="HH:MM"
                          value={exitVal || ""}
                          maxLength={5}
                          onChange={e => updatePunch(exitIdx, formatTimeInput(e.target.value))}
                          className={isInvalid ? 'invalid' : ''}
                        />
                        {exitVal && (
                          <button onClick={() => updatePunch(exitIdx, "")} className="punch-pair-clear-btn">
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          <div className="register-btn-container">
            {(() => {
              const filledPunches = punches.filter(p => p !== "");
              const isEntry = filledPunches.length % 2 === 0;
              return (
                <button className="btn-register btn-register-home" onClick={() => {
                  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  const current = [...punches];
                  const firstEmptyIdx = current.findIndex(p => p === "");
                  
                  if (firstEmptyIdx !== -1) {
                    current[firstEmptyIdx] = now;
                  } else {
                    current.push(now);
                  }
                  
                  updateAndSavePunches(current);
                }}>
                  <Clock size={24} /> {isEntry ? "Registrar Entrada" : "Registrar Saída"}
                </button>
              );
            })()}
          </div>
        </div>

        <div className="results">
          <div className="result-item"><span className="result-label">Total Trabalhado</span><span className="result-value">{currentResults.totalWorked}</span></div>
          
          {currentResults.firstEntryMins !== -1 && (
            <div className="result-item result-item-border-top">
              <span className="result-label">Sugestão de Saída</span>
              <span className="result-value">
                {minutesToHHMM(currentResults.firstEntryMins + timeToMinutes(dailyGoal) + currentResults.totalBreakMins)}
              </span>
            </div>
          )}

          <div className="result-item"><span className="result-label">Saldo do Dia</span><span className={`result-value ${currentResults.isOvertime ? "overtime" : "missing"}`}>{currentResults.overtime}</span></div>
        </div>
      </div>
    </div>
  );
}
