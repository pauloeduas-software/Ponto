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
  Loader2
} from "lucide-react";
import { useLoaderData, useFetcher } from "react-router";
import { type SavedDay } from "../types";
import { minutesToTime, timeToMinutes } from "../utils/time";
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
    isOvertime: r.isOvertime === 1,
    worked: minutesToTime(r.workMins),
    diff: minutesToTime(Math.abs(r.diffMins))
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

  return null;
}

export default function Dashboard() {
  const { user, history } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editPunches, setEditPunches] = useState<string[]>([]);

  const daysInMonth = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

  const monthStats = useMemo(() => {
    const monthStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
    const filtered = history.filter(h => h.date.startsWith(monthStr));
    const totalMins = filtered.reduce((acc, h) => acc + h.workMins, 0);
    const totalDiff = filtered.reduce((acc, h) => acc + h.diffMins, 0);
    return {
      worked: minutesToTime(totalMins),
      balance: minutesToTime(Math.abs(totalDiff)),
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

  const handleSaveEdit = () => {
    const goalMins = timeToMinutes((user as any)?.goal || "08:00");
    let totalMins = 0;
    let lastEntryMins = -1;
    for (let i = 0; i < editPunches.length; i += 2) {
      if (editPunches[i] && editPunches[i+1]) {
        const start = timeToMinutes(editPunches[i]); const end = timeToMinutes(editPunches[i+1]);
        if (start >= lastEntryMins && end >= start) { totalMins += (end - start); lastEntryMins = start; }
      }
    }
    const diffMins = totalMins - goalMins;

    fetcher.submit(
      {
        _action: "save",
        date: selectedDateStr,
        punches: JSON.stringify(editPunches),
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
            const isToday = d.dateStr === new Date().toISOString().split('T')[0];
            return (
              <div key={d.dateStr} className={`calendar-day ${isSelected && isModalOpen ? 'selected' : ''} ${isToday ? 'today' : ''}`} onClick={() => handleDayClick(d.dateStr)}>
                {d.day}
                {hasData && <div className={`day-indicator ${hasData.isOvertime ? 'positive' : 'negative'}`} />}
              </div>
            );
          })}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} icon={<CalendarIcon size={20} style={{color: 'var(--primary)'}} />}>
        <div className="details-grid" style={{gridTemplateColumns: '1fr', gap: '16px'}}>
          {isEditing ? (
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                {Array.from({ length: Math.ceil(editPunches.length / 2) }).map((_, i) => {
                  const sVal = editPunches[i * 2]; const eVal = editPunches[i * 2 + 1];
                  let isInv = false;
                  if (sVal && eVal) {
                    const s = timeToMinutes(sVal); const e = timeToMinutes(eVal);
                    if (e < s) isInv = true;
                    if (i > 0) { const ps = timeToMinutes(editPunches[(i-1)*2]); if (s < ps) isInv = true; }
                  }
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="grid-2" style={{ flex: 1, alignItems: 'center', border: isInv ? '1px solid #ff4444' : 'none', padding: isInv ? '8px' : '0', borderRadius: '8px', background: isInv ? 'rgba(255,68,68,0.05)' : 'transparent' }}>
                        <input type="time" value={sVal} onChange={e => { const np = [...editPunches]; np[i * 2] = e.target.value; setEditPunches(np); }} style={{borderColor: isInv ? '#ff4444' : ''}} />
                        <input type="time" value={eVal || ""} onChange={e => { const np = [...editPunches]; if (i * 2 + 1 < np.length) np[i * 2 + 1] = e.target.value; else np.push(e.target.value); setEditPunches(np); }} style={{borderColor: isInv ? '#ff4444' : ''}} />
                      </div>
                      <button 
                        onClick={() => {
                          const np = [...editPunches];
                          np.splice(i * 2, 2);
                          setEditPunches(np);
                        }}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: 'none',
                          color: '#f87171',
                          padding: '8px',
                          borderRadius: '10px',
                          cursor: 'pointer'
                        }}
                        title="Remover este período"
                      >
                        <Plus size={14} style={{ transform: 'rotate(45deg)' }} />
                      </button>
                    </div>
                  );
                })}
                <button className="btn-add" onClick={() => setEditPunches([...editPunches, "", ""])} style={{padding: '8px'}}><Plus size={14} /> Adicionar Período</button>
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
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                <div className="info-box"><span className="info-label"><Timer size={12} /> Trabalhado</span><span className="info-value">{selectedDayData.worked}</span></div>
                <div className="info-box"><span className="info-label">{selectedDayData.isOvertime ? <TrendingUp size={12} /> : <TrendingDown size={12} />} Saldo</span><span className={`info-value ${selectedDayData.isOvertime ? "overtime" : "missing"}`}>{selectedDayData.isOvertime ? "+" : "-"}{selectedDayData.diff}</span></div>
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
