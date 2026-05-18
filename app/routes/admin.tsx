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
import { Modal } from "../components/Modal";
import { CalendarGrid } from "../components/CalendarGrid";
import { WeeklyScheduleList } from "../components/WeeklyScheduleList";
import { MonthNavigator } from "../components/MonthNavigator";
import { db } from "../db.server";
import "../styles/calendar.css";
import "../styles/admin.css";
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
  const selectedManagerTeamId = url.searchParams.get("teamFilter") || null;

  // Admins e Managers (via UserTeam) podem acessar
  const isAdmin = user.role === "admin";
  const managerTeams = (user.userTeams || []).filter((ut: any) => ut.role === 'manager');
  const isManager = managerTeams.length > 0;

  if (!isAdmin && !isManager) {
    throw new Response("Acesso negado", { status: 403 });
  }

  // Se for Admin e pedir visão de equipe, ou se for Manager (que sempre vê equipe)
  const isTeamView = isAdmin ? (viewParam === "team") : true;

  let employeesQuery = `
    SELECT u.id, u.name, u.role, u.avatarUrl, u.teamId, t.name as teamName 
    FROM User u 
    LEFT JOIN Team t ON u.teamId = t.id
  `;
  let recordsQuery = "SELECT * FROM PunchRecord";
  let params: any[] = [];
  let teamName = "Geral";

  const activeTeamId = selectedManagerTeamId || managerTeams[0]?.teamId || user.teamId || (user.userTeams || [])[0]?.teamId || null;

  if (isAdmin) {
    // Admin em visão global: sem filtro, sempre traz todos
  } else if (activeTeamId) {
    // Visão de equipe (Manager com equipe selecionada)
    employeesQuery = `
      SELECT DISTINCT u.id, u.name, u.role, u.avatarUrl, u.teamId, t.name as teamName
      FROM User u
      LEFT JOIN UserTeam ut ON u.id = ut.userId
      LEFT JOIN Team t ON ut.teamId = t.id OR u.teamId = t.id
      WHERE ut.teamId = ? OR u.teamId = ?
    `;
    recordsQuery = `
      SELECT DISTINCT r.* FROM PunchRecord r
      JOIN User u ON r.userId = u.id
      LEFT JOIN UserTeam ut ON r.userId = ut.userId
      WHERE ut.teamId = ? OR u.teamId = ?
    `;
    params = [activeTeamId, activeTeamId];
    const team = db.prepare("SELECT name FROM Team WHERE id = ?").get(activeTeamId) as any;
    teamName = team?.name || "Equipe";
  } else {
    // Manager sem nenhuma equipe vinculada
    employeesQuery += " WHERE 1=0";
    recordsQuery += " WHERE 1=0";
    teamName = "Sem Equipe";
  }

  const employees = db.prepare(employeesQuery).all(...params) as any[];

  // Attach userTeams
  const allUserTeams = db.prepare(`
    SELECT ut.userId, ut.teamId, ut.role, t.name as teamName
    FROM UserTeam ut
    JOIN Team t ON ut.teamId = t.id
  `).all() as any[];
  
  const userTeamsMap: Record<string, any[]> = {};
  for (const link of allUserTeams) {
    if (!userTeamsMap[link.userId]) userTeamsMap[link.userId] = [];
    userTeamsMap[link.userId].push(link);
  }

  employees.forEach(emp => {
    emp.userTeams = userTeamsMap[emp.id] || [];
  });

  const allRecords = db.prepare(recordsQuery).all(...params) as any[];

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
  const activeManagerTeamId = isManager ? (selectedManagerTeamId || managerTeams[0]?.teamId || null) : null;

  return { user, employees, historyData, teamName, teams, managerTeams, isManager, isAdmin, activeManagerTeamId };
}

export default function Admin() {
  const { user, employees, historyData, teamName, teams, managerTeams, isManager, isAdmin, activeManagerTeamId } = useLoaderData<typeof loader>();

  const userFirstTeamId = user.teamId || (user.userTeams && user.userTeams.length > 0 ? user.userTeams[0].teamId : null) || "todos";
  const [selectedTeamId, setSelectedTeamId] = useState<string>(isAdmin ? userFirstTeamId : "todos");
  const [selectedUserId, setSelectedUserId] = useState<string>("todos");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeamBalanceModalOpen, setIsTeamBalanceModalOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<'grid' | 'list'>('grid');

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setIsModalOpen(true);
  };

  const filteredEmployees = useMemo(() => {
    if (selectedTeamId === "todos") return employees;
    return employees.filter(emp => 
      emp.teamId === selectedTeamId || 
      (emp.userTeams && emp.userTeams.some((ut: any) => ut.teamId === selectedTeamId))
    );
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
            <MonthNavigator currentDate={currentDate} onChangeMonth={changeMonth} />
          </div>

          <div className="header-row-2">
            <div className="toggles-group" style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
              <div className="toggle-container-new">
                <button
                  onClick={() => setCalendarView('grid')}
                  className={`view-toggle-new ${calendarView === 'grid' ? 'active' : ''}`}
                >Grade</button>
                <button
                  onClick={() => setCalendarView('list')}
                  className={`view-toggle-new ${calendarView === 'list' ? 'active' : ''}`}
                >Detalhado</button>
              </div>
            </div>
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
          <div className="filters-grid-new">
            {(isAdmin || managerTeams.length > 0) && (
              <div className="input-group" style={{ marginBottom: 0 }}>
                <div className="label-container">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={12} /> Filtrar Equipe
                  </label>
                </div>
                {isAdmin ? (
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
                ) : (
                  <select
                    value={activeManagerTeamId || managerTeams[0]?.teamId}
                    onChange={(e) => {
                      window.location.href = `/admin?teamFilter=${e.target.value}`;
                    }}
                    className="custom-select"
                  >
                    {managerTeams.map((mt: any) => (
                      <option key={mt.teamId} value={mt.teamId}>{mt.teamName}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

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
            <div className="balance-mini-left" style={{ marginTop: '16px' }}>
              <span className="label">Saldo do Mês:</span>
              <span className={`value ${selectedUserBalances.monthly >= 0 ? 'overtime' : 'missing'}`}>
                {minutesToHHMM(Math.abs(selectedUserBalances.monthly))}
              </span>
            </div>
          )}
        </div>

        {calendarView === 'grid' ? (
          <CalendarGrid
            currentDate={currentDate}
            selectedDateStr={selectedDateStr}
            isModalOpen={isModalOpen}
            onDayClick={handleDayClick}
            renderDay={(d, isSelected) => {
              const recCount = recordCount(d.dateStr);
              return (
                <div className={`calendar-day ${isSelected ? 'selected' : ''}`}>
                  {d.day}
                  {selectedUserId === "todos" ? (
                    recCount > 0 && (
                      <div className="scheduled-avatars-new">
                        {filteredEmployees
                          .filter(emp => (historyData[emp.id] || []).some(h => h.date === d.dateStr))
                          .slice(0, 2)
                          .map((emp, idx) => (
                            <div key={idx} className="avatar-mini-new">
                              {emp.avatarUrl ? (
                                <img src={emp.avatarUrl} alt="" />
                              ) : (
                                <UserIcon size={10} color="white" />
                              )}
                            </div>
                          ))}
                        {recCount > 2 && (
                          <div className="avatar-more-new">
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
            }}
          />
        ) : (
          <WeeklyScheduleList
            currentDate={currentDate}
            onDayClick={handleDayClick}
            renderRowContent={(wd) => {
              const dayGlobalRecords = filteredEmployees.map(emp => {
                const record = (historyData[emp.id] || []).find(h => h.date === wd.dateStr);
                return record ? { emp, record } : null;
              }).filter(r => r !== null) as { emp: any, record: SavedDay }[];

              return selectedUserId === "todos" ? (
                dayGlobalRecords.length > 0 ? (
                  <div className="team-day-summary">
                    <div className="scheduled-avatars-new" style={{ justifyContent: 'flex-start' }}>
                      {dayGlobalRecords.slice(0, 5).map((r, idx) => (
                        <div key={idx} className="avatar-mini-new" title={r.emp.name}>
                          {r.emp.avatarUrl ? (
                            <img src={r.emp.avatarUrl} alt="" />
                          ) : (
                            <UserIcon size={10} color="white" />
                          )}
                        </div>
                      ))}
                      {dayGlobalRecords.length > 5 && (
                        <div className="avatar-more-new">+{dayGlobalRecords.length - 5}</div>
                      )}
                    </div>
                    <span className="summary-text">
                      {dayGlobalRecords.length} colaborador{dayGlobalRecords.length > 1 ? 'es' : ''} registrou{dayGlobalRecords.length > 1 ? 'am' : ''} ponto
                    </span>
                  </div>
                ) : (
                  <span className="no-records-text">Sem registros</span>
                )
              ) : (
                dayGlobalRecords.some(r => r.emp.id === selectedUserId) ? (
                  dayGlobalRecords
                    .filter(r => r.emp.id === selectedUserId)
                    .map((r, idx) => (
                      <div key={idx} className="day-punches-wrapper">
                        {r.record.punches?.map((punch, pIdx) => {
                          if (pIdx % 2 !== 0) return null;
                          const start = punch;
                          const end = r.record.punches?.[pIdx + 1];

                          return (
                            <div key={pIdx} className="punch-card-mini">
                              <div className="punch-item">
                                <span className="p-label">Entrada</span>
                                <span className="p-time">{start}</span>
                              </div>
                              <div className="punch-arrow">→</div>
                              <div className="punch-item">
                                <span className="p-label">Saída</span>
                                <span className="p-time">{end || "--:--"}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                ) : (
                  <span className="no-records-text">Sem registros</span>
                )
              );
            }}
            renderRowSide={(wd) => {
              if (selectedUserId === "todos") return null;
              const dayGlobalRecords = filteredEmployees.map(emp => {
                const record = (historyData[emp.id] || []).find(h => h.date === wd.dateStr);
                return record ? { emp, record } : null;
              }).filter(r => r !== null) as { emp: any, record: SavedDay }[];

              const userRecord = dayGlobalRecords.find(r => r.emp.id === selectedUserId);
              if (!userRecord) return null;
              const dayBalance = userRecord.record.diffMins || 0;

              return (
                <div className={`day-balance-tag ${dayBalance >= 0 ? 'overtime' : 'missing'}`}>
                  {minutesToHHMM(Math.abs(dayBalance))}
                </div>
              );
            }}
          />
        )}
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
                        {record.data.diff}
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
                    {selectedDayUserData.diff}
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
            <div
              key={emp.id}
              className="team-balance-item clickable"
              onClick={() => {
                setSelectedUserId(emp.id);
                setCalendarView('list');
                setIsTeamBalanceModalOpen(false);
              }}
            >
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
    </div>
  );
}
