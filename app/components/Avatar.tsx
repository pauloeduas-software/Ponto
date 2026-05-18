import { User as UserIcon } from "lucide-react";

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}

export function Avatar({ src, name, size = 40, style, className = "", onClick }: AvatarProps) {
  const initial = name ? name[0].toUpperCase() : "";

  return (
    <div
      onClick={onClick}
      className={`avatar-component ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '14px',
        background: 'var(--accent-gradient)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        color: 'white',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        fontSize: `${size * 0.45}px`,
        ...style
      }}
    >
      {src ? (
        <img
          src={src}
          alt={name || ""}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : initial ? (
        initial
      ) : (
        <UserIcon size={size * 0.5} color="white" />
      )}
    </div>
  );
}
