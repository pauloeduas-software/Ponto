interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  isPositive?: boolean;
  type?: 'worked' | 'balance';
}

export function StatCard({ label, value, subValue, isPositive, type }: StatCardProps) {
  const valueClass = type === 'balance' ? (isPositive ? 'overtime' : 'missing') : '';
  
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <div className={`stat-value ${valueClass}`}>
        {type === 'balance' ? (isPositive ? '+' : '-') : ''}{value}
      </div>
      {subValue && <span style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>{subValue}</span>}
    </div>
  );
}
