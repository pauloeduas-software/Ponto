import { useState, useMemo } from "react";
import { 
  User as UserIcon, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Timer,
  TrendingDown,
  TrendingUp,
  Filter
} from "lucide-react";
import { useLoaderData } from "react-router";
import type { ShouldRevalidateFunction } from "react-router";
import { minutesToHHMM } from "../utils/time";
import { getDaysInMonth } from "../utils/calendar";
import { Modal } from "../components/Modal";
import { db } from "../db.server";
import { requireUserId, getUser } from "../session.server";
import { type SavedDay } from "../types";

// Dados do admin são somente-leitura nessa rota: só rebusca ao navegar para ela
export const shouldRevalidate: ShouldRevalidateFunction = ({ currentUrl, nextUrl }) => {
  return currentUrl.pathname !== nextUrl.pathname;
};

export async function loader({ request }: { request: Request }) {
  await requireUserId(request);
  const user = await getUser(request);
  
  if ((user as any).role !== "admin") {
    throw new Response("Acesso negado", { status: 403 });
  }

  const employees = db.prepare("SELECT id, name, role, avatarUrl FROM User").all() as any[];
  const allRecords = db.prepare("SELECT * FROM PunchRecord").all() as any[];

  const historyData: Record<string, SavedDay[]> = {};
  allRecords.forEach(r => {
    if (!historyData[r.userId]) historyData[r.userId] = [];
    historyData[r.userId].push({
      date: r.date,
      punches: JSON.parse(r.punches),
      workMins: r.workMins,
      diffMins: r.diffMins,
      isOvertime: r.isOvertime === 1,
      goalMins: r.goalMins || 480,
      goal: minutesToHHMM(r.goalMins || 480),
      worked: minutesToHHMM(r.workMins),
      diff: minutesToHHMM(Math.abs(r.diffMins))
    });
  });

  return { user, employees, historyData };
}

export default function Admin() {
  const { user, employees, historyData } = useLoaderData<typeof loader>();
  
  const [selectedUserId, setSelectedUserId] = useState<string>("todos");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }));
  const [isModalOpen, setIsModalOpen] = useState(false);

  const daysInMonth = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setIsModalOpen(true);
  };

  const selectedDayGlobalData = useMemo(() => {
    if (selectedUserId !== "todos") return null;
    return employees.map(emp => {
      const dayRecord = (historyData[emp.id] || []).find(h => h.date === selectedDateStr);
      return dayRecord ? { user: emp, data: dayRecord } : null;
    }).filter(r => r !== null) as { user: any, data: SavedDay }[];
  }, [selectedDateStr, selectedUserId, historyData, employees]);

  const selectedDayUserData = useMemo(() => {
    if (selectedUserId === "todos") return null;
    return (historyData[selectedUserId] || []).find(h => h.date === selectedDateStr);
  }, [selectedDateStr, selectedUserId, historyData]);

  const recordCount = (dateStr: string) => {
    return employees.filter(emp => (historyData[emp.id] || []).some(h => h.date === dateStr)).length;
  };

  return (
    <div className="container">
      <div className="card">

        {/* Cabeçalho responsivo para mobile */}
        <div className="header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1>Visão Global</h1>
            <p className="subtitle">Espelhos da Equipe</p>
          </div>
          <div className="month-nav">
            <button className="icon-btn" onClick={() => changeMonth(-1)}><ChevronLeft size={18} /></button>
            <span style={{ fontWeight: '700', textTransform: 'capitalize', fontSize: '0.9rem' }}>
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <button className="icon-btn" onClick={() => changeMonth(1)}><ChevronRight size={18} /></button>
          </div>
        </div>

        {/* Filtro de Colaborador */}
        <div className="input-group" style={{ marginBottom: '20px' }}>
          <div className="label-container">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={12} /> Filtrar Colaborador
            </label>
          </div>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--glass-border)',
              borderRadius: '14px',
              padding: '12px 16px',
              color: 'white',
              fontSize: '1rem',
              appearance: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="todos">Todos (Visão Geral)</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>

        {/* Grade do Calendário */}
        <div className="calendar-grid">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="weekday-label">{d}</div>
          ))}
          {daysInMonth.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} className="calendar-day other-month" />;
            const isSelected = selectedDateStr === d.dateStr;
            const recCount = recordCount(d.dateStr);

            return (
              <div
                key={d.dateStr}
                className={`calendar-day ${isSelected && isModalOpen ? 'selected' : ''}`}
                onClick={() => handleDayClick(d.dateStr)}
              >
                {d.day}
                {selectedUserId === "todos" ? (
                  recCount > 0 && (
                    <div style={{
                      display: 'flex',
                      gap: '2px',
                      marginTop: '4px',
                      justifyContent: 'center',
                      flexWrap: 'wrap'
                    }}>
                      {/* Avatares compactos para não quebrar o grid no mobile */}
                      {employees
                        .filter(emp => (historyData[emp.id] || []).some(h => h.date === d.dateStr))
                        .slice(0, 2)
                        .map((emp, idx) => (
                          <div key={idx} style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '4px',
                            background: 'var(--primary)',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #0f172a',
                          }}>
                            {emp.avatarUrl
                              ? <img src={emp.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <UserIcon size={10} color="white" />
                            }
                          </div>
                        ))}
                      {recCount > 2 && (
                        <div style={{
                          fontSize: '0.55rem',
                          color: 'var(--text-muted)',
                          fontWeight: 'bold',
                          lineHeight: '16px'
                        }}>
                          +{recCount - 2}
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  (historyData[selectedUserId] || []).some(h => h.date === d.dateStr) && (
                    <div className={`day-indicator ${(historyData[selectedUserId] || []).find(h => h.date === d.dateStr)?.isOvertime ? 'positive' : 'negative'}`} />
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Detalhes do Dia */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        icon={<CalendarIcon size={20} style={{ color: 'var(--primary)' }} />}
        className="large"
      >
        {selectedUserId === "todos" ? (
          selectedDayGlobalData && selectedDayGlobalData.length > 0 ? (
            <div className="history-list" style={{ paddingRight: '4px' }}>
              {selectedDayGlobalData.map(record => (
                <div key={record.user.id} style={{
                  padding: '16px',
                  marginBottom: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '16px'
                }}>
                  {/* Cabeçalho do funcionário */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--primary)', overflow: 'hidden', flexShrink: 0
                    }}>
                      {record.user.avatarUrl
                        ? <img src={record.user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <UserIcon color="white" size={18} />
                      }
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{record.user.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Resumo de Ponto</div>
                    </div>
                  </div>

                  {/* Batidas do dia */}
                  <div style={{
                    padding: '10px 12px',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '10px',
                    marginBottom: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {record.data.punches && record.data.punches.length > 0
                      ? Array.from({ length: Math.ceil((record.data.punches as string[]).length / 2) }).map((_, i) => (
                        <div key={i} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: i < Math.ceil((record.data.punches as string[]).length / 2) - 1
                            ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          paddingBottom: '6px'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Entrada</span>
                            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{(record.data.punches as string[])[i * 2]}</span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>→</div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Saída</span>
                            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{(record.data.punches as string[])[i * 2 + 1] || "--:--"}</span>
                          </div>
                        </div>
                      ))
                      : <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sem batidas registradas.</span>
                    }
                  </div>

                  {/* Totais */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div className="info-box" style={{ padding: '10px' }}>
                      <span className="info-label">Meta</span>
                      <span className="info-value" style={{ fontSize: '0.8rem' }}>{record.data.goal}</span>
                    </div>
                    <div className="info-box" style={{ padding: '10px' }}>
                      <span className="info-label">Trabalhado</span>
                      <span className="info-value" style={{ fontSize: '0.8rem' }}>{record.data.worked}</span>
                    </div>
                    <div className="info-box" style={{ padding: '10px' }}>
                      <span className="info-label">Saldo</span>
                      <span className={`info-value ${record.data.isOvertime ? "overtime" : "missing"}`} style={{ fontSize: '0.8rem' }}>
                        {record.data.isOvertime ? "+" : "-"}{record.data.diff}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
              Ninguém registrou ponto neste dia.
            </p>
          )
        ) : (
          selectedDayUserData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Batidas do usuário selecionado */}
              <div className="info-box" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedDayUserData.punches && selectedDayUserData.punches.length > 0
                    ? Array.from({ length: Math.ceil(selectedDayUserData.punches.length / 2) }).map((_, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: i < Math.ceil((selectedDayUserData.punches as string[]).length / 2) - 1
                          ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        paddingBottom: '8px'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Entrada</span>
                          <span style={{ fontWeight: '700' }}>{(selectedDayUserData.punches as string[])[i * 2]}</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>→</div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Saída</span>
                          <span style={{ fontWeight: '700' }}>{(selectedDayUserData.punches as string[])[i * 2 + 1] || "--:--"}</span>
                        </div>
                      </div>
                    ))
                    : <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sem batidas.</span>
                  }
                </div>
              </div>

              {/* Totais */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="info-box">
                  <span className="info-label"><Timer size={12} /> Trabalhado</span>
                  <span className="info-value">{selectedDayUserData.worked}</span>
                </div>
                <div className="info-box">
                  <span className="info-label">
                    {selectedDayUserData.isOvertime ? <TrendingUp size={12} /> : <TrendingDown size={12} />} Saldo
                  </span>
                  <span className={`info-value ${selectedDayUserData.isOvertime ? "overtime" : "missing"}`}>
                    {selectedDayUserData.isOvertime ? "+" : "-"}{selectedDayUserData.diff}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              Sem registros.
            </p>
          )
        )}
      </Modal>
    </div>
  );
}
