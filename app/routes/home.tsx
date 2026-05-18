import { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Plus,
  ArrowRight,
  Loader2,
  Settings
} from "lucide-react";
import { useLoaderData, useFetcher, useRevalidator } from "react-router";
import { timeToMinutes, minutesToTime, minutesToHHMM, formatTimeInput } from "../utils/time";
import "../styles/home.css";
import { getHomeData, saveHomePunchRecord } from "../services/homeService.server";

export async function loader({ request }: { request: Request }) {
  return getHomeData(request);
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  await saveHomePunchRecord(request, formData);
  return { success: true };
}

export default function Home() {
  const { user, initialPunches, initialGoal, dateStr } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const syncFetcher = useFetcher();
  
  const [punches, setPunches] = useState<string[]>(initialPunches);
  const [dailyGoal, setDailyGoal] = useState(initialGoal);
  const [showGoalInput, setShowGoalInput] = useState(false);

  // Sincronização Silenciosa: Checa por mudanças no servidor a cada 15 segundos
  // Usamos um fetcher dedicado para que o carregamento seja invisível (não ativa a barra de progresso)
  useEffect(() => {
    const interval = setInterval(() => {
      if (fetcher.state === "idle" && syncFetcher.state === "idle" && document.visibilityState === "visible") {
        syncFetcher.load("/"); // Busca os dados da Home sem alarde
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [fetcher.state, syncFetcher]);

  // Atualiza os punches APENAS quando os dados vêm do syncFetcher (outras abas/dispositivos)
  // ou na montagem inicial. Evitamos atualizar via initialPunches para não sumir com colunas vazias
  // que o usuário acabou de limpar mas ainda está na página.
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

  // RESTAURADO: Detecta se o dia mudou e recarrega os dados
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
    let totalMins = 0;
    let lastEntryMins = -1;
    for (let i = 0; i < punches.length; i += 2) {
      if (punches[i] && punches[i + 1]) {
        const start = timeToMinutes(punches[i]);
        const end = timeToMinutes(punches[i + 1]);
        if (start >= lastEntryMins && end >= start) {
          totalMins += (end - start);
          lastEntryMins = start;
        }
      }
    }
    const lastFilledIdx = [...punches].reverse().findIndex(p => p.trim() !== "");
    const actualLastIdx = lastFilledIdx === -1 ? -1 : punches.length - 1 - lastFilledIdx;
    const isComplete = actualLastIdx !== -1 && (actualLastIdx + 1) % 2 === 0;
    const diffMins = isComplete ? (totalMins - timeToMinutes(dailyGoal)) : 0;
    return {
      totalWorked: minutesToHHMM(totalMins),
      overtime: minutesToHHMM(Math.abs(diffMins)),
      isOvertime: diffMins >= 0,
      workMins: totalMins,
      diffMins,
      firstEntryMins: (punches.length > 0 && punches[0]?.length === 5) ? timeToMinutes(punches[0]) : -1,
      totalBreakMins: (() => {
        let breakMins = 0;
        for (let i = 1; i < punches.length - 1; i += 2) {
          if (punches[i] && punches[i+1]) {
            const exit = timeToMinutes(punches[i]);
            const entry = timeToMinutes(punches[i+1]);
            if (entry >= exit) breakMins += (entry - exit);
          }
        }
        return breakMins;
      })()
    };
  }, [punches, dailyGoal]);

  const savePunches = (newPunches: string[], goalValue: string) => {
    // Limpa campos vazios apenas do FINAL da lista para não salvar colunas inúteis
    let cleanedPunches = [...newPunches];
    while (cleanedPunches.length > 0 && cleanedPunches[cleanedPunches.length - 1] === "") {
      cleanedPunches.pop();
    }

    let totalMins = 0;
    let lastEntryMins = -1;
    for (let i = 0; i < cleanedPunches.length; i += 2) {
      if (cleanedPunches[i] && cleanedPunches[i + 1]) {
        const start = timeToMinutes(cleanedPunches[i]);
        const end = timeToMinutes(cleanedPunches[i + 1]);
        if (start >= lastEntryMins && end >= start) {
          totalMins += (end - start);
          lastEntryMins = start;
        }
      }
    }
    const lastFilledIdx = [...cleanedPunches].reverse().findIndex(p => p.trim() !== "");
    const actualLastIdx = lastFilledIdx === -1 ? -1 : cleanedPunches.length - 1 - lastFilledIdx;
    const isComplete = actualLastIdx !== -1 && (actualLastIdx + 1) % 2 === 0;
    const diffMins = isComplete ? (totalMins - timeToMinutes(goalValue)) : 0;

    fetcher.submit(
      {
        date: dateStr,
        punches: JSON.stringify(cleanedPunches),
        goal: goalValue,
        workMins: totalMins.toString(),
        diffMins: diffMins.toString(),
        isOvertime: (diffMins >= 0).toString()
      },
      { method: "post" }
    );
  };

  const updateAndSavePunches = (newPunches: string[]) => {
    setPunches(newPunches);
    // savePunches será chamado pelo useEffect de debounce
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
              // Filtrar punches vazios no final para determinar quantas linhas mostrar
              const filledPunches = punches.filter((p, i) => {
                // Mantém se estiver preenchido ou se for o próximo campo a ser preenchido
                if (p !== "") return true;
                // Se for o primeiro campo vazio após os preenchidos, mantém
                const firstEmptyIdx = punches.findIndex(x => x === "");
                return i === firstEmptyIdx;
              });

              // Determinar quantos pares mostrar: 
              // Mostra apenas os pares que já possuem algum dado (mínimo 1 par)
              const pairsToShow = Math.max(1, Math.ceil(punches.length / 2));

              return Array.from({ length: pairsToShow }).map((_, pairIndex) => {
                const entryIdx = pairIndex * 2;
                const exitIdx = entryIdx + 1;
                const entryVal = punches[entryIdx];
                const exitVal = punches[exitIdx];

                // Validação Progressiva
                let isInvalid = false;
                let errorMessage = "";
                
                const currentEntryMins = entryVal?.length === 5 ? timeToMinutes(entryVal) : -1;
                const currentExitMins = exitVal?.length === 5 ? timeToMinutes(exitVal) : -1;

                // 1. Saída deve ser maior que a Entrada do mesmo par
                if (currentEntryMins !== -1 && currentExitMins !== -1 && currentExitMins <= currentEntryMins) {
                  isInvalid = true;
                  errorMessage = "Saída ≤ Entrada";
                }

                // 2. Entrada deve ser maior que a Saída do par anterior
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
                  
                  // Procura o primeiro índice vazio para preencher
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
