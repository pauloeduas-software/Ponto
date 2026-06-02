import { useState, useMemo, useCallback } from "react";
import { type SavedDay } from "../types";
import { minutesToHHMM } from "../utils/time";

export function useAdminView(
  user: any,
  isAdmin: boolean,
  employees: any[],
  historyData: Record<string, SavedDay[]>
) {
  const userFirstTeamId = user.teamId || (user.userTeams && user.userTeams.length > 0 ? user.userTeams[0].teamId : null) || "todos";
  
  const [selectedTeamId, setSelectedTeamId] = useState<string>(isAdmin ? userFirstTeamId : "todos");
  const [selectedUserId, setSelectedUserId] = useState<string>("todos");
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [selectedDateStr, setSelectedDateStr] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  );
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeamBalanceModalOpen, setIsTeamBalanceModalOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<'grid' | 'list'>('grid');

  const changeMonth = useCallback((offset: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }, []);

  const handleDayClick = useCallback((dateStr: string) => {
    setSelectedDateStr(dateStr);
    setIsModalOpen(true);
  }, []);

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

  const recordCount = useCallback((dateStr: string) => {
    return filteredEmployees.filter(emp => 
      (historyData[emp.id] || []).some(h => h.date === dateStr)
    ).length;
  }, [filteredEmployees, historyData]);

  const getBalances = useCallback((userId: string) => {
    const userRecords = historyData[userId] || [];
    const monthStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;

    const monthly = userRecords
      .filter(r => r.date.startsWith(monthStr))
      .reduce((acc, r) => acc + r.diffMins, 0);

    return { monthly };
  }, [currentDate, historyData]);

  const selectedUserBalances = useMemo(() => {
    if (selectedUserId === "todos") return null;
    return getBalances(selectedUserId);
  }, [selectedUserId, getBalances]);

  const teamBalances = useMemo(() => {
    return filteredEmployees.map(emp => ({
      ...emp,
      balances: getBalances(emp.id)
    })).sort((a, b) => b.balances.monthly - a.balances.monthly);
  }, [filteredEmployees, getBalances]);

  return {
    state: {
      selectedTeamId,
      selectedUserId,
      currentDate,
      selectedDateStr,
      isModalOpen,
      isTeamBalanceModalOpen,
      calendarView
    },
    actions: {
      setSelectedTeamId,
      setSelectedUserId,
      setIsModalOpen,
      setIsTeamBalanceModalOpen,
      setCalendarView,
      changeMonth,
      handleDayClick
    },
    computed: {
      filteredEmployees,
      selectedDayGlobalData,
      selectedDayUserData,
      recordCount,
      selectedUserBalances,
      teamBalances
    }
  };
}
