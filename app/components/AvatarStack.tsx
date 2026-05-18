import { User as UserIcon } from "lucide-react";

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
        <div key={idx} className="avatar-mini-new" title={u.name}>
          {u.avatarUrl ? (
            <img src={u.avatarUrl} alt={u.name || ""} />
          ) : (
            <UserIcon size={12} color="white" />
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div className="avatar-more-new">
          +{remaining}
        </div>
      )}
    </div>
  );
}
