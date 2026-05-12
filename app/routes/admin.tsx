import { useState, useMemo } from "react";
import {
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Timer,
  TrendingDown,
  TrendingUp,
  Filter,
  Layers,
  Users,
  Calculator,
  Wallet
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
  const user = await getUser(request) as any;
  const url = new URL(request.url);
  const viewParam = url.searchParams.get("view") || "team";

  if (user.role !== "admin" && user.role !== "manager") {
    throw new Response("Acesso negado", { status: 403 });
  }

  // Se for Admin e pedir visão de equipe, ou se for Manager (que sempre vê equipe)
  const isTeamView = viewParam === "team" || user.role === "manager";

  let employeesQuery = `
    SELECT u.id, u.name, u.role, u.avatarUrl, u.teamId, t.name as teamName 
    FROM User u 
    LEFT JOIN Team t ON u.teamId = t.id
  `;
  let recordsQuery = "SELECT * FROM PunchRecord";
  let params: any[] = [];

  if (isTeamView && user.teamId) {
    employeesQuery += " WHERE u.teamId = ?";
    recordsQuery = "SELECT r.* FROM PunchRecord r JOIN User u ON r.userId = u.id WHERE u.teamId = ?";
    params = [user.teamId];
  }

  const employees = db.prepare(employeesQuery).all(...params) as any[];
  const allRecords = db.prepare(recordsQuery).all(...params) as any[];

  // Buscar nome da equipe se estiver na visão de equipe
  let teamName = "Geral";
  if (isTeamView && user.teamId) {
    const team = db.prepare("SELECT name FROM Team WHERE id = ?").get(user.teamId) as any;
    teamName = team?.name || "Equipe";
  }

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

  const teams = db.prepare("SELECT * FROM Team ORDER BY name").all() as any[];

  return { user, employees, historyData, teamName, isTeamView, teams };
}

export default function Admin() {
  const { user, employees, historyData, teamName, isTeamView, teams } = useLoaderData<typeof loader>();

  const [selectedTeamId, setSelectedTeamId] = useState<string>("todos");
  const [selectedUserId, setSelectedUserId] = useState<string>("todos");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeamBalanceModalOpen, setIsTeamBalanceModalOpen] = useState(false);

  const daysInMonth = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setIsModalOpen(true);
  };

  const filteredEmployees = useMemo(() => {
    if (selectedTeamId === "todos") return employees;
    return employees.filter(emp => emp.teamId === selectedTeamId);
  }, [employees, selectedTeamId]);

  const selectedDayGlobalData = useMemo(() => {
    if (selectedUserId !== "todos") return null;
    return filteredEmployees.map(emp => {
      const dayRecord = (historyData[emp.id] || []).find(h => h.date === selectedDateStr);
      return dayRecord ? { user: emp, data: dayRecord } : null;
    }).filter(r => r !== null) as { user: any, data: SavedDay }[];
  }, [selectedDateStr, selectedUserId, filteredEmployees, historyData]);

  const selectedDayUserData = useMemo(() => {
    if (selectedUserId === "todos") return null;
    return (historyData[selectedUserId] || []).find(h => h.date === selectedDateStr);
  }, [selectedDateStr, selectedUserId, historyData]);

  const recordCount = (dateStr: string) => {
    return filteredEmployees.filter(emp => (historyData[emp.id] || []).some(h => h.date === dateStr)).length;
  };

  const getBalances = (userId: string) => {
    const userRecords = historyData[userId] || [];
    const monthStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;

    const monthly = userRecords
      .filter(r => r.date.startsWith(monthStr))
      .reduce((acc, r) => acc + r.diffMins, 0);

    return { monthly };
  };

  const selectedUserBalances = useMemo(() => {
    if (selectedUserId === "todos") return null;
    return getBalances(selectedUserId);
  }, [selectedUserId, historyData, currentDate]);

  const teamBalances = useMemo(() => {
    return filteredEmployees.map(emp => ({
      ...emp,
      balances: getBalances(emp.id)
    })).sort((a, b) => b.balances.monthly - a.balances.monthly);
  }, [filteredEmployees, historyData, currentDate]);

  return (
    <div className="container">
      <div className="card">
        <div className="admin-header-new">
          <div className="header-row-1">
            <h1>Relatórios</h1>
            <div className="month-nav-new">
              <button className="icon-btn" onClick={() => changeMonth(-1)}><ChevronLeft size={18} /></button>
              <span className="month-label-new">
                {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <button className="icon-btn" onClick={() => changeMonth(1)}><ChevronRight size={18} /></button>
            </div>
          </div>

          <div className="header-row-2">
            {user.role === 'admin' && (
              <div className="toggle-container-new">
                <a href="/admin?view=global" className={`view-toggle-new ${!isTeamView ? 'active' : ''}`}>Global</a>
                <a href="/admin?view=team" className={`view-toggle-new ${isTeamView ? 'active' : ''}`}>Minha Equipe</a>
              </div>
            )}
            <button
              className="btn-saldos-new"
              onClick={() => setIsTeamBalanceModalOpen(true)}
            >
              <Wallet size={16} />
              <span>Saldos</span>
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          {!isTeamView ? (
            <>
              <div className="filters-grid-new">
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <div className="label-container">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={12} /> Filtrar Equipe
                    </label>
                  </div>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => {
                      setSelectedTeamId(e.target.value);
                      setSelectedUserId("todos");
                    }}
                    className="custom-select"
                  >
                    <option value="todos">Todas as Equipes</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <div className="label-container">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Filter size={12} /> Filtrar Colaborador
                    </label>
                  </div>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="custom-select"
                  >
                    <option value="todos">Todos</option>
                    {filteredEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {selectedUserId !== "todos" && selectedUserBalances && (
                <div className="balance-mini-left">
                  <span className="label">Saldo do Mês:</span>
                  <span className={`value ${selectedUserBalances.monthly >= 0 ? 'overtime' : 'missing'}`}>
                    {minutesToHHMM(Math.abs(selectedUserBalances.monthly))}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <div className="label-container">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Filter size={12} /> Filtrar Colaborador
                  </label>
                </div>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="custom-select"
                >
                  <option value="todos">Toda a Equipe</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              {selectedUserId !== "todos" && selectedUserBalances && (
                <div className="balance-mini-left">
                  <span className="label">Saldo do Mês:</span>
                  <span className={`value ${selectedUserBalances.monthly >= 0 ? 'overtime' : 'missing'}`}>
                    {minutesToHHMM(Math.abs(selectedUserBalances.monthly))}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Calendar Grid */}
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
                  recordCount(d.dateStr) > 0 && (
                    <div style={{
                      display: 'flex',
                      gap: '2px',
                      marginTop: '4px',
                      justifyContent: 'center',
                      flexWrap: 'wrap'
                    }}>
                      {filteredEmployees
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
                      {recordCount(d.dateStr) > 2 && (
                        <div style={{
                          fontSize: '0.55rem',
                          color: 'var(--text-muted)',
                          fontWeight: 'bold',
                          lineHeight: '16px'
                        }}>
                          +{recordCount(d.dateStr) - 2}
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
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {record.user.teamName || "Sem Equipe"}
                      </div>
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
              Ninguém registrou ponto neste dia para a equipe selecionada.
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

      {/* Modal de Saldos da Equipe */}
      <Modal
        isOpen={isTeamBalanceModalOpen}
        onClose={() => setIsTeamBalanceModalOpen(false)}
        title="Saldos da Equipe"
        icon={<Wallet size={20} style={{ color: 'var(--primary)' }} />}
        className="large"
      >
        <div className="team-balance-list">
          {teamBalances.map(emp => (
            <div key={emp.id} className="team-balance-item">
              <div className="emp-info">
                <div className="emp-avatar">
                  {emp.avatarUrl
                    ? <img src={emp.avatarUrl} alt="" />
                    : <UserIcon size={18} color="white" />
                  }
                </div>
                <div>
                  <div className="emp-name">{emp.name}</div>
                  <div className="emp-team">{emp.teamName || "Sem Equipe"}</div>
                </div>
              </div>
              <div className="emp-balances">
                <div className="balance-mini">
                  <span className="label">Saldo Mensal</span>
                  <span className={`value ${emp.balances.monthly >= 0 ? 'overtime' : 'missing'}`}>
                    {minutesToHHMM(Math.abs(emp.balances.monthly))}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <style dangerouslySetInnerHTML={{
        __html: `
        .admin-header-new {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 32px;
        }
        .header-row-1 {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header-row-2 {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .month-nav-new {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .month-label-new {
          font-weight: 700;
          text-transform: capitalize;
          min-width: 140px;
          text-align: center;
          font-size: 0.95rem;
        }
        .toggles-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .toggle-container-new {
          background: rgba(255, 255, 255, 0.03);
          padding: 4px;
          border-radius: 12px;
          display: flex;
          gap: 4px;
          border: 1px solid var(--glass-border);
        }
        .view-toggle-new {
          padding: 6px 14px;
          border-radius: 9px;
          font-size: 0.7rem;
          font-weight: 700;
          text-decoration: none;
          color: var(--text-muted);
          transition: all 0.2s;
        }
        .view-toggle-new.active {
          background: var(--primary);
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        .btn-saldos-new {
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.3);
          color: #a5b4fc;
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .btn-saldos-new:hover {
          background: var(--primary);
          color: white;
          transform: translateY(-1px);
        }
        .balance-mini-left {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          margin-top: 10px;
        }
        .balance-mini-left .label {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 600;
        }
        .balance-mini-left .value {
          font-size: 1rem;
          font-weight: 800;
        }

        @media (max-width: 600px) {
          .header-row-1 {
            flex-direction: row;
            justify-content: space-between;
          }
          .header-row-2 {
            flex-direction: column;
            align-items: stretch;
          }
          .toggles-group {
            justify-content: space-between;
          }
          .toggle-container-new {
            flex: 1;
          }
          .view-toggle-new {
            flex: 1;
            text-align: center;
          }
          .compact-balance-new {
            justify-content: center;
          }
          .month-label-new {
            min-width: 110px;
            font-size: 0.85rem;
          }
          h1 {
            font-size: 1.4rem;
          }
        }
        .custom-select {
          width: 100%;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          padding: 12px 16px;
          color: white;
          font-size: 0.9rem;
          appearance: none;
          cursor: pointer;
          outline: none;
          transition: all 0.2s;
        }
        .custom-select:focus {
          border-color: var(--primary);
          background: rgba(0, 0, 0, 0.4);
        }

        .filters-grid-new {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 600px) {
          .filters-grid-new {
            grid-template-columns: 1fr;
          }
        }

        .team-balance-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .team-balance-item {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .emp-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .emp-avatar {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .emp-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .emp-name {
          font-weight: 700;
          font-size: 0.9rem;
        }
        .emp-team {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .emp-balances {
          display: flex;
          gap: 16px;
        }
        .balance-mini {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }
        .balance-mini .label {
          font-size: 0.55rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .balance-mini .value {
          font-size: 0.85rem;
          font-weight: 700;
        }
      `}} />
    </div>
  );
}
