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
import { Avatar } from "../components/Avatar";
import type { User } from "../types";
import "../styles/management.css";

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

  // Busca vínculos UserTeam para cada usuário
  const userTeamLinks = db.prepare(`
    SELECT ut.userId, ut.teamId, ut.role, t.name as teamName
    FROM UserTeam ut
    JOIN Team t ON ut.teamId = t.id
    ORDER BY t.name
  `).all() as any[];

  // Agrupa por userId
  const userTeamsMap: Record<string, any[]> = {};
  for (const link of userTeamLinks) {
    if (!userTeamsMap[link.userId]) userTeamsMap[link.userId] = [];
    userTeamsMap[link.userId].push(link);
  }

  const usersWithTeams = users.map(u => ({
    ...u,
    userTeams: userTeamsMap[u.id] || []
  }));

  return { teams, users: usersWithTeams };
}

export async function action({ request }: { request: Request }) {
  const user = await getUser(request) as User;
  if (user.role !== "admin") return { error: "Acesso negado" };

  const formData = await request.formData();
  const actionType = formData.get("_action");

  if (actionType === "createTeam") {
    const name = formData.get("name") as string;
    const existing = db.prepare("SELECT id FROM Team WHERE name = ?").get(name);
    if (existing) return { error: "Já existe uma equipe com este nome." };
    db.prepare("INSERT INTO Team (id, name) VALUES (?, ?)").run(crypto.randomUUID(), name);
    return { success: true };
  }

  if (actionType === "deleteTeam") {
    const teamId = formData.get("teamId") as string;
    db.prepare("DELETE FROM UserTeam WHERE teamId = ?").run(teamId);
    db.prepare("UPDATE User SET teamId = NULL WHERE teamId = ?").run(teamId);
    db.prepare("DELETE FROM Team WHERE id = ?").run(teamId);
    return { success: true };
  }

  if (actionType === "addUserTeam") {
    const userId = formData.get("userId") as string;
    const teamId = formData.get("teamId") as string;
    const role = formData.get("role") as string;
    if (!userId || !teamId || !role) return { error: "Dados incompletos." };
    const validRole = role === 'manager' ? 'manager' : 'employee';
    db.prepare("INSERT OR REPLACE INTO UserTeam (userId, teamId, role) VALUES (?, ?, ?)").run(userId, teamId, validRole);
    return { success: true };
  }

  if (actionType === "removeUserTeam") {
    const userId = formData.get("userId") as string;
    const teamId = formData.get("teamId") as string;
    db.prepare("DELETE FROM UserTeam WHERE userId = ? AND teamId = ?").run(userId, teamId);
    return { success: true };
  }

  if (actionType === "removePrimaryTeam") {
    const userId = formData.get("userId") as string;
    db.prepare("UPDATE User SET teamId = NULL WHERE id = ?").run(userId);
    return { success: true };
  }

  if (actionType === "updateUserTeamRole") {
    const userId = formData.get("userId") as string;
    const teamId = formData.get("teamId") as string;
    const role = formData.get("role") as string;
    const validRole = role === 'manager' ? 'manager' : 'employee';
    db.prepare("UPDATE UserTeam SET role = ? WHERE userId = ? AND teamId = ?").run(validRole, userId, teamId);
    return { success: true };
  }

  if (actionType === "deleteUser") {
    const userId = formData.get("userId") as string;
    const deleteTx = db.transaction((id: string) => {
      db.prepare("DELETE FROM PunchRecord WHERE userId = ?").run(id);
      db.prepare("DELETE FROM Shift WHERE userId = ?").run(id);
      db.prepare("DELETE FROM UserTeam WHERE userId = ?").run(id);
      try { db.prepare("DELETE FROM TeamManager WHERE userId = ?").run(id); } catch (e) { }
      db.prepare("DELETE FROM User WHERE id = ?").run(id);
    });
    try {
      deleteTx(userId);
      return { success: true };
    } catch (e: any) {
      return { error: "Erro ao excluir: " + e.message };
    }
  }

  if (actionType === "changePassword") {
    const userId = formData.get("userId") as string;
    const newPassword = formData.get("newPassword") as string;
    if (!newPassword || newPassword.length < 4) return { error: "Senha muito curta." };
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
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const currentUser = users.find(u => u.id === editingUserId);
  const teamFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      teamFormRef.current?.reset();
      // Usamos cast para evitar erro de tipo 'never' no state idle
      const formData = fetcher.formData as FormData | undefined;
      if (formData?.get("_action") === "deleteUser") setEditingUserId(null);
    }
  }, [fetcher.state, fetcher.data, fetcher.formData]);

  return (
    <div className="container">
      <div className="card">
        <div className="header" style={{ marginBottom: '32px' }}>
          <div>
            <h1>Gestão de Equipes</h1>
            <p className="subtitle">Membros e Acessos da Organização</p>
          </div>
          <button className="btn-register" style={{ width: 'auto', padding: '12px 20px', background: 'var(--accent-gradient)' }} onClick={() => setIsTeamModalOpen(true)}>
            <Plus size={18} /> Equipes
          </button>
        </div>

        <div className="history-list">
          {users.map(u => (
            <div key={u.id} style={{ padding: '16px 20px', marginBottom: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Avatar src={u.avatarUrl} name={u.name} size={48} />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '1rem', color: 'white' }}>{u.name} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '400', marginLeft: '4px' }}>@{u.username}</span></div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.65rem', padding: '3px 10px', borderRadius: '8px', background: u.role === 'admin' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255,255,255,0.06)', color: u.role === 'admin' ? '#d8b4fe' : 'var(--text-muted)', border: u.role === 'admin' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid var(--glass-border)', textTransform: 'uppercase', fontWeight: '800' }}>
                      {u.role === 'admin' ? 'Admin' : 'Usuário'}
                    </span>
                    {u.teamName && (
                      <span style={{ fontSize: '0.65rem', padding: '3px 10px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)', border: '1px solid rgba(99, 102, 241, 0.25)', fontWeight: '600' }}>
                        {u.teamName}
                      </span>
                    )}
                    {(u.userTeams || []).map((ut: any) => (
                      <span key={ut.teamId} style={{ fontSize: '0.65rem', padding: '3px 10px', borderRadius: '8px', background: ut.role === 'manager' ? 'rgba(139, 92, 246, 0.18)' : 'rgba(99, 102, 241, 0.10)', color: ut.role === 'manager' ? '#c4b5fd' : 'var(--primary)', border: ut.role === 'manager' ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(99, 102, 241, 0.2)', fontWeight: '600' }}>
                        {ut.teamName}{ut.role === 'manager' ? ' · Ger.' : ''}
                      </span>
                    ))}
                    {!u.teamId && (!u.userTeams || u.userTeams.length === 0) && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem equipe</span>
                    )}
                  </div>
                </div>
              </div>
              <button className="icon-btn" style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }} onClick={() => setEditingUserId(u.id)}><Edit3 size={18} /></button>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} title="Gerenciar Equipes" icon={<Layers size={20} />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <fetcher.Form method="post" ref={teamFormRef}>
            <input type="hidden" name="_action" value="createTeam" />
            <div className="input-group"><label style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Criar Nova Equipe</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" name="name" required placeholder="Nome da equipe" style={{ margin: 0, height: '54px' }} />
                <button type="submit" className="btn-register" style={{ width: 'auto', padding: '0 25px', height: '54px', margin: 0, borderRadius: '16px' }}>Criar</button>
              </div>
            </div>
          </fetcher.Form>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
            <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>Equipes Atuais</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {teams.map(t => (
                <div key={t.id} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '600' }}>{t.name}</span>
                  <fetcher.Form method="post" onSubmit={(e) => !confirm(`Excluir equipe "${t.name}"?`) && e.preventDefault()}>
                    <input type="hidden" name="_action" value="deleteTeam" /><input type="hidden" name="teamId" value={t.id} />
                    <button type="submit" className="icon-btn" style={{ color: '#ef4444', background: 'transparent' }}><Trash2 size={16} /></button>
                  </fetcher.Form>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!editingUserId} onClose={() => setEditingUserId(null)} title="Editar Acesso" icon={<ShieldCheck size={20} />}>
        {currentUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Equipes e Cargos</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {currentUser.teamId && currentUser.teamName && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ShieldCheck size={14} style={{ color: '#d8b4fe' }} />
                      <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{currentUser.teamName} (Principal)</span>
                    </div>
                    <fetcher.Form method="post" style={{ margin: 0 }}>
                      <input type="hidden" name="_action" value="removePrimaryTeam" /><input type="hidden" name="userId" value={currentUser.id} />
                      <button type="submit" className="icon-btn" style={{ color: '#ef4444', background: 'transparent' }}><Trash2 size={14} /></button>
                    </fetcher.Form>
                  </div>
                )}
                {(currentUser.userTeams || []).map((ut: any) => (
                  <div key={ut.teamId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{ut.teamName}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <fetcher.Form method="post" style={{ margin: 0 }}>
                        <input type="hidden" name="_action" value="updateUserTeamRole" /><input type="hidden" name="userId" value={currentUser.id} /><input type="hidden" name="teamId" value={ut.teamId} />
                        <select name="role" defaultValue={ut.role} onChange={(e) => fetcher.submit(e.currentTarget.form)} style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '8px', margin: 0, width: 'auto' }}>
                          <option value="employee">Funcionário</option><option value="manager">Gerente</option>
                        </select>
                      </fetcher.Form>
                      <fetcher.Form method="post" style={{ margin: 0 }}>
                        <input type="hidden" name="_action" value="removeUserTeam" /><input type="hidden" name="userId" value={currentUser.id} /><input type="hidden" name="teamId" value={ut.teamId} />
                        <button type="submit" className="icon-btn" style={{ color: '#ef4444', background: 'transparent' }}><Trash2 size={14} /></button>
                      </fetcher.Form>
                    </div>
                  </div>
                ))}
                {!currentUser.teamId && (currentUser.userTeams || []).length === 0 && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Nenhuma equipe vinculada ainda.</p>
                )}
              </div>
              <fetcher.Form method="post">
                <input type="hidden" name="_action" value="addUserTeam" /><input type="hidden" name="userId" value={currentUser.id} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select name="teamId" style={{ flex: 2, padding: '10px 12px', fontSize: '0.85rem', borderRadius: '12px' }} onChange={(e) => e.target.value && fetcher.submit(e.currentTarget.form)}>
                    <option value="">+ Adicionar equipe...</option>
                    {teams.filter(t => t.id !== currentUser.teamId && !(currentUser.userTeams || []).some((ut: any) => ut.teamId === t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <select name="role" style={{ flex: 1, padding: '10px 12px', fontSize: '0.85rem', borderRadius: '12px' }}><option value="employee">Funcionário</option><option value="manager">Gerente</option></select>
                </div>
              </fetcher.Form>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
              <fetcher.Form method="post">
                <input type="hidden" name="_action" value="changePassword" /><input type="hidden" name="userId" value={currentUser.id} /><label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Alterar Senha</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" name="newPassword" placeholder="Nova senha" style={{ flex: 1, margin: 0 }} />
                  <button type="submit" className="btn-register" style={{ width: 'auto', padding: '0 20px' }}>Salvar</button>
                </div>
              </fetcher.Form>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
              <fetcher.Form method="post" onSubmit={(e) => !confirm("Excluir usuário permanentemente?") && e.preventDefault()}>
                <input type="hidden" name="_action" value="deleteUser" /><input type="hidden" name="userId" value={currentUser.id} />
                <button type="submit" style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  }}
                >
                  <Trash2 size={16} /> Excluir Usuário
                </button>
              </fetcher.Form>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
