import { Avatar } from "./Avatar";

interface AvatarItem {
  avatarUrl?: string | null;
  name?: string;
}

interface AvatarGroupProps {
  users: AvatarItem[];
  max?: number;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

export function AvatarGroup({ users, max = 3, size = 18, style, className }: AvatarGroupProps) {
  const count = users.length;
  const visibleUsers = users.slice(0, max);
  const remaining = count - max;

  return (
    <div className={`scheduled-avatars-new ${className || ''}`} style={style}>
      {visibleUsers.map((u, idx) => (
        <Avatar
          key={idx}
          src={u.avatarUrl}
          name={u.name}
          size={size}
          className="avatar-mini-new"
        />
      ))}
      {remaining > 0 && (
        <div className="avatar-more-new">
          +{remaining}
        </div>
      )}
    </div>
  );
}
