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
    } else if (isAdmin || canEditActiveTeam) {
      toggleDay(dateStr);
    }
  };

  const toggleDay = (dateStr: string) => {
    if (selectedUserId === "todos" || (!isAdmin && !canEditActiveTeam)) return;

    let newEscala;
    const exists = escala.find(s => s.userId === selectedUserId && s.date === dateStr);
    if (exists) {
      newEscala = escala.filter(s => !(s.userId === selectedUserId && s.date === dateStr));
    } else {
      const newShift: Shift = {
        userId: selectedUserId,
        date: dateStr,
        startTime: "08:00",
        endTime: "17:00",
        type: 'trabalho'
      };
      newEscala = [...escala, newShift];
    }
    setEscala(newEscala);

    const userShifts = newEscala.filter(s => s.userId === selectedUserId);
    fetcher.submit(
      {
        action: "save",
        userId: selectedUserId,
        shifts: JSON.stringify(userShifts)
      },
      { method: "post" }
    );
  };

  const scheduledEmployeesOnSelectedDay = useMemo(() => {
    return filteredEmployees.filter(emp => escala.find(s => s.userId === emp.id && s.date === selectedDateStr));
  }, [escala, selectedDateStr, filteredEmployees]);

  return (
    <div className="container">
      <div className="card">
        <div className="admin-header-new">
          <div className="header-row-1">
            <h1>Escala Mensal</h1>
            <MonthSelector currentDate={currentDate} onChangeMonth={changeMonth} />
          </div>
        </div>

        {!isAdmin && !canEditActiveTeam && activeTeamId && (
          <div className="escala-info-badge">
            <XCircle size={14} /> Modo Visualização — você é funcionário desta equipe
          </div>
        )}

        <div className="escala-filters-container">
          <div className={`filters-grid-new ${!(isAdmin || managerTeams.length > 0) ? 'single-col' : ''}`}>
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
                    value={activeTeamId || managerTeams[0]?.teamId}
                    onChange={(e) => {
                      navigate(`/escala?teamFilter=${e.target.value}`);
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
                  <Users size={12} /> Filtrar Colaborador
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
        </div>

        <CalendarGrid
          currentDate={currentDate}
          selectedDateStr={selectedDateStr}
          isModalOpen={isModalOpen}
          onDayClick={handleDayClick}
          renderDay={(d, isSelected) => {
            if (selectedUserId === "todos") {
              const scheduledUsers = filteredEmployees.filter(emp => escala.find(s => s.userId === emp.id && s.date === d.dateStr));
              const count = scheduledUsers.length;
              return (
                <div
                  className={`calendar-day ${isSelected ? 'selected' : ''}`}
                >
                  {d.day}
                  {count > 0 && (
                    <AvatarGroup
                      users={scheduledUsers}
                      max={3}
                      size={22}
                    />
                  )}
                </div>
              );
            }

            const isScheduled = escala.find(s => s.userId === selectedUserId && s.date === d.dateStr);
            return (
              <div
                className={`calendar-day ${isScheduled ? 'selected scheduled' : ''} ${(isAdmin || canEditActiveTeam) ? 'editable-cursor' : 'default-cursor'}`}
              >
                {d.day}
                {isScheduled ? (
                  <CheckCircle2 size={12} className="escala-day-icon success" />
                ) : (
                  <XCircle size={10} className="escala-day-icon muted" />
                )}
              </div>
            );
          }}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        icon={<CalendarIcon size={20} color="var(--primary)" />}
        className="large"
      >
        <div className="history-list">
          <p className="escala-modal-subtitle">Colaboradores escalados para este dia:</p>
          {scheduledEmployeesOnSelectedDay.length > 0 ? (
            scheduledEmployeesOnSelectedDay.map(emp => (
              <div key={emp.id} className="escala-modal-employee-card">
                <Avatar 
                  src={emp.avatarUrl} 
                  name={emp.name} 
                  size={44} 
                  className="escala-modal-avatar"
                />
                <div className="escala-modal-employee-name">{emp.name}</div>
              </div>
            ))
          ) : (
            <div className="escala-modal-empty-box">
              <p>Ninguém escalado.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
