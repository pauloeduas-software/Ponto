import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Timer, TrendingDown, TrendingUp, Trash2, Edit3, Plus, Loader2, Clock, ArrowRight } from "lucide-react";
import { useFetcher } from "react-router";
import { useDashboardView } from "../hooks/useDashboardView";
import { type SavedDay } from "../types";
import { minutesToTime, timeToMinutes, minutesToHHMM, formatTimeInput } from "../utils/time";
import { Modal } from "../components/Modal";
import { CalendarGrid } from "../components/CalendarGrid";
import { CalendarVertical } from "../components/CalendarVertical";
import { MonthSelector } from "../components/MonthSelector";
import { DayInfo } from "../components/DayInfo";
import "../styles/calendar.css";
import "../styles/dashboard.css";

interface DashboardViewProps {
  user: any;
  history: SavedDay[];
}

export function DashboardView({ user, history }: DashboardViewProps) {
  const fetcher = useFetcher();

  const { state, actions, computed } = useDashboardView(user, history, fetcher);

  const {
    currentDate, selectedDateStr, isModalOpen, isEditing,
    editPunches, editGoal, editObservation, calendarView
  } = state;

  const {
    setIsModalOpen, setIsEditing, setEditGoal, setEditObservation,
    setCalendarView, changeMonth, handleDayClick, updatePunch,
    handleSaveEdit, startEditing
  } = actions;

  const { monthStats, selectedDayData } = computed;

  // Gera todos os dias do mês selecionado
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed
    const numDays = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: numDays }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dateObj = new Date(year, month, dayNum);
      const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', '');

      const record = history.find(h => h.date === dateStr);

      return {
        dateStr,
        dayNum,
        weekday,
        record,
      };
    });
  }, [currentDate, history]);

  return (
    <div className="page-shell">
      {/* Topbar: Title left, Actions right */}
      <div className="page-topbar">
        <div className="page-topbar-left">
          <h1 className="page-title">Espelho de Ponto</h1>
        </div>
        <div className="page-topbar-right">
          <MonthSelector currentDate={currentDate} onChangeMonth={changeMonth} />
          <a
            href={`/api/export-punches?month=${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`}
            className="action-btn"
          >Exportar</a>
        </div>
      </div>

      {/* Subbar: Toggle left, Balance right */}
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
        </div>
        <div className="page-subbar-right">
          <div className="subbar-balance">
            <span className="subbar-balance-label">Saldo do mês</span>
            <span className={`subbar-balance-value ${monthStats.isPositive ? 'overtime' : 'missing'}`}>
              {monthStats.balance}
            </span>
          </div>
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
                const hasData = history.find(h => h.date === d.dateStr);
                return (
                  <div className={`calendar-day ${isSelected ? 'selected' : ''} ${isWeekend ? 'weekend' : ''}`}>
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{d.day}</span>
                      {hasData && <div className={`day-indicator ${hasData.isOvertime ? 'positive' : 'negative'}`} />}
                    </div>
                    <span className="calendar-day-bottom-text">{hasData ? hasData.worked : ''}</span>
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
                    <th>MARCAÇÕES</th>
                    <th>TOTAL</th>
                    <th>SALDO</th>
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
                        title="Clique para editar as batidas deste dia"
                      >
                        <td className="font-mono date-col">{formattedDate}</td>
                        <td className="weekday-col">{d.weekday}</td>
                        <td>
                          {d.record ? (
                            <div className="dashboard-table-punches-list">
                              {d.record.punches?.map((p: string, i: number) => (
                                <span key={i} className="font-mono dashboard-table-punch-tag">
                                  {p}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="dashboard-table-no-records">Sem registros</span>
                          )}
                        </td>
                        <td className="font-mono">{d.record?.worked || "--:--"}</td>
                        <td className={`font-mono ${d.record ? (d.record.isOvertime ? 'overtime-text' : 'missing-text') : ''}`}>
                          {d.record?.diff || "--:--"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            icon={<CalendarIcon size={20} color="var(--primary)" />}
            className="large"
          >
            <div className="details-grid dashboard-modal-grid">
              {isEditing ? (
                <div className="dashboard-modal-edit-column">
                  <div className="dashboard-modal-goal-banner">
                    <div>
                      <div className="dashboard-modal-goal-title">Meta deste Dia</div>
                      <div className="dashboard-modal-goal-desc">Alterar meta apenas para esta data</div>
                    </div>
                    <div className="dashboard-modal-goal-input-wrapper">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editGoal}
                        maxLength={5}
                        onChange={(e) => setEditGoal(formatTimeInput(e.target.value))}
                        className="dashboard-modal-goal-input"
                      />
                      <Clock size={14} color="white" className="dashboard-modal-goal-input-icon" />
                    </div>
                  </div>
                  <div className="dashboard-modal-punches-list">
                    {(() => {
                      const pairsToShow = Math.max(1, Math.ceil(editPunches.length / 2) + (editPunches.length > 0 && editPunches.length % 2 === 0 && editPunches[editPunches.length - 1] !== "" ? 1 : 0));

                      return Array.from({ length: pairsToShow }).map((_, i) => {
                        const sIdx = i * 2;
                        const eIdx = sIdx + 1;
                        const sVal = editPunches[sIdx];
                        const eVal = editPunches[eIdx];

                        let isInv = false;
                        let errorMsg = "";

                        const sMins = sVal?.length === 5 ? timeToMinutes(sVal) : -1;
                        const eMins = eVal?.length === 5 ? timeToMinutes(eVal) : -1;

                        if (sMins !== -1 && eMins !== -1 && eMins <= sMins) {
                          isInv = true; errorMsg = "Saída ≤ Entrada";
                        }
                        if (!isInv && i > 0 && sMins !== -1) {
                          const pExit = editPunches[sIdx - 1];
                          const pMins = pExit?.length === 5 ? timeToMinutes(pExit) : -1;
                          if (pMins !== -1 && sMins <= pMins) { isInv = true; errorMsg = "Menor que anterior"; }
                        }

                        return (
                          <div key={i} className={`dashboard-modal-punch-card ${isInv ? 'invalid' : ''}`}>
                            {isInv && (
                              <span className="dashboard-modal-error-badge">
                                {errorMsg}
                              </span>
                            )}
                            <div className="dashboard-modal-input-col">
                              <label className={`dashboard-modal-label ${isInv ? 'invalid' : ''}`}>Entrada</label>
                              <div className="dashboard-modal-input-row">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="HH:MM"
                                  value={sVal || ""}
                                  maxLength={5}
                                  onChange={e => updatePunch(sIdx, formatTimeInput(e.target.value))}
                                  className={isInv ? 'invalid' : ''}
                                />
                                {sVal && <button onClick={() => updatePunch(sIdx, "")} className="dashboard-modal-clear-btn">✕</button>}
                              </div>
                            </div>
                            <ArrowRight size={12} className="dashboard-modal-arrow" />
                            <div className="dashboard-modal-input-col">
                              <label className={`dashboard-modal-label ${isInv ? 'invalid' : ''}`}>Saída</label>
                              <div className="dashboard-modal-input-row">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="HH:MM"
                                  value={eVal || ""}
                                  maxLength={5}
                                  onChange={e => updatePunch(eIdx, formatTimeInput(e.target.value))}
                                  className={isInv ? 'invalid' : ''}
                                />
                                {eVal && <button onClick={() => updatePunch(eIdx, "")} className="dashboard-modal-clear-btn">✕</button>}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <div className="dashboard-modal-observation-section" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="dashboard-modal-label">Observação</label>
                    <textarea
                      placeholder="Ex: Esqueceu de bater o ponto, consulta médica, viagem..."
                      value={editObservation}
                      onChange={e => setEditObservation(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: 'white',
                        padding: '10px',
                        fontSize: '0.9rem',
                        minHeight: '80px',
                        resize: 'vertical',
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                  <div className="dashboard-modal-actions-grid" style={{ marginTop: '20px' }}>
                    <button className="btn-register" onClick={handleSaveEdit}>{fetcher.state !== "idle" ? <Loader2 size={16} className="animate-spin" /> : "Salvar"}</button>
                    <button className="btn-register btn-cancel-glass" onClick={() => setIsEditing(false)}>Cancelar</button>
                  </div>
                </div>
              ) : selectedDayData ? (
                <>
                  <DayInfo
                    punches={selectedDayData.punches}
                    worked={selectedDayData.worked}
                    goal={selectedDayData.goal}
                    diff={selectedDayData.diff}
                    isOvertime={selectedDayData.isOvertime}
                    showGoal={true}
                    observation={selectedDayData.observation}
                  />
                  <div className="dashboard-modal-actions-grid-spaced">
                    <button className="btn-register btn-edit-glass" onClick={startEditing}><Edit3 size={16} /> Editar</button>
                    <button className="btn-register btn-delete-dashed" onClick={() => { if (confirm("Remover registro?")) { fetcher.submit({ _action: "delete", date: selectedDateStr }, { method: "post" }); setIsModalOpen(false); } }}><Trash2 size={16} /> Excluir</button>
                  </div>
                </>
              ) : (
                <div className="dashboard-modal-empty">
                  <p>Sem registros.</p>
                  <button className="btn-register btn-add-primary" onClick={startEditing}><Plus size={16} className="btn-icon-margin" /> Adicionar</button>
                </div>
              )}
            </div>
          </Modal>
        </div>
      </div>
    </div>
  );
}
