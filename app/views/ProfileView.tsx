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
    <div className="page-shell">

      <div className="page-content">
        <div className="page-main">
          
          <div className="profile-container">
            {/* HERO SECTION */}
            <div className="profile-hero">
              <div className="profile-avatar-wrapper">
                <Avatar 
                  src={avatarPreview} 
                  name={user.name} 
                  size={100} 
                  style={{ borderRadius: '50%' }}
                />
                <button className="profile-camera-btn" onClick={() => fileInputRef.current?.click()}>
                  <Camera size={18} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              
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
              <span className="profile-username">@{user.username}</span>
              
              <div className={`profile-badge ${user.role === 'admin' ? 'admin' : ''}`}>
                {user.role === 'admin' ? 'Administrador' : 'Colaborador'}
              </div>
            </div>

            {/* CONTENT GRID */}
            <div className="profile-content-grid">
              
              {/* EQUIPES */}
              <div className="profile-card">
                <h3 className="profile-card-title">
                  <ShieldCheck size={20} /> Equipes e Acessos
                </h3>
                <div className="team-list">
                  {team && (
                    <div className="team-item primary">
                      <div className="team-icon">
                        <ShieldCheck size={24} />
                      </div>
                      <div className="team-info">
                        <span className="team-name">{team.name}</span>
                        <span className="team-role">Principal</span>
                      </div>
                    </div>
                  )}
                  {(user.userTeams || []).map((ut: any) => (
                    <div key={ut.teamId} className="team-item">
                      <div className="team-icon">
                        <Layers size={24} />
                      </div>
                      <div className="team-info">
                        <span className="team-name">{ut.teamName}</span>
                        <span className="team-role">{ut.role === 'manager' ? 'Gerente' : 'Membro'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ADMIN */}
              {user.role === 'admin' && (
                <div className="profile-card admin-card">
                  <h3 className="profile-card-title">
                    <Briefcase size={20} /> Administração
                  </h3>
                  <p className="admin-desc">
                    Acesso restrito ao painel de gestão do sistema. Gerencie usuários, configurações e logs do Chronos.
                  </p>
                  <a href="/gestao" className="admin-btn">
                    Painel Gestão <ChevronRight size={18} />
                  </a>
                </div>
              )}

            </div>

            {/* DANGER ZONE */}
            <div className="profile-danger-zone">
              <Form action="/logout" method="post">
                <button className="btn-logout">
                  <LogOut size={16} /> Encerrar Sessão
                </button>
              </Form>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
