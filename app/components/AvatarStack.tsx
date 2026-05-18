import { Avatar } from "./Avatar";

interface AvatarItem {
  avatarUrl?: string | null;
  name?: string;
}

interface AvatarStackProps {
  users: AvatarItem[];
  max?: number;
  style?: React.CSSProperties;
}

export function AvatarStack({ users, max = 3, style }: AvatarStackProps) {
  const count = users.length;
  const visibleUsers = users.slice(0, max);
  const remaining = count - max;

  return (
    <div className="scheduled-avatars-new" style={style}>
      {visibleUsers.map((u, idx) => (
        <Avatar
          key={idx}
          src={u.avatarUrl}
          name={u.name}
          size={24}
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
