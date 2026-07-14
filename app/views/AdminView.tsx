import { useMemo } from "react";
import { User as UserIcon, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Timer, TrendingDown, TrendingUp, Filter, Layers, Users, Calculator, Wallet } from "lucide-react";
import { useAdminView } from "../hooks/useAdminView";
import { useNavigate } from "react-router";
import { minutesToHHMM } from "../utils/time";
import { Modal } from "../components/Modal";
import { CalendarGrid } from "../components/CalendarGrid";
import { CalendarVertical } from "../components/CalendarVertical";
import { MonthSelector } from "../components/MonthSelector";
import { AvatarGroup } from "../components/AvatarGroup";
import { Avatar } from "../components/Avatar";
import { DayInfo } from "../components/DayInfo";
import { type SavedDay } from "../types";
import "../styles/calendar.css";
import "../styles/dashboard.css";
import "../styles/admin.css";

interface AdminViewProps {
  user: any;
  employees: any[];
  historyData: Record<string, SavedDay[]>;
  teamName: string | null;
  teams: any[];
  managerTeams: any[];
  isManager: boolean;
  isAdmin: boolean;
  activeManagerTeamId: string | null;
}

export function AdminView({
  user,
  employees,
  historyData,
  teamName,
  teams,
  managerTeams,
  isManager,
  isAdmin,
  activeManagerTeamId
}: AdminViewProps) {
  const navigate = useNavigate();

  const { state, actions, computed } = useAdminView(user, isAdmin, employees, historyData);

  const {
    selectedTeamId, selectedUserId, currentDate, selectedDateStr,
    isModalOpen, isTeamBalanceModalOpen, calendarView
  } = state;

  const {
    setSelectedTeamId, setSelectedUserId, setIsModalOpen,
    setIsTeamBalanceModalOpen, setCalendarView, changeMonth, handleDayClick
  } = actions;

  const {
    filteredEmployees, selectedDayGlobalData, selectedDayUserData,
    recordCount, selectedUserBalances, teamBalances
  } = computed;

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed
    const numDays = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: numDays }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dateObj = new Date(year, month, dayNum);
      const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', '');

      return {
        dateStr,
        dayNum,
        weekday,
      };
    });
  }, [currentDate]);

  return (
    <div className="page-shell">
      {/* Topbar: Title left, Actions right */}
      <div className="page-topbar">
        <div className="page-topbar-left">
          <h1 className="page-title">Relatórios</h1>
        </div>

        <div className="page-topbar-right">
          <MonthSelector currentDate={currentDate} onChangeMonth={changeMonth} />
          <button className="action-btn" onClick={() => setIsTeamBalanceModalOpen(true)}>
            <Wallet size={14} /> Saldos
          </button>
          {selectedUserId !== "todos" && (
            <a
              href={`/api/export-punches?month=${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}&userId=${selectedUserId}`}
              className="action-btn"
            >Exportar</a>
          )}
        </div>
      </div>

      {/* Subbar: Toggle & Filters left, Balance right */}
      <div className="page-subbar">
        <div className="page-subbar-left">
          <div className="subbar-toggle">
            <button
              onClick={() => setCalendarView('grid')}
              className={`subbar-toggle-btn ${calendarView === 'grid' ? 'active' : ''}`}
            >Grade</button>
            <button
              onClick={() => setCalendarView('list')}
              className={`subbar-toggle-btn ${calendarView === 'list' ? 'active' : ''}`}
            >Detalhado</button>
          </div>

          {(isAdmin || managerTeams.length > 0) && (
            <div className="subbar-filter">
              <span className="subbar-filter-label">Equipe</span>
              {isAdmin ? (
                <select
                  value={selectedTeamId}
                  onChange={(e) => { setSelectedTeamId(e.target.value); setSelectedUserId("todos"); }}
                >
                  <option value="todos">Todas</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              ) : (
                <select
                  value={activeManagerTeamId || managerTeams[0]?.teamId}
                  onChange={(e) => navigate(`/admin?teamFilter=${e.target.value}`)}
                >
                  {managerTeams.map((mt: any) => (
                    <option key={mt.teamId} value={mt.teamId}>{mt.teamName}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="subbar-filter">
            <span className="subbar-filter-label">Colaborador</span>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="todos">Todos</option>
              {filteredEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="page-subbar-right">
          {selectedUserId !== "todos" && selectedUserBalances && (
            <div className="subbar-balance">
              <span className="subbar-balance-label">Saldo do mês</span>
              <span className={`subbar-balance-value ${selectedUserBalances.monthly >= 0 ? 'overtime' : 'missing'}`}>
                {selectedUserBalances.monthly === 0 ? '00:00' : `${selectedUserBalances.monthly > 0 ? '+' : '-'}${minutesToHHMM(Math.abs(selectedUserBalances.monthly))}`}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="page-content">
        <div className="page-main">
          {calendarView === 'grid' ? (
            <CalendarGrid
              currentDate={currentDate}
              selectedDateStr={selectedDateStr}
              isModalOpen={isModalOpen}
              onDayClick={handleDayClick}
              renderDay={(d, isSelected, isWeekend) => {
                const recCount = recordCount(d.dateStr);
                return (
                  <div className={`calendar-day ${isSelected ? 'selected' : ''} ${isWeekend ? 'weekend' : ''}`}>
                    <span>{d.day}</span>
                    {selectedUserId === "todos" ? (
                      recCount > 0 && (
                        <AvatarGroup
                          users={filteredEmployees.filter(emp => (historyData[emp.id] || []).some(h => h.date === d.dateStr))}
                          max={typeof window !== 'undefined' && window.innerWidth < 600 ? 2 : 3}
                          size={32}
                        />
                      )
                    ) : (
                      <>
                        {(historyData[selectedUserId] || []).some(h => h.date === d.dateStr) && (
                          <div className={`day-indicator ${(historyData[selectedUserId] || []).find(h => h.date === d.dateStr)?.isOvertime ? 'positive' : 'negative'}`} />
                        )}
                        <span className="calendar-day-bottom-text">
                          {((historyData[selectedUserId] || []).find(h => h.date === d.dateStr))?.worked || ''}
                        </span>
                      </>
                    )}
                  </div>
                );
              }}
            />
          ) : (
            <div className="dashboard-table-wrapper">
              <table className="dashboard-history-table">
                <thead>
                  <tr>
                    <th>DATA</th>
                    <th>DIA</th>
                    {selectedUserId === "todos" ? (
                      <th colSpan={3}>RESUMO DA EQUIPE</th>
                    ) : (
                      <>
                        <th>MARCAÇÕES</th>
                        <th>TOTAL</th>
                        <th>SALDO</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>

                  {daysInMonth.map((d: any) => {
                    const formattedDate = String(d.dayNum).padStart(2, '0') + '/' + String(currentDate.getMonth() + 1).padStart(2, '0');

                    return (
                      <tr
                        key={d.dateStr}
                        onClick={() => handleDayClick(d.dateStr)}
                        className="dashboard-table-row-clickable"
                        title="Clique para detalhar os registros deste dia"
                      >
                        <td className="font-mono date-col">{formattedDate}</td>
                        <td className="weekday-col">{d.weekday}</td>

                        {selectedUserId === "todos" ? (
                          <td colSpan={3}>
                            {(() => {
                              const dayGlobalRecords = filteredEmployees.map(emp => {
                                const record = (historyData[emp.id] || []).find((h: SavedDay) => h.date === d.dateStr);
                                return record ? { emp, record } : null;
                              }).filter(r => r !== null) as { emp: any, record: SavedDay }[];

                              return dayGlobalRecords.length > 0 ? (
                                <div className="team-day-summary" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <AvatarGroup
                                    users={dayGlobalRecords.map(r => r.emp)}
                                    max={5}
                                    size={24}
                                    className="avatar-stack-left-aligned"
                                  />
                                  <span className="summary-text" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {dayGlobalRecords.length} colaborador{dayGlobalRecords.length > 1 ? 'es' : ''} registrou{dayGlobalRecords.length > 1 ? 'am' : ''} ponto
                                  </span>
                                </div>
                              ) : (
                                <span className="dashboard-table-no-records">Nenhum registro da equipe</span>
                              );
                            })()}
                          </td>
                        ) : (
                          <>
                            <td>
                              {(() => {
                                const userRecord = (historyData[selectedUserId] || []).find((h: SavedDay) => h.date === d.dateStr);
                                return userRecord ? (
                                  <div className="dashboard-table-punches-list">
                                    {userRecord.punches?.map((p: string, i: number) => (
                                      <span key={i} className="font-mono dashboard-table-punch-tag">
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="dashboard-table-no-records">Sem registros</span>
                                );
                              })()}
                            </td>
                            <td className="font-mono">
                              {(() => {
                                const userRecord = (historyData[selectedUserId] || []).find((h: SavedDay) => h.date === d.dateStr);
                                return userRecord?.worked || "--:--";
                              })()}
                            </td>
                            {(() => {
                              const userRecord = (historyData[selectedUserId] || []).find((h: SavedDay) => h.date === d.dateStr);
                              return (
                                <td className={`font-mono ${userRecord ? (userRecord.isOvertime ? 'overtime-text' : 'missing-text') : ''}`}>
                                  {userRecord?.diff || "--:--"}
                                </td>
                              );
                            })()}
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>

      {/* Modal de Detalhes do Dia */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        icon={<CalendarIcon size={20} color="var(--primary)" />}
        className="large"
      >
        {selectedUserId === "todos" ? (
          selectedDayGlobalData && selectedDayGlobalData.length > 0 ? (
            <div className="history-list admin-history-scroll">
              {selectedDayGlobalData.map(record => (
                <div key={record.user.id} className="admin-modal-record-item">
                  {/* Cabeçalho do funcionário + Totais (Lado a Lado) */}
                  <div className="admin-modal-record-header">
                    <div className="admin-history-card-header" style={{ marginBottom: 0 }}>
                      <Avatar
                        src={record.user.avatarUrl}
                        name={record.user.name}
                        size={36}
                        className="admin-history-avatar"
                      />
                      <div className="emp-details">
                        <div className="emp-details-name" style={{ fontSize: '0.9rem' }}>{record.user.name}</div>
                        <div className="emp-details-sub" style={{ fontSize: '0.7rem' }}>
                          {record.user.teamName || (record.user.userTeams && record.user.userTeams.length > 0 ? record.user.userTeams[0].teamName : "Sem Equipe")}
                        </div>
                      </div>
                    </div>

                    {/* Totais do funcionário do lado direito */}
                    <div className="admin-modal-stats-row">
                      <div className="admin-modal-stat-item">
                        <span className="stat-item-label">Meta</span>
                        <span className="stat-item-value">{record.data.goal}</span>
                      </div>
                      <div className="admin-modal-stat-item">
                        <span className="stat-item-label">Trabalhado</span>
                        <span className="stat-item-value">{record.data.worked}</span>
                      </div>
                      <div className="admin-modal-stat-item">
                        <span className="stat-item-label">Saldo</span>
                        <span className={`stat-item-value ${record.data.isOvertime ? "overtime" : "missing"}`}>
                          {record.data.diff}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Batidas e Observação (Abaixo) */}
                  <div className="admin-modal-record-body">
                    {/* Batidas do dia em formato de Pills em linha */}
                    <div className="admin-modal-punches-row">
                      {record.data.punches && record.data.punches.length > 0 ? (
                        (record.data.punches as string[]).map((p, idx) => {
                          const isEntrada = idx % 2 === 0;
                          if (isEntrada) {
                            const exitTime = (record.data.punches as string[])[idx + 1] || "--:--";
                            return (
                              <div key={idx} className="admin-modal-punch-pill">
                                <span className="punch-pill-time">{p}</span>
                                <span className="punch-pill-arrow">→</span>
                                <span className="punch-pill-time">{exitTime}</span>
                              </div>
                            );
                          }
                          return null;
                        })
                      ) : (
                        <span className="admin-modal-no-punches">Sem batidas registradas</span>
                      )}
                    </div>

                    {/* Observação */}
                    {record.data.observation && (
                      <div className="admin-modal-observation-text">
                        <strong>Obs:</strong> {record.data.observation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-records-centered">
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
              observation={selectedDayUserData.observation}
            />
          ) : (
            <p className="no-records-centered">
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
        icon={<Wallet size={20} color="var(--primary)" />}
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
                  <div className="emp-team">{emp.teamName || (emp.userTeams && emp.userTeams.length > 0 ? emp.userTeams[0].teamName : "Sem Equipe")}</div>
                </div>
              </div>
              <div className="emp-balances">
                <div className="balance-mini">
                  <span className="label">Saldo Mensal</span>
                  <span className={`value ${emp.balances.monthly >= 0 ? 'overtime' : 'missing'}`}>
                    {emp.balances.monthly === 0 ? '00:00' : `${emp.balances.monthly > 0 ? '+' : '-'}${minutesToHHMM(Math.abs(emp.balances.monthly))}`}
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
