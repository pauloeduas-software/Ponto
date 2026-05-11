import { useState, useRef, useEffect } from "react";
import {
  Users,
  Plus,
  Edit3,
  Layers,
  ShieldCheck,
  ChevronRight,
  UserPlus,
  Trash2,
  Lock,
  Key
} from "lucide-react";
import bcrypt from "bcryptjs";
import { useLoaderData, useFetcher } from "react-router";
import { db } from "../db.server";
import { requireUserId, getUser } from "../session.server";
import { Modal } from "../components/Modal";
import type { User } from "../types";

export async function loader({ request }: { request: Request }) {
  await requireUserId(request);
  const user = await getUser(request) as User;

  if (user.role !== "admin") {
    throw new Response("Acesso negado", { status: 403 });
  }

  const teams = db.prepare("SELECT * FROM Team ORDER BY name").all() as any[];
  const users = db.prepare(`
    SELECT u.*, t.name as teamName 
    FROM User u 
    LEFT JOIN Team t ON u.teamId = t.id 
    ORDER BY u.name
  `).all() as any[];

  return { teams, users };
}

export async function action({ request }: { request: Request }) {
  const user = await getUser(request) as User;
  if (user.role !== "admin") return { error: "Acesso negado" };

  const formData = await request.formData();
  const actionType = formData.get("_action");

  if (actionType === "createTeam") {
    const name = formData.get("name") as string;

    const existing = db.prepare("SELECT id FROM Team WHERE name = ?").get(name);
    if (existing) {
      return { error: "Já existe uma equipe com este nome." };
    }

    db.prepare("INSERT INTO Team (id, name) VALUES (?, ?)").run(crypto.randomUUID(), name);
    return { success: true };
  }

  if (actionType === "deleteTeam") {
    const teamId = formData.get("teamId") as string;
    // Remove a equipe de todos os usuários vinculados antes de deletar a equipe
    db.prepare("UPDATE User SET teamId = NULL WHERE teamId = ?").run(teamId);
    db.prepare("DELETE FROM Team WHERE id = ?").run(teamId);
    return { success: true };
  }

  if (actionType === "updateUser") {
    const userId = formData.get("userId") as string;
    const teamId = formData.get("teamId") as string;
    const role = formData.get("role") as string;

    const existingUser = db.prepare("SELECT role FROM User WHERE id = ?").get(userId) as any;

    let finalRole = role;
    // TRAVA DE SEGURANÇA: Se o usuário já é Admin, ele NUNCA pode ser rebaixado via interface.
    if (existingUser?.role === 'admin') {
      finalRole = 'admin';
    } else if (role === 'admin') {
      // Se NÃO era admin e tentou virar admin via formulário, bloqueia.
      return { error: "Ação não permitida via interface." };
    }

    db.prepare("UPDATE User SET teamId = ?, role = ? WHERE id = ?")
      .run(teamId || null, finalRole, userId);
    return { success: true };
  }

  if (actionType === "deleteUser") {
    const userId = formData.get("userId") as string;
    // Cascade delete manual (se o banco não tiver FK cascade)
    db.prepare("DELETE FROM PunchRecord WHERE userId = ?").run(userId);
    db.prepare("DELETE FROM Shift WHERE userId = ?").run(userId);
    db.prepare("DELETE FROM User WHERE id = ?").run(userId);
    return { success: true };
  }

  if (actionType === "changePassword") {
    const userId = formData.get("userId") as string;
    const newPassword = formData.get("newPassword") as string;

    if (!newPassword || newPassword.length < 4) {
      return { error: "A senha deve ter pelo menos 4 caracteres." };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare("UPDATE User SET password = ? WHERE id = ?").run(hashedPassword, userId);
    return { success: true };
  }

  return null;
}

export default function Management() {
  const { teams, users } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const teamFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      teamFormRef.current?.reset();
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <div className="container">
      <div className="card">
        <div className="header" style={{ marginBottom: '32px' }}>
          <div>
            <h1>Gestão de Equipes</h1>
            <p className="subtitle">Membros e Acessos da Organização</p>
          </div>
          <button
            className="btn-register"
            style={{ width: 'auto', padding: '12px 20px', background: 'var(--accent-gradient)' }}
            onClick={() => setIsTeamModalOpen(true)}
          >
            <Plus size={18} /> Equipes
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="history-list" style={{ paddingRight: '4px' }}>
            {users.map(u => (
              <div key={u.id} style={{
                padding: '16px 20px',
                marginBottom: '12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--glass-border)',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '14px',
                    background: 'var(--accent-gradient)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1.2rem',
                    color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}>
                    {u.avatarUrl ? <img src={u.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }} /> : u.name?.[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: 'white' }}>
                      {u.name} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '400', marginLeft: '4px' }}>@{u.username}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.65rem', padding: '3px 10px', borderRadius: '8px',
                        background: u.role === 'admin' ? 'rgba(168, 85, 247, 0.2)' : u.role === 'manager' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(167, 139, 250, 0.05)',
                        color: u.role === 'admin' ? '#d8b4fe' : u.role === 'manager' ? '#c4b5fd' : '#a78bfa',
                        border: u.role === 'admin' ? '1px solid rgba(168, 85, 247, 0.3)' : u.role === 'manager' ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid rgba(167, 139, 250, 0.1)',
                        textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px'
                      }}>
                        {u.role === 'manager' ? 'Gerente' : u.role === 'admin' ? 'Admin' : 'Funcionário'}
                      </span>
                      {u.teamName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600' }}>
                          <Layers size={12} /> {u.teamName}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  className="icon-btn"
                  style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}
                  onClick={() => setEditingUser(u)}
                >
                  <Edit3 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Nova Equipe */}
      <Modal isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} title="Gerenciar Equipes" icon={<Layers size={20} />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Formulário de Criação (Agora no Topo) */}
          <fetcher.Form method="post" ref={teamFormRef}>
            <input type="hidden" name="_action" value="createTeam" />
            <div className="input-group">
              <label style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Criar Nova Equipe</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  placeholder="Ex: Vendas, TI, Suporte..." 
                  style={{ margin: 0, height: '54px' }} 
                />
                <button 
                  type="submit" 
                  className="btn-register" 
                  style={{ 
                    width: 'auto', 
                    padding: '0 25px', 
                    height: '54px', 
                    margin: 0,
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  Criar
                </button>
              </div>
              {fetcher.data?.error && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '10px', fontWeight: '600' }}>
                  {fetcher.data.error}
                </p>
              )}
            </div>
          </fetcher.Form>

          {/* Lista de Equipes Existentes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
            <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '4px' }}>Equipes Atuais</h3>
            {teams.length === 0 ? (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Nenhuma equipe cadastrada.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {teams.map(t => (
                  <div key={t.id} style={{
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontWeight: '600' }}>{t.name}</span>
                    <fetcher.Form method="post" onSubmit={(e) => {
                      if (!confirm(`Tem certeza que deseja excluir a equipe "${t.name}"? Os usuários desta equipe ficarão sem equipe definida.`)) {
                        e.preventDefault();
                      }
                    }}>
                      <input type="hidden" name="_action" value="deleteTeam" />
                      <input type="hidden" name="teamId" value={t.id} />
                      <button type="submit" className="icon-btn" style={{ color: '#ef4444', background: 'transparent' }}>
                        <Trash2 size={16} />
                      </button>
                    </fetcher.Form>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal Editar Usuário */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Editar Acesso" icon={<ShieldCheck size={20} />}>
        {editingUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <fetcher.Form method="post" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <input type="hidden" name="_action" value="updateUser" />
              <input type="hidden" name="userId" value={editingUser.id} />

              <div className="input-group">
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Equipe</label>
                <select
                  name="teamId"
                  defaultValue={editingUser.teamId || ""}
                  onChange={(e) => fetcher.submit(e.currentTarget.form)}
                >
                  <option value="">Nenhuma Equipe</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Nível de Acesso</label>
                <select
                  name="role"
                  defaultValue={editingUser.role}
                  onChange={(e) => fetcher.submit(e.currentTarget.form)}
                >
                  <option value="employee">Funcionário</option>
                  <option value="manager">Gerente</option>
                  {editingUser.role === 'admin' && <option value="admin">Admin</option>}
                </select>
              </div>
            </fetcher.Form>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
              <fetcher.Form method="post" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input type="hidden" name="_action" value="changePassword" />
                <input type="hidden" name="userId" value={editingUser.id} />

                <div className="input-group">
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Alterar Senha</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Key size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        name="newPassword"
                        placeholder="Nova senha"
                        style={{ paddingLeft: '44px', margin: 0 }}
                      />
                    </div>
                    <button type="submit" className="btn-register" style={{ width: 'auto', padding: '0 20px' }}>Salvar</button>
                  </div>
                </div>
              </fetcher.Form>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
              <fetcher.Form
                method="post"
                onSubmit={(e) => {
                  if (!confirm("Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita e todos os registros de ponto serão perdidos.")) {
                    e.preventDefault();
                  } else {
                    setEditingUser(null);
                  }
                }}
              >
                <input type="hidden" name="_action" value="deleteUser" />
                <input type="hidden" name="userId" value={editingUser.id} />
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '16px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={18} /> Excluir Conta permanentemente
                </button>
              </fetcher.Form>
            </div>

            <div style={{ height: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {fetcher.state !== 'idle' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600' }}>Processando...</span>
              )}
            </div>
          </div>
        )}
      </Modal>

      <style dangerouslySetInnerHTML={{
        __html: `
        select {
          width: 100%;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 14px 18px;
          color: white;
          font-size: 1rem;
          appearance: none;
          cursor: pointer;
          outline: none;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
          transition: border-color 0.2s;
        }
        select:focus {
          border-color: var(--primary);
        }
        select option {
          background: #0f172a;
          color: white;
          padding: 10px;
        }
      `}} />
    </div>
  );
}
