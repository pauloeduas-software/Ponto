import { useState, useMemo } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Timer,
  TrendingDown,
  TrendingUp,
  Trash2,
  Edit3,
  Save,
  Plus,
  Loader2,
  Clock,
  ArrowRight
} from "lucide-react";
import { useLoaderData, useFetcher } from "react-router";
import { type SavedDay } from "../types";
import { minutesToTime, timeToMinutes, minutesToHHMM } from "../utils/time";
import { getDaysInMonth } from "../utils/calendar";
import { Modal } from "../components/Modal";
import { StatCard } from "../components/StatCard";
import { db } from "../db.server";
import { requireUserId, getUser } from "../session.server";

export async function loader({ request }: { request: Request }) {
  const userId = await requireUserId(request);
  const user = await getUser(request);
  
  const records = db.prepare("SELECT * FROM PunchRecord WHERE userId = ? ORDER BY date DESC").all(userId) as any[];

  const history: SavedDay[] = records.map(r => ({
    date: r.date,
    punches: JSON.parse(r.punches),
    workMins: r.workMins,
    diffMins: r.diffMins,
    goalMins: r.goalMins || 480,
    goal: minutesToHHMM(r.goalMins || 480),
    isOvertime: r.isOvertime === 1,
    worked: minutesToHHMM(r.workMins),
    diff: minutesToHHMM(Math.abs(r.diffMins))
  }));

  return { user, history };
}

export async function action({ request }: { request: Request }) {
  const userId = await requireUserId(request);
  const user = await getUser(request);
  if (!user) return { error: "Usuário não encontrado" };

  const formData = await request.formData();
  const actionType = formData.get("_action");
  const date = formData.get("date") as string;

  if (actionType === "delete") {
    db.prepare("DELETE FROM PunchRecord WHERE userId = ? AND date = ?").run(userId, date);
    return { success: true };
  }

  if (actionType === "save") {
    const punches = formData.get("punches") as string;
    const workMins = parseInt(formData.get("workMins") as string);
    const diffMins = parseInt(formData.get("diffMins") as string);
    const isOvertime = formData.get("isOvertime") === "true" ? 1 : 0;
    const goal = formData.get("goal") as string;
    const goalMins = timeToMinutes(goal);

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
    return { success: true };
  }

  return null;
}

export default function Dashboard() {
  const { user, history } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editPunches, setEditPunches] = useState<string[]>([]);
  const [editGoal, setEditGoal] = useState("08:00");

  const daysInMonth = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

  const monthStats = useMemo(() => {
    const monthStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
    const filtered = history.filter(h => h.date.startsWith(monthStr));
    const totalMins = filtered.reduce((acc, h) => acc + h.workMins, 0);
    const totalDiff = filtered.reduce((acc, h) => acc + h.diffMins, 0);
    return {
      worked: minutesToHHMM(totalMins),
      balance: minutesToHHMM(Math.abs(totalDiff)),
      isPositive: totalDiff >= 0,
      count: filtered.length
    };
  }, [history, currentDate]);

  const selectedDayData = useMemo(() => history.find(h => h.date === selectedDateStr), [history, selectedDateStr]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setIsModalOpen(true);
    setIsEditing(false);
  };

  const updatePunch = (index: number, value: string) => {
    let newPunches = [...editPunches];
    newPunches[index] = value;
    
    // Cascata: Se apagar um valor, limpa tudo que vem DEPOIS dele
    if (value === "") {
      newPunches = newPunches.slice(0, index + 1);
    }
    
    setEditPunches(newPunches);
  };

  const handleSaveEdit = () => {
    // Limpa batidas vazias no final antes de salvar
    let cleanedPunches = [...editPunches];
    while (cleanedPunches.length > 0 && cleanedPunches[cleanedPunches.length - 1] === "") {
      cleanedPunches.pop();
    }

    const goalMins = timeToMinutes(editGoal);
    let totalMins = 0;
    let lastEntryMins = -1;
    for (let i = 0; i < cleanedPunches.length; i += 2) {
      if (cleanedPunches[i] && cleanedPunches[i+1]) {
        const start = timeToMinutes(cleanedPunches[i]); const end = timeToMinutes(cleanedPunches[i+1]);
        if (start >= lastEntryMins && end >= start) { totalMins += (end - start); lastEntryMins = start; }
      }
    }
    const diffMins = totalMins - goalMins;

    fetcher.submit(
      {
        _action: "save",
        date: selectedDateStr,
        punches: JSON.stringify(cleanedPunches),
        goal: editGoal,
        workMins: totalMins.toString(),
        diffMins: diffMins.toString(),
        isOvertime: (diffMins >= 0).toString()
      },
      { method: "post" }
    );
    setIsEditing(false);
  };

  const startEditing = () => {
    setEditPunches(selectedDayData ? [...(selectedDayData.punches || [])] : ["", ""]);
    setEditGoal(selectedDayData?.goal || (user as any).goal || "08:00");
    setIsEditing(true);
  };

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <div>
            <h1>Histórico de Ponto</h1>
            <p className="subtitle">Relatório de {(user as any)?.name}</p>
          </div>
          <div className="month-nav">
            <button className="icon-btn" onClick={() => changeMonth(-1)}><ChevronLeft size={18} /></button>
            <span style={{fontWeight: '700', textTransform: 'capitalize'}}>
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <button className="icon-btn" onClick={() => changeMonth(1)}><ChevronRight size={18} /></button>
          </div>
        </div>

        <div className="stats-grid">
          <StatCard label="Total no Mês" value={monthStats.worked} subValue={`${monthStats.count} dias registrados`} />
          <StatCard label="Saldo Acumulado" value={monthStats.balance} isPositive={monthStats.isPositive} type="balance" subValue="Extra / Devedor" />
        </div>

        <div className="calendar-grid">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="weekday-label">{d}</div>
          ))}
          {daysInMonth.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} className="calendar-day other-month" />;
            const hasData = history.find(h => h.date === d.dateStr);
            const isSelected = selectedDateStr === d.dateStr;
            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
            const isToday = d.dateStr === today;
            return (
              <div key={d.dateStr} className={`calendar-day ${isSelected && isModalOpen ? 'selected' : ''} ${isToday ? 'today' : ''}`} onClick={() => handleDayClick(d.dateStr)}>
                {d.day}
                {hasData && <div className={`day-indicator ${hasData.isOvertime ? 'positive' : 'negative'}`} />}
              </div>
            );
          })}
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} 
        icon={<CalendarIcon size={20} style={{color: 'var(--primary)'}} />}
        className="large"
      >
        <div className="details-grid" style={{gridTemplateColumns: '1fr', gap: '16px'}}>
          {isEditing ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                <div style={{ padding: '16px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>Meta deste Dia</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Alterar meta apenas para esta data</div>
                  </div>
                  <input type="time" value={editGoal} onChange={(e) => setEditGoal(e.target.value)} style={{ width: '100px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '6px 10px', color: 'white', fontWeight: '700', textAlign: 'center' }} />
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                {(() => {
                  const pairsToShow = Math.max(1, Math.ceil(editPunches.length / 2) + (editPunches.length > 0 && editPunches.length % 2 === 0 && editPunches[editPunches.length - 1] !== "" ? 1 : 0));
                  
                  return Array.from({ length: pairsToShow }).map((_, i) => {
                    const sIdx = i * 2;
                    const eIdx = sIdx + 1;
                    const sVal = editPunches[sIdx]; 
                    const eVal = editPunches[eIdx];
                    
                    let isInv = false;
                    let errorMsg = "";
                    
                    const sMins = sVal?.length === 5 ? timeToMinutes(sVal) : -1;
                    const eMins = eVal?.length === 5 ? timeToMinutes(eVal) : -1;

                    if (sMins !== -1 && eMins !== -1 && eMins <= sMins) {
                      isInv = true; errorMsg = "Saída ≤ Entrada";
                    }
                    if (!isInv && i > 0 && sMins !== -1) {
                      const pExit = editPunches[sIdx - 1];
                      const pMins = pExit?.length === 5 ? timeToMinutes(pExit) : -1;
                      if (pMins !== -1 && sMins <= pMins) { isInv = true; errorMsg = "Menor que anterior"; }
                    }

                    return (
                      <div key={i} style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '16px', position: 'relative',
                        background: isInv ? 'rgba(255, 68, 68, 0.05)' : 'rgba(255,255,255,0.03)',
                        border: isInv ? '1px solid #ff4444' : '1px solid var(--glass-border)',
                      }}>
                        {isInv && (
                          <span style={{ position: 'absolute', top: '-8px', right: '12px', background: '#ff4444', color: 'white', fontSize: '0.6rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                            {errorMsg}
                          </span>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '4px' }}>
                          <label style={{ fontSize: '0.6rem', color: isInv ? '#ff4444' : 'var(--text-muted)' }}>Entrada</label>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="HH:MM"
                              value={sVal || ""}
                              maxLength={5}
                              onChange={e => {
                                const digits = e.target.value.replace(/[^0-9]/g, "");
                                let h = digits.slice(0, 2); let m = digits.slice(2, 4);
                                if (h.length === 2 && parseInt(h) > 23) h = "23";
                                if (m.length === 2 && parseInt(m) > 59) m = "59";
                                updatePunch(sIdx, digits.length > 2 ? h + ":" + m : h);
                              }}
                              style={{ borderColor: isInv ? '#ff4444' : '', textAlign: 'center', fontSize: '0.9rem' }}
                            />
                            {sVal && <button onClick={() => updatePunch(sIdx, "")} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#f87171', borderRadius: '6px', width: '24px', height: '24px', cursor: 'pointer' }}>✕</button>}
                          </div>
                        </div>
                        <ArrowRight size={12} style={{ marginTop: '16px', color: 'var(--text-muted)' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '4px' }}>
                          <label style={{ fontSize: '0.6rem', color: isInv ? '#ff4444' : 'var(--text-muted)' }}>Saída</label>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="HH:MM"
                              value={eVal || ""}
                              maxLength={5}
                              onChange={e => {
                                const digits = e.target.value.replace(/[^0-9]/g, "");
                                let h = digits.slice(0, 2); let m = digits.slice(2, 4);
                                if (h.length === 2 && parseInt(h) > 23) h = "23";
                                if (m.length === 2 && parseInt(m) > 59) m = "59";
                                updatePunch(eIdx, digits.length > 2 ? h + ":" + m : h);
                              }}
                              style={{ borderColor: isInv ? '#ff4444' : '', textAlign: 'center', fontSize: '0.9rem' }}
                            />
                            {eVal && <button onClick={() => updatePunch(eIdx, "")} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#f87171', borderRadius: '6px', width: '24px', height: '24px', cursor: 'pointer' }}>✕</button>}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                <button className="btn-register" onClick={handleSaveEdit}>{fetcher.state !== "idle" ? <Loader2 size={16} className="animate-spin" /> : "Salvar"}</button>
                <button className="btn-register" onClick={() => setIsEditing(false)} style={{background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', boxShadow: 'none'}}>Cancelar</button>
              </div>
            </div>
          ) : selectedDayData ? (
            <>
              <div className="info-box" style={{padding: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)'}}>
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  {selectedDayData.punches && selectedDayData.punches.length > 0 ? Array.from({ length: Math.ceil(selectedDayData.punches.length / 2) }).map((_, i) => (
                    <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < Math.ceil((selectedDayData.punches?.length || 0) / 2) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', paddingBottom: '8px'}}>
                      <div style={{display: 'flex', flexDirection: 'column'}}><span style={{fontSize: '0.65rem', color: 'var(--text-muted)'}}>Entrada</span><span style={{fontWeight: '700'}}>{selectedDayData.punches?.[i * 2]}</span></div>
                      <div style={{color: 'var(--text-muted)'}}>→</div>
                      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}><span style={{fontSize: '0.65rem', color: 'var(--text-muted)'}}>Saída</span><span style={{fontWeight: '700'}}>{selectedDayData.punches?.[i * 2 + 1] || "--:--"}</span></div>
                    </div>
                  )) : null}
                </div>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px'}}>
                <div className="info-box" style={{background: 'rgba(255,255,255,0.05)'}}><span className="info-label"><Clock size={12} /> Meta</span><span className="info-value" style={{fontSize: '0.9rem'}}>{selectedDayData.goal}</span></div>
                <div className="info-box"><span className="info-label"><Timer size={12} /> Trabalhado</span><span className="info-value" style={{fontSize: '0.9rem'}}>{selectedDayData.worked}</span></div>
                <div className="info-box"><span className="info-label">{selectedDayData.isOvertime ? <TrendingUp size={12} /> : <TrendingDown size={12} />} Saldo</span><span className={`info-value ${selectedDayData.isOvertime ? "overtime" : "missing"}`} style={{fontSize: '0.9rem'}}>{selectedDayData.isOvertime ? "+" : "-"}{selectedDayData.diff}</span></div>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px'}}>
                <button className="btn-register" onClick={startEditing} style={{padding: '14px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', boxShadow: 'none'}}><Edit3 size={16} /> Editar</button>
                <button className="btn-register" style={{padding: '14px', fontSize: '0.9rem', background: 'transparent', border: '1px dashed var(--error)', color: 'var(--error)', boxShadow: 'none'}} onClick={() => { if(confirm("Remover registro?")) { fetcher.submit({ _action: "delete", date: selectedDateStr }, { method: "post" }); setIsModalOpen(false); } }}><Trash2 size={16} /> Excluir</button>
              </div>
            </>
          ) : (
            <div style={{textAlign: 'center', padding: '40px 0'}}>
              <p style={{color: 'var(--text-muted)', marginBottom: '16px'}}>Sem registros.</p>
              <button className="btn-register" onClick={startEditing} style={{padding: '12px', fontSize: '0.9rem', width: 'auto', display: 'inline-flex', alignItems: 'center', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--primary)', boxShadow: 'none'}}><Plus size={16} style={{marginRight: '8px'}} /> Adicionar</button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
