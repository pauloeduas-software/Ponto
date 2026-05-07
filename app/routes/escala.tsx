import { useState, useMemo } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Filter,
  Save,
  CheckCircle2,
  XCircle,
  User as UserIcon
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
  const user = await getUser(request);
  
  const employees = db.prepare("SELECT id, name, role, avatarUrl FROM User").all() as any[];
  const shifts = db.prepare("SELECT * FROM Shift").all() as any[];

  return { user, employees, initialShifts: shifts };
}

export async function action({ request }: { request: Request }) {
  const userId = await requireUserId(request);
  const user = await getUser(request) as any;

  // CORREÇÃO: Apenas administradores podem modificar a escala
  if (user?.role !== 'admin') {
    return { error: "Apenas administradores podem modificar a escala." };
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
  const { user, employees, initialShifts } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  
  const [selectedUserId, setSelectedUserId] = useState<string>("todos");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [escala, setEscala] = useState<Shift[]>(initialShifts);

  const daysInMonth = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    if (selectedUserId === "todos") {
      setIsModalOpen(true);
    } else if ((user as any)?.role === 'admin') { // Apenas admins podem alternar dias
      toggleDay(dateStr);
    }
  };

  const toggleDay = (dateStr: string) => {
    if (selectedUserId === "todos" || (user as any)?.role !== 'admin') return;
    
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
    return employees.filter(emp => escala.find(s => s.userId === emp.id && s.date === selectedDateStr));
  }, [escala, selectedDateStr, employees]);

  const isSaving = fetcher.state !== "idle";

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <div>
            <h1>Escala Mensal</h1>
            <p className="subtitle">Planejamento de Equipe</p>
          </div>
          <div className="month-nav">
            <button className="icon-btn" onClick={() => changeMonth(-1)}><ChevronLeft size={18} /></button>
            <span style={{fontWeight: '700', textTransform: 'capitalize'}}>
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <button className="icon-btn" onClick={() => changeMonth(1)}><ChevronRight size={18} /></button>
          </div>
        </div>

        {(user as any)?.role !== 'admin' && (
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

        <div className="input-group" style={{marginBottom: '20px'}}>
          <div className="label-container">
            <label style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Filter size={12} /> Selecionar Colaborador</label>
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



        <div className="calendar-grid" style={{marginBottom: '24px'}}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="weekday-label">{d}</div>
          ))}
          {daysInMonth.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} className="calendar-day other-month" />;
            
            const isSelected = selectedDateStr === d.dateStr && isModalOpen;

            if (selectedUserId === "todos") {
              const scheduledUsers = employees.filter(emp => escala.find(s => s.userId === emp.id && s.date === d.dateStr));
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
                  cursor: (user as any)?.role === 'admin' ? 'pointer' : 'default'
                }}
              >
                {d.day}
                {isScheduled ? (
                  <CheckCircle2 size={12} style={{color: 'var(--success)', marginTop: '4px'}} />
                ) : (
                  <XCircle size={10} style={{color: 'rgba(255,255,255,0.1)', marginTop: '4px'}} />
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
        icon={<CalendarIcon size={20} style={{color: 'var(--primary)'}} />}
      >
        <div className="history-list">
          <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px'}}>Colaboradores escalados para este dia:</p>
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
                    <img src={emp.avatarUrl} alt={emp.name} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                  ) : (
                    <UserIcon color="white" size={20} />
                  )}
                </div>
                <div style={{fontWeight: '600', fontSize: '0.9rem'}}>{emp.name}</div>
              </div>
            ))
          ) : (
            <div style={{textAlign: 'center', padding: '20px 0'}}>
              <p style={{color: 'var(--text-muted)'}}>Ninguém escalado.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
