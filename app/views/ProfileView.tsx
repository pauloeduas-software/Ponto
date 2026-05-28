import { useState, useRef } from "react";
import { User as UserIcon, LogOut, Save, Clock, Camera, Loader2, Briefcase, Layers, ChevronRight, ShieldCheck } from "lucide-react";
import { useFetcher, Form } from "react-router";
import { Avatar } from "../components/Avatar";
import "../styles/profile.css";

interface ProfileViewProps {
  user: any;
  team: { name: string } | null;
}

export function ProfileView({ user, team }: ProfileViewProps) {
  const fetcher = useFetcher();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [goal, setGoal] = useState(user.goal || "08:00");
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const size = 120;
          canvas.width = size;
          canvas.height = size;
          
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const minSide = Math.min(img.width, img.height);
            const sx = (img.width - minSide) / 2;
            const sy = (img.height - minSide) / 2;
            ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          }
          
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          
          setAvatarPreview(compressedBase64);
          fetcher.submit(
            { action: "updateAvatar", avatar: compressedBase64 },
            { method: "post" }
          );
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <div>
            <h1>Minha Conta</h1>
            <p className="subtitle">Configurações de Perfil</p>
          </div>
        </div>

        <div className="profile-layout-container">
          <div className="profile-user-card">
            <div className="profile-avatar-wrapper">
              <Avatar
                src={avatarPreview}
                name={user.name}
                size={110}
                onClick={() => fileInputRef.current?.click()}
                className="profile-avatar-img"
              />
              <div className="profile-avatar-camera-badge">
                <Camera size={14} color="white" />
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

            <div className="profile-details-col">
              <div className="profile-name-input-wrapper">
                <input 
                  type="text" 
                  defaultValue={user.name}
                  onBlur={(e) => {
                    if (e.target.value !== user.name) {
                      fetcher.submit({ action: "updateName", name: e.target.value }, { method: "post" });
                    }
                  }}
                  className="profile-name-input"
                />
              </div>
              <p className="profile-username-text">@{ user.username }</p>
              <div className="profile-badges-row">
                <div className={user.role === 'admin' ? 'profile-badge-role-admin' : 'profile-badge-role-user'}>
                  {user.role === 'admin' ? 'Admin' : 'Usuário'}
                </div>
                
                {team && (
                  <div className="profile-badge-team-primary">
                    <ShieldCheck size={14} /> {team.name} (Principal)
                  </div>
                )}
                {(user.userTeams || []).map((ut: any) => (
                  <div key={ut.teamId} className={ut.role === 'manager' ? 'profile-badge-team-manager' : 'profile-badge-team-employee'}>
                    <Layers size={14} /> {ut.teamName} {ut.role === 'manager' ? '· Ger.' : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {user.role === 'admin' && (
            <div className="profile-admin-banner">
              <div>
                <h3 className="profile-admin-banner-title">Administração</h3>
                <p className="profile-admin-banner-desc">Gerenciar equipes, cargos e acessos.</p>
              </div>
              <a href="/gestao" className="profile-admin-banner-link">
                Painel de Gestão <ChevronRight size={16} />
              </a>
            </div>
          )}

          <div className="profile-logout-wrapper">
            <Form action="/logout" method="post">
              <button className="btn-register btn-profile-logout">
                <LogOut size={20} /> Sair da Conta
              </button>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
