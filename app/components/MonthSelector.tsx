import { useMemo } from "react";

interface MonthSelectorProps {
  currentDate: Date;
  onChangeMonth: (offset: number) => void;
}

export function MonthSelector({ currentDate, onChangeMonth }: MonthSelectorProps) {
  const currentMonthValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const months = useMemo(() => {
    // 4 meses no futuro + mês atual + 4 meses no passado = 9 meses totais
    return Array.from({ length: 9 }).map((_, i) => {
      const d = new Date();
      // O offset é 4 para começar 4 meses no futuro e ir decrescendo
      d.setMonth(d.getMonth() + 4 - i);
      const labelRaw = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      // Remover preposição " de " e capitalizar para ficar limpo
      const label = labelRaw.replace(/ de /g, ' ').replace(/^./, str => str.toUpperCase());
      return {
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label
      };
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const [year, month] = val.split('-').map(Number);
    const newDate = new Date(year, month - 1, 1);

    // Calcula o offset exato para não quebrar a lógica de action dos hooks
    const diffYears = newDate.getFullYear() - currentDate.getFullYear();
    const diffMonths = newDate.getMonth() - currentDate.getMonth();
    const offset = (diffYears * 12) + diffMonths;

    if (offset !== 0) {
      onChangeMonth(offset);
    }
  };

  return (
    <select
      value={currentMonthValue}
      onChange={handleChange}
      className="month-select-clean"
    >
      {months.map(m => (
        <option key={m.value} value={m.value}>{m.label}</option>
      ))}
    </select>
  );
}
