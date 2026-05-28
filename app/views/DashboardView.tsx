import { useState, useMemo } from "react";
import {ChevronLeft, ChevronRight, Calendar as CalendarIcon, Timer, TrendingDown, TrendingUp, Trash2, Edit3, Plus, Loader2, Clock, ArrowRight } from "lucide-react";
import { useFetcher } from "react-router";
import { type SavedDay } from "../types";
import { minutesToTime, timeToMinutes, minutesToHHMM, formatTimeInput } from "../utils/time";
import { calculatePunchMetrics } from "../domain/punchCalculator";
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

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editPunches, setEditPunches] = useState<string[]>([]);
  const [editGoal, setEditGoal] = useState("08:00");
  const [calendarView, setCalendarView] = useState<'grid' | 'list'>('grid');

  const monthStats = useMemo(() => {
    const monthStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
    const filtered = history.filter(h => h.date.startsWith(monthStr));
    const totalMins = filtered.reduce((acc, h) => acc + h.workMins, 0);
    const totalDiff = filtered.reduce((acc, h) => acc + h.diffMins, 0);
    return {
      worked: minutesToHHMM(totalMins),
      balance: minutesToHHMM(Math.abs(totalDiff)),
      isPositive: totalDiff >= 0,
      count: filtered.length
    };
  }, [history, currentDate]);

  const selectedDayData = useMemo(() => history.find(h => h.date === selectedDateStr), [history, selectedDateStr]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setIsModalOpen(true);
    setIsEditing(false);
  };

  const updatePunch = (index: number, value: string) => {
    const newPunches = [...editPunches];
    newPunches[index] = value;
    setEditPunches(newPunches);
  };

  const handleSaveEdit = () => {
    let cleanedPunches = [...editPunches];
    while (cleanedPunches.length > 0 && cleanedPunches[cleanedPunches.length - 1] === "") {
      cleanedPunches.pop();
    }

    const metrics = calculatePunchMetrics(cleanedPunches, editGoal);

    fetcher.submit(
      {
        _action: "save",
        date: selectedDateStr,
        punches: JSON.stringify(cleanedPunches),
        goal: editGoal,
        workMins: metrics.workMins.toString(),
        diffMins: metrics.diffMins.toString(),
        isOvertime: metrics.isOvertime.toString()
      },
      { method: "post" }
    );
    setIsEditing(false);
  };

  const startEditing = () => {
    setEditPunches(selectedDayData ? [...(selectedDayData.punches || [])] : ["", ""]);
    setEditGoal(selectedDayData?.goal || user.goal || "08:00");
    setIsEditing(true);
  };

  return (
    <div className="container">
      <div className="card">
        <div className="admin-header-new">
          <div className="header-row-1">
            <h1>Histórico de Ponto</h1>
            <MonthSelector currentDate={currentDate} onChangeMonth={changeMonth} />
          </div>

          <div className="header-row-2 dashboard-sub-header">
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

          <div className="header-row-2">
            <div className="balance-mini-left">
              <span className="label">Saldo do Mês:</span>
              <span className={`value ${monthStats.isPositive ? 'overtime' : 'missing'}`}>
                {monthStats.balance}
              </span>
            </div>
          </div>
        </div>

        {calendarView === 'grid' ? (
          <CalendarGrid
            currentDate={currentDate}
            selectedDateStr={selectedDateStr}
            isModalOpen={isModalOpen}
            onDayClick={handleDayClick}
            renderDay={(d, isSelected) => {
              const hasData = history.find(h => h.date === d.dateStr);
              const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
              const isToday = d.dateStr === today;
              return (
                <div className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}>
                  {d.day}
                  {hasData && <div className={`day-indicator ${hasData.isOvertime ? 'positive' : 'negative'}`} />}
                </div>
              );
            }}
          />
        ) : (
          <CalendarVertical
            currentDate={currentDate}
            onDayClick={handleDayClick}
            renderRowContent={(wd) => {
              const hasData = history.find(h => h.date === wd.dateStr);
              return hasData ? (
                <div className="day-punches-wrapper">
                  {hasData.punches?.map((punch, pIdx) => {
                    if (pIdx % 2 !== 0) return null;
                    const start = punch;
                    const end = hasData.punches?.[pIdx + 1];
                    
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
              ) : (
                <span className="no-records-text">Sem registros</span>
              );
            }}
            renderRowSide={(wd) => {
              const hasData = history.find(h => h.date === wd.dateStr);
              return hasData ? (
                <div className={`day-balance-tag ${hasData.isOvertime ? 'overtime' : 'missing'}`}>
                  {hasData.diff}
                </div>
              ) : null;
            }}
          />
        )}
      </div>

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
              <div className="dashboard-modal-actions-grid">
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
  );
}
