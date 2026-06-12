import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Save, CheckCircle2, XCircle, User as UserIcon, Users, Timer, TrendingDown, TrendingUp, Layers } from "lucide-react";
import { useFetcher, useNavigate } from "react-router";
import { type Shift } from "../types";
import { Modal } from "../components/Modal";
import { CalendarGrid } from "../components/CalendarGrid";
import { MonthSelector } from "../components/MonthSelector";
import { AvatarGroup } from "../components/AvatarGroup";
import { Avatar } from "../components/Avatar";
import "../styles/calendar.css";
import "../styles/escala.css";

interface EscalaViewProps {
  user: any;
  employees: any[];
  initialShifts: Shift[];
  teamName: string | null;
  teams: any[];
  userTeams: any[];
  managerTeams: any[];
  isAdmin: boolean;
  activeTeamId: string | null;
  canEditActiveTeam: boolean;
}

export function EscalaView({
  user,
  employees,
  initialShifts,
  teamName,
  teams,
  userTeams,
  managerTeams,
  isAdmin,
  activeTeamId,
  canEditActiveTeam
}: EscalaViewProps) {
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const userFirstTeamId = user.teamId || (userTeams && userTeams.length > 0 ? userTeams[0].teamId : null) || "todos";
  const [selectedTeamId, setSelectedTeamId] = useState<string>(isAdmin ? userFirstTeamId : "todos");
  const [selectedUserId, setSelectedUserId] = useState<string>("todos");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [escala, setEscala] = useState<Shift[]>(initialShifts);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const filteredEmployees = useMemo(() => {
    if (selectedTeamId === "todos") return employees;
    return employees.filter(emp =>
      emp.teamId === selectedTeamId ||
      (emp.userTeams && emp.userTeams.some((ut: any) => ut.teamId === selectedTeamId))
    );
  }, [employees, selectedTeamId]);

  const handleDayClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    if (selectedUserId === "todos") {
      setIsModalOpen(true);
    }
  };

  const toggleEmployeeForDay = (empId: string) => {
    if (!isAdmin && !canEditActiveTeam) return;

    let newEscala;
    const exists = escala.find(s => s.userId === empId && s.date === selectedDateStr);
    if (exists) {
      newEscala = escala.filter(s => !(s.userId === empId && s.date === selectedDateStr));
    } else {
      const newShift: Shift = {
        userId: empId,
        date: selectedDateStr,
        startTime: "08:00",
        endTime: "17:00",
        type: 'trabalho'
      };
      newEscala = [...escala, newShift];
    }
    setEscala(newEscala);

    const userShifts = newEscala.filter(s => s.userId === empId);
    fetcher.submit(
      {
        action: "save",
        userId: empId,
        shifts: JSON.stringify(userShifts)
      },
      { method: "post" }
    );
  };

  const scheduledEmployeesOnSelectedDay = useMemo(() => {
    return filteredEmployees.filter(emp => escala.find(s => s.userId === emp.id && s.date === selectedDateStr));
  }, [escala, selectedDateStr, filteredEmployees]);

  return (
    <div className="page-shell">
      <div className="page-topbar">
        <div className="page-topbar-left">
          <h1 className="page-title">Escala Mensal</h1>
        </div>

        <div className="page-topbar-right">
          <MonthSelector currentDate={currentDate} onChangeMonth={changeMonth} />
        </div>
      </div>

      <div className="page-subbar">
        <div className="page-subbar-left">
          {!isAdmin && !canEditActiveTeam && activeTeamId && (
            <div className="view-mode-badge" style={{ marginRight: 16 }}>
              <XCircle size={12} /> Modo Visualização
            </div>
          )}
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
                  value={activeTeamId || managerTeams[0]?.teamId}
                  onChange={(e) => navigate(`/escala?teamFilter=${e.target.value}`)}
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
          {/* Vazio na escala para manter a altura consistente */}
        </div>
      </div>

      <div className="page-content">
        <div className="page-main">

          <CalendarGrid
            currentDate={currentDate}
            selectedDateStr={selectedDateStr}
            isModalOpen={isModalOpen}
            onDayClick={handleDayClick}
            renderDay={(d, isSelected) => {
              const scheduledUsers = filteredEmployees.filter(emp =>
                escala.find(s => s.userId === emp.id && s.date === d.dateStr) &&
                (selectedUserId === "todos" || emp.id === selectedUserId)
              );
              const isCursorEditable = selectedUserId === "todos";
              return (
                <div className={`calendar-day ${isSelected ? 'selected' : ''} ${!isCursorEditable ? 'default-cursor' : ''}`}>
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{d.day}</span>
                  </div>
                  {scheduledUsers.length > 0 ? (
                    selectedUserId === "todos" ? (
                      <AvatarGroup users={scheduledUsers} max={3} size={32} />
                    ) : (
                      <span className="calendar-day-bottom-text">08:00 - 17:00</span>
                    )
                  ) : (
                    <span className="calendar-day-bottom-text"></span>
                  )}
                </div>
              );
            }}
          />
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}

        title={new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        icon={<CalendarIcon size={20} color="var(--primary)" />}
        className="large"
      >
        <div className="history-list">
          <p className="escala-modal-subtitle">
            {(isAdmin || canEditActiveTeam)
              ? "Clique em um colaborador para escalar/remover deste dia:"
              : "Colaboradores escalados para este dia:"}
          </p>
          {(isAdmin || canEditActiveTeam) ? (
            filteredEmployees.length > 0 ? (
              filteredEmployees.map(emp => {
                const isScheduled = escala.some(s => s.userId === emp.id && s.date === selectedDateStr);
                return (
                  <div
                    key={emp.id}
                    className={`escala-modal-employee-card ${isScheduled ? 'scheduled-card' : ''}`}
                    onClick={() => toggleEmployeeForDay(emp.id)}
                    style={{ cursor: 'pointer', justifyContent: 'space-between' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Avatar
                        src={emp.avatarUrl}
                        name={emp.name}
                        size={44}
                        className="escala-modal-avatar"
                      />
                      <div className="escala-modal-employee-name">{emp.name}</div>
                    </div>
                    <div>
                      {isScheduled ? (
                        <CheckCircle2 size={20} color="var(--primary)" />
                      ) : (
                        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--glass-border)' }} />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="escala-modal-empty-box">
                <p>Nenhum colaborador na equipe.</p>
              </div>
            )
          ) : (
            scheduledEmployeesOnSelectedDay.length > 0 ? (
              scheduledEmployeesOnSelectedDay.map(emp => (
                <div key={emp.id} className="escala-modal-employee-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar
                      src={emp.avatarUrl}
                      name={emp.name}
                      size={44}
                      className="escala-modal-avatar"
                    />
                    <div className="escala-modal-employee-name">{emp.name}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="escala-modal-empty-box">
                <p>Ninguém escalado.</p>
              </div>
            )
          )}
        </div>
      </Modal>
    </div>
  );
}
