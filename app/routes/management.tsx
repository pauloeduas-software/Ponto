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
import { useLoaderData, useFetcher } from "react-router";
import { requireUserId, getUser } from "../services/session.server";
import { Modal } from "../components/Modal";
import { Avatar } from "../components/Avatar";
import type { User } from "../types";
import "../styles/management.css";
import { getManagementData, handleManagementAction } from "../services/managementService.server";

export async function loader({ request }: { request: Request }) {
  await requireUserId(request);
  const user = await getUser(request) as User;
  return getManagementData(user);
}

export async function action({ request }: { request: Request }) {
  const user = await getUser(request) as User;
  const formData = await request.formData();
  return handleManagementAction(user, formData);
}

export default function Management() {
  const { teams, users } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const currentUser = users.find(u => u.id === editingUserId);
  const teamFormRef = useRef<HTMLFormElement>(null);
  const passwordFormRef = useRef<HTMLFormElement>(null);

  // Limpa o feedback de senha ao fechar ou trocar de usuário
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
    <div className="container">
      <div className="card">
        <div className="header management-header">
          <div>
            <h1>Gestão de Equipes</h1>
            <p className="subtitle">Membros e Acessos da Organização</p>
          </div>
          <button className="btn-register btn-teams-action" onClick={() => setIsTeamModalOpen(true)}>
            <Plus size={18} /> Equipes
          </button>
        </div>

        <div className="history-list">
          {users.map(u => (
            <div key={u.id} className="user-card-item">
              <div className="user-card-profile-col">
                <Avatar src={u.avatarUrl} name={u.name} size={48} />
                <div>
                  <div className="user-card-name-row">{u.name} <span className="user-card-username">@{u.username}</span></div>
                  <div className="user-card-badge-row">
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
              </div>
              <button className="icon-btn btn-user-edit" onClick={() => setEditingUserId(u.id)}><Edit3 size={18} /></button>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} title="Gerenciar Equipes" icon={<Layers size={20} />}>
        <div className="modal-grid-gap-32">
          <fetcher.Form method="post" ref={teamFormRef}>
            <input type="hidden" name="_action" value="createTeam" />
            <div className="input-group"><label className="modal-section-label-uppercase">Criar Nova Equipe</label>
              <div className="modal-row-gap-8">
                <input type="text" name="name" required placeholder="Nome da equipe" className="input-team-name" />
                <button type="submit" className="btn-register modal-input-large-btn">Criar</button>
              </div>
            </div>
          </fetcher.Form>
          <div className="modal-divider-top">
            <h3 className="modal-section-label-uppercase">Equipes Atuais</h3>
            <div className="modal-grid-gap-8">
              {teams.map(t => (
                <div key={t.id} className="team-list-card-item">
                  <span className="team-list-name">{t.name}</span>
                  <fetcher.Form method="post" onSubmit={(e) => !confirm(`Excluir equipe "${t.name}"?`) && e.preventDefault()}>
                    <input type="hidden" name="_action" value="deleteTeam" /><input type="hidden" name="teamId" value={t.id} />
                    <button type="submit" className="icon-btn btn-icon-red-transparent"><Trash2 size={16} /></button>
                  </fetcher.Form>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!editingUserId} onClose={() => setEditingUserId(null)} title="Editar Acesso" icon={<ShieldCheck size={20} />}>
        {currentUser && (
          <div className="modal-grid-gap-24">
            <div>
              <label className="modal-label-small-uppercase">Equipes e Cargos</label>
              <div className="modal-grid-gap-8 modal-team-list-container">
                {currentUser.teamId && currentUser.teamName && (
                  <div className="user-team-primary-container">
                    <div className="user-team-primary-left">
                      <ShieldCheck size={14} className="icon-shield-purple" />
                      <span className="user-team-primary-text">{currentUser.teamName} (Principal)</span>
                    </div>
                    <fetcher.Form method="post" className="form-no-margin">
                      <input type="hidden" name="_action" value="removePrimaryTeam" /><input type="hidden" name="userId" value={currentUser.id} />
                      <button type="submit" className="icon-btn btn-icon-red-transparent"><Trash2 size={14} /></button>
                    </fetcher.Form>
                  </div>
                )}
                {(currentUser.userTeams || []).map((ut: any) => (
                  <div key={ut.teamId} className="user-team-link-row">
                    <span className="user-team-name-text">{ut.teamName}</span>
                    <div className="user-team-link-actions">
                      <fetcher.Form method="post" className="form-no-margin">
                        <input type="hidden" name="_action" value="updateUserTeamRole" /><input type="hidden" name="userId" value={currentUser.id} /><input type="hidden" name="teamId" value={ut.teamId} />
                        <select name="role" defaultValue={ut.role} onChange={(e) => fetcher.submit(e.currentTarget.form)} className="user-team-link-select">
                          <option value="employee">Funcionário</option><option value="manager">Gerente</option>
                        </select>
                      </fetcher.Form>
                      <fetcher.Form method="post" className="form-no-margin">
                        <input type="hidden" name="_action" value="removeUserTeam" /><input type="hidden" name="userId" value={currentUser.id} /><input type="hidden" name="teamId" value={ut.teamId} />
                        <button type="submit" className="icon-btn btn-icon-red-transparent"><Trash2 size={14} /></button>
                      </fetcher.Form>
                    </div>
                  </div>
                ))}
                {!currentUser.teamId && (currentUser.userTeams || []).length === 0 && (
                  <p className="modal-empty-text">Nenhuma equipe vinculada ainda.</p>
                )}
              </div>
              <fetcher.Form method="post">
                <input type="hidden" name="_action" value="addUserTeam" /><input type="hidden" name="userId" value={currentUser.id} />
                <div className="modal-row-gap-8">
                  <select name="teamId" className="select-team-add" onChange={(e) => e.target.value && fetcher.submit(e.currentTarget.form)}>
                    <option value="">+ Adicionar equipe...</option>
                    {teams.filter(t => t.id !== currentUser.teamId && !(currentUser.userTeams || []).some((ut: any) => ut.teamId === t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <select name="role" className="select-role-add"><option value="employee">Funcionário</option><option value="manager">Gerente</option></select>
                </div>
              </fetcher.Form>
            </div>
            <div className="modal-divider-top">
              <fetcher.Form method="post" ref={passwordFormRef}>
                <input type="hidden" name="_action" value="changePassword" /><input type="hidden" name="userId" value={currentUser.id} /><label htmlFor="newPassword" className="modal-label-small-uppercase">Alterar Senha</label>
                <div className="modal-row-gap-8">
                  <input type="password" id="newPassword" name="newPassword" placeholder="Nova senha (mín. 4 caracteres)" className="input-password-change" autoComplete="new-password" required />
                  <button type="submit" className="btn-register btn-save-password">
                    {fetcher.state === "submitting" && fetcher.formData?.get("_action") === "changePassword" ? "Salvando..." : "Salvar"}
                  </button>
                </div>
                {passwordFeedback?.error && (
                  <p style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "8px", fontWeight: 500 }}>
                    {passwordFeedback.error}
                  </p>
                )}
                {passwordFeedback?.success && passwordFeedback?.message && (
                  <p style={{ color: "#10b981", fontSize: "0.8rem", marginTop: "8px", fontWeight: 500 }}>
                    {passwordFeedback.message}
                  </p>
                )}
              </fetcher.Form>
            </div>
            <div className="modal-divider-top">
              <fetcher.Form method="post" onSubmit={(e) => !confirm("Excluir usuário permanentemente?") && e.preventDefault()}>
                <input type="hidden" name="_action" value="deleteUser" /><input type="hidden" name="userId" value={currentUser.id} />
                <button type="submit" className="btn-delete-user-glass">
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
