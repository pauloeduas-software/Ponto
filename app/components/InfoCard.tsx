interface InfoCardProps {
  label: string;
  value: string;
  subValue?: string;
  isPositive?: boolean;
  type?: 'worked' | 'balance';
}

export function InfoCard({ label, value, subValue, isPositive, type }: InfoCardProps) {
  const valueClass = type === 'balance' ? (isPositive ? 'overtime' : 'missing') : '';
  
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <div className={`stat-value ${valueClass}`}>
        {value}
      </div>
      {subValue && <span className="stat-sub">{subValue}</span>}
    </div>
  );
}
