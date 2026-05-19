import { useState, useRef } from "react";
import { 
  User as UserIcon, 
  LogOut, 
  Save,
  Clock,
  Camera,
  Loader2,
  Briefcase,
  Layers,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { useLoaderData, useFetcher, Form, redirect } from "react-router";
import { db } from "../services/db.server";
import { requireUserId, getUser } from "../services/session.server";
import { Avatar } from "../components/Avatar";
import "../styles/profile.css";

export async function loader({ request }: { request: Request }) {
  await requireUserId(request);
  const user = await getUser(request) as any;
  if (!user) throw redirect("/login");
  
  let team = null;
  if (user.teamId) {
    team = db.prepare("SELECT name FROM Team WHERE id = ?").get(user.teamId);
  }

  return { 
    user, 
    team: team as { name: string } | null
  };
}

export async function action({ request }: { request: Request }) {
  const userId = await requireUserId(request);
  const user = await getUser(request);
  
  if (!user) {
    throw new Response("Usuário não encontrado", { status: 404 });
  }

  const formData = await request.formData();
  const actionType = formData.get("action");


  if (actionType === "updateAvatar") {
    const avatarData = formData.get("avatar") as string;
    db.prepare("UPDATE User SET avatarUrl = ? WHERE id = ?").run(avatarData, userId);
    return { success: true, message: "Foto atualizada!" };
  }

  if (actionType === "updateName") {
    const name = formData.get("name") as string;
    db.prepare("UPDATE User SET name = ? WHERE id = ?").run(name, userId);
    return { success: true, message: "Nome atualizado!" };
  }

  return null;
}

export default function Profile() {
  const { user, team } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [goal, setGoal] = useState((user as any).goal || "08:00");
  const [avatarPreview, setAvatarPreview] = useState((user as any).avatarUrl);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatarPreview(base64String);
        fetcher.submit(
          { action: "updateAvatar", avatar: base64String },
          { method: "post" }
        );
      };
      reader.readAsDataURL(file);
    }
  };

  const isSaving = fetcher.state !== "idle";

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
          {/* Seção de Informações do Usuário */}
          <div className="profile-user-card">
            <div className="profile-avatar-wrapper">
              <Avatar
                src={avatarPreview}
                name={(user as any).name}
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
                  defaultValue={(user as any).name}
                  onBlur={(e) => {
                    if (e.target.value !== (user as any).name) {
                      fetcher.submit({ action: "updateName", name: e.target.value }, { method: "post" });
                    }
                  }}
                  className="profile-name-input"
                />
              </div>
              <p className="profile-username-text">@{ (user as any).username }</p>
              <div className="profile-badges-row">
                <div className={(user as any).role === 'admin' ? 'profile-badge-role-admin' : 'profile-badge-role-user'}>
                  {(user as any).role === 'admin' ? 'Admin' : 'Usuário'}
                </div>
                
                {team && (
                  <div className="profile-badge-team-primary">
                    <ShieldCheck size={14} /> {team.name} (Principal)
                  </div>
                )}
                {((user as any).userTeams || []).map((ut: any) => (
                  <div key={ut.teamId} className={ut.role === 'manager' ? 'profile-badge-team-manager' : 'profile-badge-team-employee'}>
                    <Layers size={14} /> {ut.teamName} {ut.role === 'manager' ? '· Ger.' : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Seção de Gestão (Apenas Admin) */}
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


          {/* Seção de Sair */}
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
