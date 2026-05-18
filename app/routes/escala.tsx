import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Filter,
  Save,
  CheckCircle2,
  XCircle,
  User as UserIcon,
  Users,
  Timer,
  TrendingDown,
  TrendingUp,
  Layers
} from "lucide-react";
import { useLoaderData, useFetcher } from "react-router";
import type { ShouldRevalidateFunction } from "react-router";
import { db } from "../db.server";
import { requireUserId, getUser } from "../session.server";
import { type Shift } from "../types";
import { Modal } from "../components/Modal";
import { CalendarGrid } from "../components/CalendarGrid";
import { MonthNavigator } from "../components/MonthNavigator";
import { AvatarStack } from "../components/AvatarStack";
import { Avatar } from "../components/Avatar";
import "../styles/calendar.css";
import "../styles/escala.css";

// Só rebusca dados do servidor quando a própria action da escala for executada
export const shouldRevalidate: ShouldRevalidateFunction = ({ formAction, defaultShouldRevalidate }) => {
  if (formAction === "/escala") return true;
  return defaultShouldRevalidate;
};

export async function loader({ request }: { request: Request }) {
  await requireUserId(request);
  const user = await getUser(request) as any;
  const url = new URL(request.url);
  const viewParam = url.searchParams.get("view") || "team";
  const selectedTeamParam = url.searchParams.get("teamFilter") || null;

  // Admins e todos os membros de equipe podem ver a escala
  const isAdmin = user.role === "admin";

  // Apenas Administradores podem acessar a visão Global
  const isTeamView = !isAdmin || viewParam === "team";

  let employeesQuery = "SELECT id, name, role, avatarUrl, teamId FROM User";
  let shiftsQuery = "SELECT * FROM Shift";
  let params: any[] = [];
  let teamName = "Geral";

  // Vínculos do usuário logado (todas as equipes)
  const userTeams = (user.userTeams || []) as any[];
  const managerTeams = userTeams.filter((ut: any) => ut.role === 'manager');

  // Equipe ativa selecionada para não-admins
  const activeTeamId = selectedTeamParam || userTeams[0]?.teamId || user.teamId || null;
  // Role do usuário na equipe ativa
  const activeTeamRole = userTeams.find((ut: any) => ut.teamId === activeTeamId)?.role || null;
  // Se o usuário pode editar a equipe ativa (admin sempre pode, manager também)
  const canEditActiveTeam = isAdmin || activeTeamRole === 'manager';

  if (isAdmin) {
    // Admin global: sem filtro, sempre traz todos
  } else if (activeTeamId) {
    // Visão de equipe (Manager, employee ou Admin com equipe selecionada)
    employeesQuery = `
      SELECT DISTINCT u.id, u.name, u.role, u.avatarUrl, u.teamId
      FROM User u
      LEFT JOIN UserTeam ut ON u.id = ut.userId
      WHERE ut.teamId = ? OR u.teamId = ?
    `;
    shiftsQuery = `
      SELECT DISTINCT s.* FROM Shift s
      JOIN User u ON s.userId = u.id
      LEFT JOIN UserTeam ut ON s.userId = ut.userId
      WHERE ut.teamId = ? OR u.teamId = ?
    `;
    params = [activeTeamId, activeTeamId];
    const team = db.prepare("SELECT name FROM Team WHERE id = ?").get(activeTeamId) as any;
    teamName = team?.name || "Equipe";
  } else {
    // Sem equipe: vê apenas a si mesmo
    employeesQuery += " WHERE id = ?";
    shiftsQuery = "SELECT * FROM Shift WHERE userId = ?";
    params = [user.id];
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

  const shifts = db.prepare(shiftsQuery).all(...params) as any[];
  const teams = db.prepare("SELECT * FROM Team ORDER BY name").all() as any[];

  return {
    user, employees, initialShifts: shifts, teamName, teams,
    userTeams, managerTeams, isAdmin, activeTeamId, canEditActiveTeam
  };
}

export async function action({ request }: { request: Request }) {
  const userId = await requireUserId(request);
  const user = await getUser(request) as any;

  const formData = await request.formData();
  const actionType = formData.get("action");
  const targetUserId = formData.get("userId") as string;

  if (actionType === "save") {
    // Verifica se o usuário pode editar: admin, ou manager na equipe do target
    const isAdmin = user?.role === 'admin';
    let canEdit = isAdmin;

    if (!isAdmin && targetUserId) {
      // Busca as equipes em comum entre o executor e o target, onde o executor é manager
      const sharedManagerTeam = db.prepare(`
        SELECT ut1.teamId FROM UserTeam ut1
        JOIN UserTeam ut2 ON ut1.teamId = ut2.teamId
        WHERE ut1.userId = ? AND ut1.role = 'manager'
        AND ut2.userId = ?
        LIMIT 1
      `).get(user.id, targetUserId);
      canEdit = !!sharedManagerTeam;
    }

    if (!canEdit) {
      return { error: "Acesso negado." };
    }

    const shiftsJson = formData.get("shifts") as string;
    const shifts = JSON.parse(shiftsJson) as Shift[];

    db.prepare("DELETE FROM Shift WHERE userId = ?").run(targetUserId);

    const insert = db.prepare("INSERT INTO Shift (id, userId, date, startTime, endTime, type) VALUES (?, ?, ?, ?, ?, ?)");
    for (const s of shifts) {
      insert.run(crypto.randomUUID(), s.userId, s.date, s.startTime, s.endTime, s.type);
    }

    return { success: true };
  }

  return null;
}

export default function Escala() {
  const { user, employees, initialShifts, teamName, teams, userTeams, managerTeams, isAdmin, activeTeamId, canEditActiveTeam } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

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

    // Salvamento Automático: Envia apenas as escalas do usuário selecionado para a action
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

  const handleSave = () => {
    const userShifts = escala.filter(s => s.userId === selectedUserId);
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

  const isSaving = fetcher.state !== "idle";

  return (
    <div className="container">
      <div className="card">
        <div className="admin-header-new">
          <div className="header-row-1">
            <h1>Escala Mensal</h1>
            <MonthNavigator currentDate={currentDate} onChangeMonth={changeMonth} />
          </div>
        </div>

        {/* Badge de modo visualização: aparece quando não pode editar a equipe ativa */}
        {!isAdmin && !canEditActiveTeam && activeTeamId && (
          <div style={{
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--glass-border)',
            borderRadius: '10px',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <XCircle size={14} /> Modo Visualização — você é funcionário desta equipe
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <div className="filters-grid-new" style={!(isAdmin || managerTeams.length > 0) ? { gridTemplateColumns: '1fr' } : {}}>
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
                    value={activeTeamId || managerTeams[0]?.teamId}
                    onChange={(e) => {
                      window.location.href = `/escala?teamFilter=${e.target.value}`;
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
                    <AvatarStack
                      users={scheduledUsers}
                      max={3}
                    />
                  )}
                </div>
              );
            }

            const isScheduled = escala.find(s => s.userId === selectedUserId && s.date === d.dateStr);
            return (
              <div
                className={`calendar-day ${isScheduled ? 'selected' : ''}`}
                style={{
                  background: isScheduled ? 'rgba(16, 185, 129, 0.15)' : '',
                  borderColor: isScheduled ? 'var(--success)' : '',
                  cursor: (isAdmin || canEditActiveTeam) ? 'pointer' : 'default'
                }}
              >
                {d.day}
                {isScheduled ? (
                  <CheckCircle2 size={12} style={{ color: 'var(--success)', marginTop: '4px' }} />
                ) : (
                  <XCircle size={10} style={{ color: 'rgba(255,255,255,0.1)', marginTop: '4px' }} />
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
        icon={<CalendarIcon size={20} style={{ color: 'var(--primary)' }} />}
        className="large"
      >
        <div className="history-list">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Colaboradores escalados para este dia:</p>
          {scheduledEmployeesOnSelectedDay.length > 0 ? (
            scheduledEmployeesOnSelectedDay.map(emp => (
              <div key={emp.id} style={{
                padding: '12px 16px',
                marginBottom: '8px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--glass-border)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Avatar 
                  src={emp.avatarUrl} 
                  name={emp.name} 
                  size={44} 
                  style={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} 
                />
                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{emp.name}</div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ color: 'var(--text-muted)' }}>Ninguém escalado.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
