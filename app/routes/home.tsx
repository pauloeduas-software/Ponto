import { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Plus,
  ArrowRight,
  Loader2,
  Settings
} from "lucide-react";
import { useLoaderData, useFetcher, useRevalidator } from "react-router";
import { timeToMinutes, minutesToTime, minutesToHHMM } from "../utils/time";
import { db } from "../db.server";
import { requireUserId, getUser } from "../session.server";

export async function loader({ request }: { request: Request }) {
  const userId = await requireUserId(request);
  const user = await getUser(request);

  const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

  const record = db.prepare("SELECT * FROM PunchRecord WHERE userId = ? AND date = ?").get(userId, dateStr) as any;

  return {
    user,
    initialPunches: record ? JSON.parse(record.punches) : [],
    initialGoal: record?.goalMins ? minutesToHHMM(record.goalMins) : (user as any).goal || "08:00",
    dateStr
  };
}

export async function action({ request }: { request: Request }) {
  const userId = await requireUserId(request);
  const formData = await request.formData();

  const date = formData.get("date") as string;
  const punches = formData.get("punches") as string;
  const workMins = parseInt(formData.get("workMins") as string);
  const diffMins = parseInt(formData.get("diffMins") as string);
  const isOvertime = formData.get("isOvertime") === "true" ? 1 : 0;

  const goal = formData.get("goal") as string;
  const goalMins = timeToMinutes(goal);

  // Manual Upsert for SQLite
  const existing = db.prepare("SELECT id FROM PunchRecord WHERE userId = ? AND date = ?").get(userId, date);
  if (existing) {
    db.prepare(
      "UPDATE PunchRecord SET punches = ?, workMins = ?, diffMins = ?, isOvertime = ?, goalMins = ? WHERE userId = ? AND date = ?"
    ).run(punches, workMins, diffMins, isOvertime, goalMins, userId, date);
  } else {
    db.prepare(
      "INSERT INTO PunchRecord (id, userId, date, punches, workMins, diffMins, isOvertime, goalMins) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(crypto.randomUUID(), userId, date, punches, workMins, diffMins, isOvertime, goalMins);
  }

  // Atualiza a meta padrão do usuário para que os próximos dias herdem esse valor
  db.prepare("UPDATE User SET goal = ? WHERE id = ?").run(goal, userId);

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
    const diffMins = totalMins - timeToMinutes(dailyGoal);
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
    let totalMins = 0;
    let lastEntryMins = -1;
    for (let i = 0; i < newPunches.length; i += 2) {
      if (newPunches[i] && newPunches[i + 1]) {
        const start = timeToMinutes(newPunches[i]);
        const end = timeToMinutes(newPunches[i + 1]);
        if (start >= lastEntryMins && end >= start) {
          totalMins += (end - start);
          lastEntryMins = start;
        }
      }
    }
    // Limpa batidas vazias no final antes de salvar
    let cleanedPunches = [...newPunches];
    while (cleanedPunches.length > 0 && cleanedPunches[cleanedPunches.length - 1] === "") {
      cleanedPunches.pop();
    }

    const diffMins = totalMins - timeToMinutes(goalValue);

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
    let newPunches = [...punches];
    newPunches[index] = value;
    
    // Cascata: Se apagar um valor, limpa tudo que vem DEPOIS dele
    if (value === "") {
      newPunches = newPunches.slice(0, index + 1);
    }
    
    setPunches(newPunches);
  };

  return (
    <div className="container">
      <div className="card">
        <div className="punches-section" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <label style={{ margin: 0 }}>Linha do Tempo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {fetcher.state !== "idle" ? <Loader2 size={12} className="animate-spin" /> : `${punches.filter(p => p !== "").length} batidas hoje`}
              </span>
              <button 
                onClick={() => setShowGoalInput(!showGoalInput)}
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid var(--glass-border)', 
                  color: showGoalInput ? 'var(--primary)' : 'var(--text-muted)', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px',
                  borderRadius: '10px',
                  transition: 'all 0.2s'
                }}
                title="Configurar Meta"
              >
                <Settings size={14} />
              </button>
            </div>
          </div>

          {showGoalInput && (
            <div style={{ 
              marginBottom: '20px', 
              padding: '16px', 
              background: 'rgba(99, 102, 241, 0.05)', 
              borderRadius: '16px', 
              border: '1px solid rgba(99, 102, 241, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              animation: 'fadeIn 0.3s ease'
            }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>Meta do Dia</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Apenas para hoje</div>
              </div>
              <input 
                type="time" 
                value={dailyGoal}
                onChange={(e) => setDailyGoal(e.target.value)}
                style={{
                  width: '100px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  color: 'white',
                  fontWeight: '700',
                  textAlign: 'center'
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                <div key={pairIndex} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '16px', position: 'relative',
                  background: isInvalid ? 'rgba(255, 68, 68, 0.05)' : 'rgba(255,255,255,0.03)',
                  border: isInvalid ? '1px solid #ff4444' : '1px solid var(--glass-border)',
                }}>
                  {isInvalid && (
                    <span style={{ position: 'absolute', top: '-8px', right: '12px', background: '#ff4444', color: 'white', fontSize: '0.6rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                      {errorMessage}
                    </span>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '4px' }}>
                    <label style={{ fontSize: '0.6rem', color: isInvalid ? '#ff4444' : 'var(--text-muted)' }}>Entrada</label>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="HH:MM"
                        value={entryVal || ""}
                        maxLength={5}
                        onChange={e => {
                          const digits = e.target.value.replace(/[^0-9]/g, "");
                          let h = digits.slice(0, 2);
                          let m = digits.slice(2, 4);

                          // Validação de horas (máx 23)
                          if (h.length === 2 && parseInt(h) > 23) h = "23";
                          // Validação de minutos (máx 59)
                          if (m.length === 2 && parseInt(m) > 59) m = "59";

                          const v = digits.length > 2 ? h + ":" + m : h;
                          updatePunch(entryIdx, v);
                        }}
                        style={{ borderColor: isInvalid ? '#ff4444' : '', textAlign: 'center', letterSpacing: '2px' }}
                      />
                      {entryVal && (
                        <button onClick={() => updatePunch(entryIdx, "")} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  <ArrowRight size={14} style={{ marginTop: '16px', color: isInvalid ? '#ff4444' : 'var(--text-muted)', flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '4px' }}>
                    <label style={{ fontSize: '0.6rem', color: isInvalid ? '#ff4444' : 'var(--text-muted)' }}>Saída</label>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="HH:MM"
                        value={exitVal || ""}
                        maxLength={5}
                        onChange={e => {
                          const digits = e.target.value.replace(/[^0-9]/g, "");
                          let h = digits.slice(0, 2);
                          let m = digits.slice(2, 4);

                          if (h.length === 2 && parseInt(h) > 23) h = "23";
                          if (m.length === 2 && parseInt(m) > 59) m = "59";

                          const v = digits.length > 2 ? h + ":" + m : h;
                          updatePunch(exitIdx, v);
                        }}
                        style={{ borderColor: isInvalid ? '#ff4444' : '', textAlign: 'center', letterSpacing: '2px' }}
                      />
                      {exitVal && (
                        <button onClick={() => updatePunch(exitIdx, "")} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
            {(() => {
              const filledPunches = punches.filter(p => p !== "");
              const isEntry = filledPunches.length % 2 === 0;
              return (
                <button className="btn-register" onClick={() => {
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
                }} style={{ padding: '20px', fontSize: '1.2rem', fontWeight: 'bold', background: 'var(--primary)', boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)' }}>
                  <Clock size={24} style={{ marginRight: '12px' }} /> {isEntry ? "Registrar Entrada" : "Registrar Saída"}
                </button>
              );
            })()}
          </div>
        </div>

        <div className="results">
          <div className="result-item"><span className="result-label">Total Trabalhado</span><span className="result-value">{currentResults.totalWorked}</span></div>
          
          {currentResults.firstEntryMins !== -1 && (
            <div className="result-item" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '8px' }}>
              <span className="result-label">Sugestão de Saída</span>
              <span className="result-value">
                {minutesToHHMM(currentResults.firstEntryMins + timeToMinutes(dailyGoal) + currentResults.totalBreakMins)}
              </span>
            </div>
          )}

          <div className="result-item"><span className="result-label">Saldo do Dia</span><span className={`result-value ${currentResults.isOvertime ? "overtime" : "missing"}`}>{currentResults.isOvertime ? "+" : "-"}{currentResults.overtime}</span></div>
        </div>
      </div>
    </div>
  );
}
