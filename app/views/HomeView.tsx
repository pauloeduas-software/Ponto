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

  const punchesWithEmpty = useMemo(() => {
    const copy = [...punches];
    if (copy.length === 0 || copy[copy.length - 1] !== "") {
      copy.push("");
    }
    return copy;
  }, [punches]);

  return (
    <div className="container">
      <div className="home-dashboard-container">
        
        {/* HERO CARD - CLOCK & PUNCH ACTIONS */}
        <div className="home-hero-card">
          <div className="home-hero-title">
            [ CRONÔMETRO DE JORNADA ]
          </div>
          <div className="home-clock-text font-mono">
            {(() => {
              const [currentTime, setCurrentTime] = useState(new Date());
              useEffect(() => {
                const timer = setInterval(() => setCurrentTime(new Date()), 1000);
                return () => clearInterval(timer);
              }, []);
              const h = String(currentTime.getHours()).padStart(2, '0');
              const m = String(currentTime.getMinutes()).padStart(2, '0');
              const s = String(currentTime.getSeconds()).padStart(2, '0');
              return `${h}:${m}:${s}`;
            })()}
          </div>
          
          <div className="home-button-wrapper">
            {(() => {
              const filledPunches = punches.filter(p => p !== "");
              const isEntry = filledPunches.length % 2 === 0;
              return (
                <button 
                  className={`home-punch-btn ${!isEntry ? 'active' : ''}`}
                  onClick={() => {
                    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const current = [...punches];
                    const firstEmptyIdx = current.findIndex(p => p === "");
                    
                    if (firstEmptyIdx !== -1) {
                      current[firstEmptyIdx] = now;
                    } else {
                      current.push(now);
                    }
                    
                    updateAndSavePunches(current);
                  }}
                >
                  {fetcher.state !== "idle" ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> SALVANDO...
                    </>
                  ) : (
                    <>
                      <Clock size={16} /> {isEntry ? "REGISTRAR ENTRADA" : "REGISTRAR INTERVALO / SAÍDA"}
                    </>
                  )}
                </button>
              );
            })()}
          </div>
        </div>

        {/* STATS GRID */}
        <div className="home-stats-grid">
          
          {/* STAT BOX 1: JORNADA DE HOJE */}
          <div className="home-stat-box">
            <div className="home-stat-header">JORNADA DE HOJE</div>
            <div className="home-stat-value font-mono">
              {currentResults.totalWorked || "00:00"}
            </div>
            
            <div className="home-stat-meta-row">
              <span className="home-stat-meta-label">Meta diária:</span>
              <div className="home-goal-input-wrapper">
                <input 
                  type="text"
                  inputMode="numeric"
                  value={dailyGoal}
                  maxLength={5}
                  onChange={(e) => setDailyGoal(formatTimeInput(e.target.value))}
                  className="home-goal-inline-input font-mono"
                  placeholder="08:00"
                  data-bwignore="true"
                />
                <Clock size={10} className="home-goal-inline-icon" />
              </div>
            </div>

            <div className="home-progress-bar-container">
              <div 
                className="home-progress-bar" 
                style={{ width: `${Math.min(100, (currentResults.workMins / (timeToMinutes(dailyGoal) || 480)) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* STAT BOX 2: SALDO DO DIA */}
          <div className="home-stat-box">
            <div className="home-stat-header">SALDO DO DIA</div>
            <div className={`home-stat-value font-mono ${currentResults.isOvertime ? 'overtime' : 'missing'}`}>
              {currentResults.overtime || "00:00"}
            </div>
            
            <div className="home-stat-meta-row">
              <span className="home-stat-meta-label">
                {currentResults.isOvertime ? "Banco de Horas Positivo" : "Horas faltantes para jornada"}
              </span>
            </div>

            <div className="home-progress-bar-container">
              <div 
                className={`home-progress-bar ${currentResults.isOvertime ? 'success' : 'warning'}`} 
                style={{ 
                  width: `${currentResults.isOvertime 
                    ? 100 
                    : Math.min(100, (currentResults.workMins / (timeToMinutes(dailyGoal) || 480)) * 100)}%` 
                }}
              ></div>
            </div>
          </div>

          {/* TIMELINE DE BATIDAS - Ocupa as 2 colunas */}
          <div className="home-stat-box timeline-box">
            <div className="home-stat-header">BATIDAS REGISTRADAS HOJE</div>
            
            <div className="home-punch-timeline-container">
              <div className="home-punch-timeline">
                {punchesWithEmpty.map((p, idx) => {
                  const isEntry = idx % 2 === 0;
                  const isEmpty = p === "";
                  
                  let isInvalid = false;
                  let errorMessage = "";
                  
                  if (!isEmpty && p.length === 5) {
                    const currentMins = timeToMinutes(p);
                    if (idx > 0) {
                      const prevVal = punchesWithEmpty[idx - 1];
                      if (prevVal && prevVal.length === 5) {
                        const prevMins = timeToMinutes(prevVal);
                        if (currentMins <= prevMins) {
                          isInvalid = true;
                          errorMessage = isEntry ? "Menor que anterior" : "Saída ≤ Entrada";
                        }
                      }
                    }
                  }

                  return (
                    <div 
                      key={idx} 
                      className={`home-punch-node ${isInvalid ? 'invalid' : ''} ${isEmpty ? 'empty' : ''}`}
                    >
                      <div className="home-node-circle-container">
                        <div className="home-node-line-left"></div>
                        <div className="home-node-circle"></div>
                        <div className="home-node-line-right"></div>
                      </div>
                      
                      <div className="home-node-content">
                        <div className="home-node-input-wrapper">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="HH:MM"
                            value={p}
                            maxLength={5}
                            onChange={e => updatePunch(idx, formatTimeInput(e.target.value))}
                            className={`home-node-input font-mono ${isInvalid ? 'invalid' : ''}`}
                            data-bwignore="true"
                          />
                          {!isEmpty && (
                            <button 
                              type="button"
                              onClick={() => {
                                const copy = [...punches];
                                copy.splice(idx, 1);
                                updateAndSavePunches(copy);
                              }} 
                              className="home-node-clear-btn"
                              title="Remover batida"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <div className="home-node-label">
                          {isEmpty ? "Aguardando" : (isEntry ? "Entrada" : "Saída")}
                        </div>
                        {isInvalid && (
                          <span className="home-node-error-badge">
                            {errorMessage}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Sugestão de Saída se houver batidas */}
            {currentResults.firstEntryMins !== -1 && (
              <div className="home-sugestao-saida-row font-mono">
                SUGESTÃO DE SAÍDA: {minutesToHHMM(currentResults.firstEntryMins + timeToMinutes(dailyGoal) + currentResults.totalBreakMins)}
              </div>
            )}
            
          </div>
        </div>
        
      </div>
    </div>
  );
}
