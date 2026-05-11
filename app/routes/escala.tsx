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
import { getDaysInMonth } from "../utils/calendar";
import { Modal } from "../components/Modal";

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

  // Todos os usuários logados podem ver a escala

  // Apenas Administradores podem acessar a visão Global
  const isTeamView = user.role !== "admin" || viewParam === "team";

  let employeesQuery = "SELECT id, name, role, avatarUrl, teamId FROM User";
  let shiftsQuery = "SELECT * FROM Shift";
  let params: any[] = [];

  if (isTeamView) {
    if (user.teamId) {
      // Usuário tem equipe: vê a equipe inteira
      employeesQuery += " WHERE teamId = ?";
      shiftsQuery = "SELECT s.* FROM Shift s JOIN User u ON s.userId = u.id WHERE u.teamId = ?";
      params = [user.teamId];
    } else {
      // Usuário NÃO tem equipe: vê apenas a si mesmo por segurança
      employeesQuery += " WHERE id = ?";
      shiftsQuery = "SELECT * FROM Shift WHERE userId = ?";
      params = [user.id];
    }
  }

  const employees = db.prepare(employeesQuery).all(...params) as any[];
  const shifts = db.prepare(shiftsQuery).all(...params) as any[];

  // Buscar nome da equipe se estiver na visão de equipe
  let teamName = "Geral";
  if (isTeamView && user.teamId) {
    const team = db.prepare("SELECT name FROM Team WHERE id = ?").get(user.teamId) as any;
    teamName = team?.name || "Equipe";
  }

  const teams = db.prepare("SELECT * FROM Team ORDER BY name").all() as any[];

  return { user, employees, initialShifts: shifts, teamName, isTeamView, teams };
}

export async function action({ request }: { request: Request }) {
  const userId = await requireUserId(request);
  const user = await getUser(request) as any;

  // Administradores e Gerentes podem modificar a escala
  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return { error: "Acesso negado." };
  }

  const formData = await request.formData();
  const actionType = formData.get("action");

  if (actionType === "save") {
    const targetUserId = formData.get("userId") as string;
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
  const { user, employees, initialShifts, teamName, isTeamView, teams } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const [selectedTeamId, setSelectedTeamId] = useState<string>("todos");
  const [selectedUserId, setSelectedUserId] = useState<string>("todos");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [escala, setEscala] = useState<Shift[]>(initialShifts);

  const daysInMonth = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const filteredEmployees = useMemo(() => {
    if (selectedTeamId === "todos") return employees;
    return employees.filter(emp => emp.teamId === selectedTeamId);
  }, [employees, selectedTeamId]);

  const handleDayClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    if (selectedUserId === "todos") {
      setIsModalOpen(true);
    } else if ((user as any)?.role === 'admin' || (user as any)?.role === 'manager') { // Admins e Gerentes podem alternar dias
      toggleDay(dateStr);
    }
  };

  const toggleDay = (dateStr: string) => {
    if (selectedUserId === "todos" || ((user as any)?.role !== 'admin' && (user as any)?.role !== 'manager')) return;

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
        <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1>Escala Mensal</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px' }}>
              <p className="subtitle" style={{ margin: 0 }}>{!isTeamView ? 'Global' : `Equipe: ${teamName}`}</p>
              {user.role === 'admin' && (
                <div className="toggle-container">
                  <a href="/escala?view=global" className={`view-toggle ${!isTeamView ? 'active' : ''}`}>Global</a>
                  <a href="/escala?view=team" className={`view-toggle ${isTeamView ? 'active' : ''}`}>Minha Equipe</a>
                </div>
              )}
            </div>
          </div>
          <div className="month-nav" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="icon-btn" onClick={() => changeMonth(-1)}><ChevronLeft size={18} /></button>
            <span style={{ fontWeight: '700', textTransform: 'capitalize', textAlign: 'center', minWidth: '130px' }}>
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <button className="icon-btn" onClick={() => changeMonth(1)}><ChevronRight size={18} /></button>
          </div>
        </div>

        {((user as any)?.role !== 'admin' && (user as any)?.role !== 'manager') && (
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
            <XCircle size={14} /> Modo Visualização (Apenas administradores podem editar)
          </div>
        )}

        {!isTeamView ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div className="input-group">
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

            <div className="input-group">
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
        ) : (
          <div className="input-group" style={{ marginBottom: '24px' }}>
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
        )}



        <div className="calendar-grid" style={{ marginBottom: '24px' }}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="weekday-label">{d}</div>
          ))}
          {daysInMonth.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} className="calendar-day other-month" />;

            const isSelected = selectedDateStr === d.dateStr && isModalOpen;

            if (selectedUserId === "todos") {
              const scheduledUsers = filteredEmployees.filter(emp => escala.find(s => s.userId === emp.id && s.date === d.dateStr));
              const count = scheduledUsers.length;
              return (
                <div
                  key={d.dateStr}
                  className={`calendar-day ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleDayClick(d.dateStr)}
                >
                  {d.day}
                  {count > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {scheduledUsers.slice(0, 3).map((u, idx) => (
                        <div key={idx} style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '7px',
                          background: 'var(--primary)',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid #0f172a',
                          boxShadow: '0 3px 6px rgba(0,0,0,0.3)'
                        }}>
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <UserIcon size={14} color="white" />
                          )}
                        </div>
                      ))}
                      {count > 3 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: 'flex-end', fontWeight: 'bold' }}>+{count - 3}</div>}
                    </div>
                  )}
                </div>
              );
            }

            const isScheduled = escala.find(s => s.userId === selectedUserId && s.date === d.dateStr);
            return (
              <div
                key={d.dateStr}
                className={`calendar-day ${isScheduled ? 'selected' : ''}`}
                onClick={() => handleDayClick(d.dateStr)}
                style={{
                  background: isScheduled ? 'rgba(16, 185, 129, 0.15)' : '',
                  borderColor: isScheduled ? 'var(--success)' : '',
                  cursor: ((user as any)?.role === 'admin' || (user as any)?.role === 'manager') ? 'pointer' : 'default'
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
          })}
        </div>
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
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--primary)',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  {emp.avatarUrl ? (
                    <img src={emp.avatarUrl} alt={emp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <UserIcon color="white" size={20} />
                  )}
                </div>
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
      <style dangerouslySetInnerHTML={{
        __html: `
        .toggle-container {
          background: rgba(255, 255, 255, 0.03);
          padding: 4px;
          border-radius: 12px;
          display: flex;
          gap: 4px;
          border: 1px solid var(--glass-border);
        }
        .view-toggle {
          padding: 4px 12px;
          border-radius: 9px;
          font-size: 0.65rem;
          font-weight: 700;
          text-decoration: none;
          color: var(--text-muted);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .view-toggle.active {
          background: var(--primary);
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        .view-toggle:not(.active):hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
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
      `}} />
    </div>
  );
}
