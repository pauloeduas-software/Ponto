import { useState, useRef, useEffect } from "react";
import { Users, Plus, Edit3, Layers, ShieldCheck, ChevronRight, UserPlus, Trash2, Lock, Key } from "lucide-react";
import { useFetcher } from "react-router";
import { Modal } from "../components/Modal";
import { Avatar } from "../components/Avatar";
import "../styles/management.css";

interface ManagementViewProps {
  teams: any[];
  users: any[];
}

export function ManagementView({ teams, users }: ManagementViewProps) {
  const fetcher = useFetcher();

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const currentUser = users.find(u => u.id === editingUserId);
  const teamFormRef = useRef<HTMLFormElement>(null);
  const passwordFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setPasswordFeedback(null);
  }, [editingUserId]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.success) {
        teamFormRef.current?.reset();
      }
      
      const action = fetcher.data?.action;
      if (action === "deleteUser" && fetcher.data?.success) {
        setEditingUserId(null);
      } else if (action === "changePassword") {
        if (fetcher.data?.success) {
          passwordFormRef.current?.reset();
          setPasswordFeedback({ success: true, message: fetcher.data?.message });
        } else if (fetcher.data?.error) {
          setPasswordFeedback({ success: false, error: fetcher.data?.error });
        }
      }
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <div className="page-shell">
      <div className="page-topbar">
        <div className="page-topbar-left">
          <h1 className="page-title">Gestão de Usuários</h1>
        </div>
        <div className="page-topbar-right">
          <button className="action-btn" onClick={() => setIsTeamModalOpen(true)}>
            <Plus size={16} /> Gerenciar Equipes
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="page-main">
          <div className="users-grid">
          {users.map(u => (
            <div key={u.id} className="user-grid-card clickable-card" onClick={() => setEditingUserId(u.id)}>
              <div className="user-grid-header">
                <Avatar src={u.avatarUrl} name={u.name} size={48} style={{ borderRadius: '50%' }} />
              </div>
              <div className="user-grid-info">
                <h3 className="user-grid-name">{u.name}</h3>
                <span className="user-grid-username">@{u.username}</span>
              </div>
              <div className="user-grid-badges">
                <span className={u.role === 'admin' ? 'badge-role-admin' : 'badge-role-user'}>
                  {u.role === 'admin' ? 'Admin' : 'Usuário'}
                </span>
                {u.teamName && (
                  <span className="badge-team-primary">
                    {u.teamName}
                  </span>
                )}
                {(u.userTeams || []).map((ut: any) => (
                  <span key={ut.teamId} className={ut.role === 'manager' ? 'badge-team-manager' : 'badge-team-employee'}>
                    {ut.teamName}{ut.role === 'manager' ? ' · Ger.' : ''}
                  </span>
                ))}
                {!u.teamId && (!u.userTeams || u.userTeams.length === 0) && (
                  <span className="badge-team-empty">Sem equipe</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

      <Modal isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} title="Gerenciar Equipes" icon={<Layers size={28} />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="settings-section">
            <div className="settings-section-header">
              <h3 className="settings-section-title">Criar Nova Equipe</h3>
              <p className="settings-section-desc">Adicione novos departamentos ou times ao sistema.</p>
            </div>
            <fetcher.Form method="post" ref={teamFormRef}>
              <input type="hidden" name="_action" value="createTeam" />
              <div className="settings-card">
                <div className="settings-card-row">
                  <input type="text" name="name" required placeholder="Nome da equipe (ex: Financeiro)" className="settings-input" />
                  <button type="submit" className="settings-btn-primary" style={{ whiteSpace: 'nowrap' }}>
                    {fetcher.state === "submitting" && fetcher.formData?.get("_action") === "createTeam" ? "Criando..." : "Criar Equipe"}
                  </button>
                </div>
              </div>
            </fetcher.Form>
          </div>

          <div className="settings-section">
            <div className="settings-section-header">
              <h3 className="settings-section-title">Equipes Atuais</h3>
              <p className="settings-section-desc">Gerencie as equipes existentes. A exclusão removerá os usuários destas equipes.</p>
            </div>
            <div className="settings-card">
              {teams.map(t => (
                <div key={t.id} className="settings-card-row">
                  <span className="team-list-name" style={{ fontWeight: 500 }}>{t.name}</span>
                  <fetcher.Form method="post" onSubmit={(e) => !confirm(`Tem certeza que deseja excluir a equipe "${t.name}" permanentemente?`) && e.preventDefault()} className="form-no-margin">
                    <input type="hidden" name="_action" value="deleteTeam" /><input type="hidden" name="teamId" value={t.id} />
                    <button type="submit" className="btn-icon-subtle" title="Excluir equipe"><Trash2 size={16} /></button>
                  </fetcher.Form>
                </div>
              ))}
              {teams.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
                  Nenhuma equipe cadastrada.
                </div>
              )}
            </div>
          </div>

        </div>
      </Modal>

      <Modal isOpen={!!editingUserId} onClose={() => setEditingUserId(null)} title="Editar Acesso" icon={<ShieldCheck size={28} />}>
        {currentUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Equipes e Cargos Section */}
            <div className="settings-section">
              <div className="settings-section-header">
                <h3 className="settings-section-title">Equipes e Cargos</h3>
                <p className="settings-section-desc">Gerencie o nível de acesso e as equipes do usuário.</p>
              </div>
              <div className="settings-card">
                {currentUser.teamId && currentUser.teamName && (
                  <div className="settings-card-row" style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <fetcher.Form method="post" className="form-no-margin" style={{ flex: 1 }}>
                        <input type="hidden" name="_action" value="updatePrimaryTeam" /><input type="hidden" name="userId" value={currentUser.id} />
                        <select name="teamId" defaultValue={currentUser.teamId} onChange={(e) => fetcher.submit(e.currentTarget.form)} className="settings-select" style={{ maxWidth: '200px' }}>
                          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </fetcher.Form>
                      <span className="user-team-primary-badge">Principal</span>
                    </div>
                    <fetcher.Form method="post" className="form-no-margin">
                      <input type="hidden" name="_action" value="removePrimaryTeam" /><input type="hidden" name="userId" value={currentUser.id} />
                      <button type="submit" className="btn-icon-subtle" title="Remover equipe principal"><Trash2 size={16} /></button>
                    </fetcher.Form>
                  </div>
                )}
                
                {(currentUser.userTeams || []).map((ut: any) => (
                  <div key={ut.teamId} className="settings-card-row">
                    <span className="team-list-name">{ut.teamName}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <fetcher.Form method="post" className="form-no-margin">
                        <input type="hidden" name="_action" value="updateUserTeamRole" /><input type="hidden" name="userId" value={currentUser.id} /><input type="hidden" name="teamId" value={ut.teamId} />
                        <select name="role" defaultValue={ut.role} onChange={(e) => fetcher.submit(e.currentTarget.form)} className="settings-select">
                          <option value="employee">Funcionário</option><option value="manager">Gerente</option>
                        </select>
                      </fetcher.Form>
                      <fetcher.Form method="post" className="form-no-margin">
                        <input type="hidden" name="_action" value="removeUserTeam" /><input type="hidden" name="userId" value={currentUser.id} /><input type="hidden" name="teamId" value={ut.teamId} />
                        <button type="submit" className="btn-icon-subtle" title="Remover equipe"><Trash2 size={16} /></button>
                      </fetcher.Form>
                    </div>
                  </div>
                ))}
                
                {!currentUser.teamId && (currentUser.userTeams || []).length === 0 && (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    Nenhuma equipe vinculada.
                  </div>
                )}

                <div className="settings-card-footer">
                  <fetcher.Form method="post" style={{ width: '100%', display: 'flex', gap: '8px' }}>
                    <input type="hidden" name="_action" value="addUserTeam" /><input type="hidden" name="userId" value={currentUser.id} />
                    <select name="teamId" className="settings-select" style={{ flex: 1 }}>
                      <option value="">+ Adicionar equipe...</option>
                      {teams.filter(t => t.id !== currentUser.teamId && !(currentUser.userTeams || []).some((ut: any) => ut.teamId === t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <select name="role" className="settings-select" style={{ width: '130px' }}><option value="employee">Funcionário</option><option value="manager">Gerente</option></select>
                    <button type="submit" className="settings-btn-primary" style={{ padding: '6px 12px' }}>Add</button>
                  </fetcher.Form>
                </div>
              </div>
            </div>

            {/* Segurança Section */}
            <div className="settings-section">
              <div className="settings-section-header">
                <h3 className="settings-section-title">Segurança</h3>
                <p className="settings-section-desc">Defina uma nova senha para este acesso.</p>
              </div>
              <fetcher.Form method="post" ref={passwordFormRef}>
                <input type="hidden" name="_action" value="changePassword" /><input type="hidden" name="userId" value={currentUser.id} />
                <div className="settings-card">
                  <div className="settings-card-row">
                    <input type="password" id="newPassword" name="newPassword" placeholder="Nova senha (mín. 4 caracteres)" autoComplete="new-password" required className="settings-input" />
                    <button type="submit" className="settings-btn-primary" style={{ whiteSpace: 'nowrap' }}>
                      {fetcher.state === "submitting" && fetcher.formData?.get("_action") === "changePassword" ? "Salvando..." : "Alterar Senha"}
                    </button>
                  </div>
                  {(passwordFeedback?.error || passwordFeedback?.success) && (
                    <div className="settings-card-row" style={{ paddingTop: '8px', paddingBottom: '8px', background: 'rgba(0,0,0,0.2)' }}>
                      {passwordFeedback?.error && <p className="password-feedback-error" style={{ margin: 0 }}>{passwordFeedback.error}</p>}
                      {passwordFeedback?.success && passwordFeedback?.message && <p className="password-feedback-success" style={{ margin: 0 }}>{passwordFeedback.message}</p>}
                    </div>
                  )}
                </div>
              </fetcher.Form>
            </div>

            {/* Danger Zone */}
            <div className="settings-section danger-zone">
              <div className="danger-zone-content">
                <div className="settings-section-header">
                  <h3 className="settings-section-title" style={{ color: '#ef4444' }}>Excluir Conta</h3>
                  <p className="settings-section-desc">Esta ação é irreversível e removerá todos os dados e o acesso deste usuário.</p>
                </div>
                <fetcher.Form method="post" onSubmit={(e) => !confirm("Excluir usuário permanentemente?") && e.preventDefault()}>
                  <input type="hidden" name="_action" value="deleteUser" /><input type="hidden" name="userId" value={currentUser.id} />
                  <button type="submit" className="danger-btn">
                    Excluir Usuário
                  </button>
                </fetcher.Form>
              </div>
            </div>

          </div>
        )}
      </Modal>
    </div>
  );
}
