import { useState, useRef } from "react";
import { 
  User as UserIcon, 
  LogOut, 
  Save,
  Clock,
  Camera,
  Loader2
} from "lucide-react";
import { useLoaderData, useFetcher, Form } from "react-router";
import { db } from "../db.server";
import { requireUserId, getUser } from "../session.server";

export async function loader({ request }: { request: Request }) {
  await requireUserId(request);
  const user = await getUser(request);
  return { user };
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
  const { user } = useLoaderData<typeof loader>();
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

        <div style={{display: 'flex', flexDirection: 'column', gap: '32px'}}>
          {/* Seção de Informações do Usuário */}
          <div style={{
            display: 'flex', 
            alignItems: 'center', 
            gap: '24px', 
            padding: '24px', 
            background: 'rgba(255,255,255,0.03)', 
            borderRadius: '24px',
            border: '1px solid var(--glass-border)'
          }}>
            <div style={{ position: 'relative' }}>
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '110px', 
                  height: '110px', 
                  background: 'var(--accent-gradient)', 
                  borderRadius: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem',
                  fontWeight: '700',
                  color: 'white',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  border: '3px solid var(--glass-border)',
                  boxShadow: '0 12px 24px rgba(0,0,0,0.3)'
                }}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (user as any).name?.[0]?.toUpperCase()
                )}
                <div style={{
                  position: 'absolute',
                  bottom: '-5px',
                  right: '-5px',
                  background: 'var(--primary)',
                  width: '28px',
                  height: '28px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid #0f172a'
                }}>
                  <Camera size={14} color="white" />
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <input 
                  type="text" 
                  defaultValue={(user as any).name}
                  onBlur={(e) => {
                    if (e.target.value !== (user as any).name) {
                      fetcher.submit({ action: "updateName", name: e.target.value }, { method: "post" });
                    }
                  }}
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: '700',
                    background: 'transparent',
                    border: 'none',
                    padding: '0',
                    color: 'white',
                    width: '100%',
                    outline: 'none',
                    borderBottom: '1px solid transparent'
                  }}
                  onFocus={(e) => e.target.style.borderBottom = '1px solid var(--primary)'}
                />
              </div>
              <p style={{color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px'}}>@{ (user as any).username }</p>
              <div style={{
                padding: '4px 12px',
                background: (user as any).role === 'admin' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.05)',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: '700',
                display: 'inline-block',
                textTransform: 'uppercase',
                color: (user as any).role === 'admin' ? '#a5b4fc' : 'var(--text-muted)',
                letterSpacing: '0.5px',
                border: '1px solid ' + ((user as any).role === 'admin' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.1)')
              }}>
                {(user as any).role}
              </div>
            </div>
          </div>


          {/* Seção de Sair */}
          <div style={{marginTop: '12px'}}>
            <Form action="/logout" method="post">
              <button className="btn-register" style={{
                background: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.1)',
                color: 'var(--text-muted)',
                boxShadow: 'none'
              }}>
                <LogOut size={20} style={{marginRight: '10px'}} /> Sair da Conta
              </button>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
