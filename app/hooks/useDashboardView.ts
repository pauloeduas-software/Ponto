import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router";
import { type SavedDay } from "../types";
import { minutesToHHMM, formatTimeInput } from "../utils/time";
import { calculatePunchMetrics } from "../domain/punchCalculator";

export function useDashboardView(user: any, history: SavedDay[], fetcher: any) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlMonth = searchParams.get("month");

  const [currentDate, setCurrentDate] = useState(() => {
    if (urlMonth) {
      const [year, month] = urlMonth.split("-").map(Number);
      return new Date(year, month - 1, 1);
    }
    return new Date();
  });
  
  const [selectedDateStr, setSelectedDateStr] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editPunches, setEditPunches] = useState<string[]>([]);
  const [editGoal, setEditGoal] = useState("08:00");
  const [editObservation, setEditObservation] = useState("");
  const [calendarView, setCalendarView] = useState<'grid' | 'list'>('grid');

  const monthStats = useMemo(() => {
    const monthStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
    const filtered = history.filter(h => h.date.startsWith(monthStr));
    const totalMins = filtered.reduce((acc, h) => acc + h.workMins, 0);
    const totalDiff = filtered.reduce((acc, h) => acc + h.diffMins, 0);
    return {
      worked: minutesToHHMM(totalMins),
      balance: totalDiff === 0 ? '00:00' : `${totalDiff > 0 ? '+' : '-'}${minutesToHHMM(Math.abs(totalDiff))}`,
      isPositive: totalDiff >= 0,
      count: filtered.length
    };
  }, [history, currentDate]);

  const selectedDayData = useMemo(() => 
    history.find(h => h.date === selectedDateStr), 
  [history, selectedDateStr]);

  const changeMonth = useCallback((offset: number) => {
    setCurrentDate(prev => {
      const nextDate = new Date(prev.getFullYear(), prev.getMonth() + offset, 1);
      const nextMonthStr = `${nextDate.getFullYear()}-${(nextDate.getMonth() + 1).toString().padStart(2, '0')}`;
      
      const newParams = new URLSearchParams(searchParams);
      newParams.set("month", nextMonthStr);
      setSearchParams(newParams);
      
      return nextDate;
    });
  }, [searchParams, setSearchParams]);

  const handleDayClick = useCallback((dateStr: string) => {
    setSelectedDateStr(dateStr);
    setIsModalOpen(true);
    setIsEditing(false);
  }, []);

  const updatePunch = useCallback((index: number, value: string) => {
    setEditPunches(prev => {
      const newPunches = [...prev];
      newPunches[index] = value;
      return newPunches;
    });
  }, []);

  const handleSaveEdit = useCallback(() => {
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
        isOvertime: metrics.isOvertime.toString(),
        observation: editObservation
      },
      { method: "post" }
    );
    setIsEditing(false);
  }, [editPunches, editGoal, editObservation, selectedDateStr, fetcher]);

  const startEditing = useCallback(() => {
    setEditPunches(selectedDayData ? [...(selectedDayData.punches || [])] : ["", ""]);
    setEditGoal(selectedDayData?.goal || user.goal || "08:00");
    setEditObservation(selectedDayData?.observation || "");
    setIsEditing(true);
  }, [selectedDayData, user.goal]);

  return {
    state: {
      currentDate,
      selectedDateStr,
      isModalOpen,
      isEditing,
      editPunches,
      editGoal,
      editObservation,
      calendarView
    },
    actions: {
      setIsModalOpen,
      setIsEditing,
      setEditGoal,
      setEditObservation,
      setCalendarView,
      changeMonth,
      handleDayClick,
      updatePunch,
      handleSaveEdit,
      startEditing
    },
    computed: {
      monthStats,
      selectedDayData
    }
  };
}
