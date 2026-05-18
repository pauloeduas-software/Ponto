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
import { CalendarVertical } from "../components/CalendarVertical";
import { MonthSelector } from "../components/MonthSelector";
import { AvatarGroup } from "../components/AvatarGroup";
import { Avatar } from "../components/Avatar";
import { DayInfo } from "../components/DayInfo";
import "../styles/calendar.css";
import "../styles/admin.css";
import { requireUserId, getUser } from "../session.server";
import { type SavedDay } from "../types";
import { getAdminData } from "../services/adminService.server";

// Dados do admin são somente-leitura nessa rota: só rebusca ao navegar para ela
export const shouldRevalidate: ShouldRevalidateFunction = ({ currentUrl, nextUrl }) => {
  return currentUrl.pathname !== nextUrl.pathname;
};

export async function loader({ request }: { request: Request }) {
  await requireUserId(request);
  const user = await getUser(request) as any;
  const url = new URL(request.url);
  const selectedManagerTeamId = url.searchParams.get("teamFilter") || null;
  return getAdminData(user, selectedManagerTeamId);
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
            <MonthSelector currentDate={currentDate} onChangeMonth={changeMonth} />
          </div>

          <div className="header-row-2">
            <div className="toggles-group admin-header-actions">
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

        <div className="filters-wrapper-new">
          <div className="filters-grid-new">
            {(isAdmin || managerTeams.length > 0) && (
              <div className="input-group input-group-no-margin">
                <div className="label-container">
                  <label className="label-icon-flex">
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

            <div className="input-group input-group-no-margin">
              <div className="label-container">
                <label className="label-icon-flex">
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
            <div className="balance-mini-left balance-left-spaced">
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
                      <AvatarGroup
                        users={filteredEmployees.filter(emp => (historyData[emp.id] || []).some(h => h.date === d.dateStr))}
                        max={3}
                        size={22}
                      />
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
          <CalendarVertical
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
                    <AvatarGroup
                      users={dayGlobalRecords.map(r => r.emp)}
                      max={5}
                      size={24}
                      className="avatar-stack-left-aligned"
                    />
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
            <div className="history-list admin-history-scroll">
              {selectedDayGlobalData.map(record => (
                <div key={record.user.id} className="admin-history-card">
                  {/* Cabeçalho do funcionário */}
                  <div className="admin-history-card-header">
                    <Avatar
                      src={record.user.avatarUrl}
                      name={record.user.name}
                      size={40}
                      className="admin-history-avatar"
                    />
                    <div className="emp-details">
                      <div className="emp-details-name">{record.user.name}</div>
                      <div className="emp-details-sub">
                        {record.user.teamName || "Sem Equipe"}
                      </div>
                    </div>
                  </div>

                  {/* Batidas do dia */}
                  <div className="admin-summary-punches">
                    {record.data.punches && record.data.punches.length > 0
                      ? Array.from({ length: Math.ceil((record.data.punches as string[]).length / 2) }).map((_, i) => (
                        <div
                          key={i}
                          className={`admin-summary-punch-row ${
                            i < Math.ceil((record.data.punches as string[]).length / 2) - 1 ? "has-border" : ""
                          }`}
                        >
                          <div className="admin-summary-col">
                            <span className="admin-summary-meta">Entrada</span>
                            <span className="admin-summary-time">{(record.data.punches as string[])[i * 2]}</span>
                          </div>
                          <div className="admin-summary-arrow">→</div>
                          <div className="admin-summary-col align-right">
                            <span className="admin-summary-meta">Saída</span>
                            <span className="admin-summary-time">{(record.data.punches as string[])[i * 2 + 1] || "--:--"}</span>
                          </div>
                        </div>
                      ))
                      : <span className="admin-summary-meta">Sem batidas registradas.</span>
                    }
                  </div>

                  {/* Totais */}
                  <div className="admin-summary-stats-grid">
                    <div className="info-box mini-info-box">
                      <span className="info-label">Meta</span>
                      <span className="info-value mini-info-value">{record.data.goal}</span>
                    </div>
                    <div className="info-box mini-info-box">
                      <span className="info-label">Trabalhado</span>
                      <span className="info-value mini-info-value">{record.data.worked}</span>
                    </div>
                    <div className="info-box mini-info-box">
                      <span className="info-label">Saldo</span>
                      <span className={`info-value mini-info-value ${record.data.isOvertime ? "overtime" : "missing"}`}>
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
            <DayInfo
              punches={selectedDayUserData.punches}
              worked={selectedDayUserData.worked}
              diff={selectedDayUserData.diff}
              isOvertime={selectedDayUserData.isOvertime}
              showGoal={false}
            />
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
                <Avatar src={emp.avatarUrl} name={emp.name} size={36} className="emp-avatar" />
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
