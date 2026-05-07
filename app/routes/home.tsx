import { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Plus,
  ArrowRight,
  Loader2
} from "lucide-react";
import { useLoaderData, useFetcher, useRevalidator } from "react-router";
import { timeToMinutes, minutesToTime } from "../utils/time";
import { db } from "../db.server";
import { requireUserId, getUser } from "../session.server";

export async function loader({ request }: { request: Request }) {
  const userId = await requireUserId(request);
  const user = await getUser(request);

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

  const record = db.prepare("SELECT * FROM PunchRecord WHERE userId = ? AND date = ?").get(userId, dateStr) as any;

  return {
    user,
    initialPunches: record ? JSON.parse(record.punches) : [],
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

  // Manual Upsert for SQLite
  const existing = db.prepare("SELECT id FROM PunchRecord WHERE userId = ? AND date = ?").get(userId, date);
  if (existing) {
    db.prepare(
      "UPDATE PunchRecord SET punches = ?, workMins = ?, diffMins = ?, isOvertime = ? WHERE userId = ? AND date = ?"
    ).run(punches, workMins, diffMins, isOvertime, userId, date);
  } else {
    db.prepare(
      "INSERT INTO PunchRecord (id, userId, date, punches, workMins, diffMins, isOvertime) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(crypto.randomUUID(), userId, date, punches, workMins, diffMins, isOvertime);
  }

  return { success: true };
}

export default function Home() {
  const { user, initialPunches, dateStr } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const syncFetcher = useFetcher();

  const goal = (user as any)?.goal || "08:00";
  const [punches, setPunches] = useState<string[]>(initialPunches);

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

  // Atualiza os punches quando os dados do loader OU do syncFetcher chegam
  useEffect(() => {
    if (fetcher.state === "idle") {
      const newData = syncFetcher.data as any;
      if (newData?.initialPunches) {
        setPunches(newData.initialPunches);
      } else {
        setPunches(initialPunches);
      }
    }
  }, [initialPunches, syncFetcher.data, fetcher.state]);

  // Debounce para salvar: evita atropelar a digitação do usuário
  useEffect(() => {
    const isDifferent = JSON.stringify(punches) !== JSON.stringify(initialPunches);
    if (isDifferent) {
      const timer = setTimeout(() => {
        savePunches(punches);
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [punches]);

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
    const diffMins = totalMins - timeToMinutes(goal);
    return {
      totalWorked: minutesToTime(totalMins),
      overtime: minutesToTime(Math.abs(diffMins)),
      isOvertime: diffMins >= 0,
      workMins: totalMins,
      diffMins
    };
  }, [punches, goal]);

  const savePunches = (newPunches: string[]) => {
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
    const diffMins = totalMins - timeToMinutes(goal);

    fetcher.submit(
      {
        date: dateStr,
        punches: JSON.stringify(newPunches),
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
        <div className="punches-section" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <label style={{ margin: 0 }}>Linha do Tempo</label>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {fetcher.state !== "idle" ? <Loader2 size={12} className="animate-spin" /> : `${punches.filter(p => p !== "").length} batidas hoje`}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {punches.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--glass-border)', borderRadius: '20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Nenhuma batida registrada hoje.
              </div>
            )}

            {Array.from({ length: Math.ceil(punches.length / 2) }).map((_, pairIndex) => {
              const entryIdx = pairIndex * 2;
              const exitIdx = entryIdx + 1;
              const entryVal = punches[entryIdx];
              const exitVal = punches[exitIdx];

              let isInvalid = false;
              let errorMessage = "";
              // Só valida quando ambos os campos estão completamente preenchidos (HH:MM = 5 chars)
              const entryComplete = entryVal?.length === 5;
              const exitComplete = exitVal?.length === 5;
              if (entryComplete && exitComplete) {
                const s = timeToMinutes(entryVal); const e = timeToMinutes(exitVal);
                if (e < s) { isInvalid = true; errorMessage = "Saída antes da entrada"; }
                if (pairIndex > 0) {
                  const prevS = timeToMinutes(punches[(pairIndex - 1) * 2]);
                  if (s < prevS) { isInvalid = true; errorMessage = "Fora de ordem"; }
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
                          // Extrai só dígitos e re-formata: "0800" → "08:00", "08" → "08"
                          const digits = e.target.value.replace(/[^0-9]/g, "");
                          const v = digits.length > 2
                            ? digits.slice(0, 2) + ":" + digits.slice(2, 4)
                            : digits;
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
                          const v = digits.length > 2
                            ? digits.slice(0, 2) + ":" + digits.slice(2, 4)
                            : digits;
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
            })}
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
            {/* CORREÇÃO: "Registro Manual" agora apenas adiciona campos na interface sem salvar no banco */}
            <button
              className="btn-register"
              onClick={() => setPunches(prev => [...prev, "", ""])}
              style={{ padding: '14px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', boxShadow: 'none', color: 'var(--text-muted)' }}
            >
              <Plus size={16} style={{ marginRight: '8px' }} /> Registro Manual
            </button>
          </div>
        </div>

        <div className="results">
          <div className="result-item"><span className="result-label">Total Trabalhado</span><span className="result-value">{currentResults.totalWorked}</span></div>
          <div className="result-item"><span className="result-label">Saldo do Dia</span><span className={`result-value ${currentResults.isOvertime ? "overtime" : "missing"}`}>{currentResults.isOvertime ? "+" : "-"}{currentResults.overtime}</span></div>
        </div>
      </div>
    </div>
  );
}
