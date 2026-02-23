import { useState, useEffect } from "react";
import { Users, Bell, Link, Info, Loader2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import { isAdmin, getNome, fetchUsuarios, criarUsuario, alterarStatusUsuario } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const LOGO_URL = "https://i.postimg.cc/Twbjzshm/decatron.png";

const sidebarItems = [
  { key: "usuarios", label: "Usuários", icon: Users, active: true },
  { key: "notificacoes", label: "Notificações", icon: Bell, active: false },
  { key: "integracoes", label: "Integrações", icon: Link, active: false },
  { key: "sobre", label: "Sobre o Sistema", icon: Info, active: true },
];

interface UserData {
  id: number;
  name?: string;
  nome?: string;
  email: string;
  active?: boolean;
  status?: string;
  role?: string;
  perfil?: string;
}

export default function ConfiguracoesPage() {
  const [section, setSection] = useState("usuarios");
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // New user form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("Analista");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  const admin = isAdmin();
  const currentUserName = getNome();

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await fetchUsuarios();
      setUsers(Array.isArray(data) ? data : data?.results || []);
    } catch { setUsers([]); }
    setUsersLoading(false);
  };

  useEffect(() => { if (section === "usuarios") loadUsers(); }, [section]);

  const handleToggleStatus = async (user: UserData) => {
    const isActive = user.active !== false && user.status !== "Inativo";
    setActionLoading(user.id);
    try {
      await alterarStatusUsuario(user.id, !isActive);
      await loadUsers();
    } catch {}
    setActionLoading(null);
  };

  const handleCreate = async () => {
    setCreateError("");
    if (!newName || !newEmail || !newPassword) { setCreateError("Preencha todos os campos"); return; }
    setCreateLoading(true);
    try {
      await criarUsuario({ name: newName, email: newEmail, password: newPassword, role: newRole.toLowerCase() });
      setShowModal(false);
      setNewName(""); setNewEmail(""); setNewPassword(""); setNewRole("Analista");
      await loadUsers();
    } catch (err: any) {
      setCreateError(err.message || "Erro ao criar usuário");
    }
    setCreateLoading(false);
  };

  const getUserName = (u: UserData) => u.name || u.nome || "—";
  const getUserActive = (u: UserData) => u.active !== false && u.status !== "Inativo";
  const getUserRole = (u: UserData) => u.role || u.perfil || "user";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <Breadcrumb items={[{ label: "Hub", to: "/hub" }, { label: "Configurações" }]} />

      <main className="mx-auto max-w-6xl px-4 pb-12 md:px-8">
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          {/* Sidebar */}
          <nav className="space-y-1 rounded-xl border bg-card p-3">
            {sidebarItems.map((item) => (
              <button
                key={item.key}
                disabled={!item.active}
                onClick={() => item.active && setSection(item.key)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  section === item.key
                    ? "bg-accent font-medium text-foreground"
                    : item.active
                    ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                    : "cursor-not-allowed text-muted-foreground/50"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {!item.active && (
                  <span className="ml-auto text-[10px] text-muted-foreground/50">Em breve</span>
                )}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="rounded-xl border bg-card p-6">
            {section === "usuarios" && (
              <>
                {!admin ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <Users className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-lg font-semibold text-foreground">Acesso restrito</p>
                    <p className="text-sm text-muted-foreground">
                      O gerenciamento de usuários é restrito a administradores.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-foreground">Gerenciamento de Usuários</h2>
                      <button
                        onClick={() => { setShowModal(true); setCreateError(""); }}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        Novo Usuário
                      </button>
                    </div>

                    <div className="mt-6 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-3 pr-4 font-medium">Nome</th>
                            <th className="pb-3 pr-4 font-medium">Email</th>
                            <th className="pb-3 pr-4 font-medium">Status</th>
                            <th className="pb-3 pr-4 font-medium">Perfil</th>
                            <th className="pb-3 font-medium">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                              <tr key={i} className="border-b">
                                <td className="py-3 pr-4"><Skeleton className="h-5 w-32" /></td>
                                <td className="py-3 pr-4"><Skeleton className="h-5 w-40" /></td>
                                <td className="py-3 pr-4"><Skeleton className="h-5 w-14" /></td>
                                <td className="py-3 pr-4"><Skeleton className="h-5 w-16" /></td>
                                <td className="py-3"><Skeleton className="h-5 w-20" /></td>
                              </tr>
                            ))
                          ) : users.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                Nenhum usuário encontrado
                              </td>
                            </tr>
                          ) : (
                            users.map((u) => {
                              const name = getUserName(u);
                              const active = getUserActive(u);
                              const role = getUserRole(u);
                              const isSelf = name === currentUserName;
                              return (
                                <tr key={u.id} className="border-b last:border-0">
                                  <td className="py-3 pr-4">
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                                        {name.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="font-medium text-foreground">{name}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 pr-4 text-muted-foreground">{u.email}</td>
                                  <td className="py-3 pr-4">
                                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                      active ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                                    }`}>
                                      {active ? "Ativo" : "Bloqueado"}
                                    </span>
                                  </td>
                                  <td className="py-3 pr-4">
                                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground capitalize">
                                      {role}
                                    </span>
                                  </td>
                                  <td className="py-3">
                                    {!isSelf && (
                                      <button
                                        disabled={actionLoading === u.id}
                                        onClick={() => handleToggleStatus(u)}
                                        className={`text-xs font-medium hover:underline ${active ? "text-destructive" : "text-success"}`}
                                      >
                                        {actionLoading === u.id ? (
                                          <Loader2 className="inline h-3 w-3 animate-spin" />
                                        ) : active ? "Bloquear" : "Ativar"}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}

            {section === "sobre" && (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <img src={LOGO_URL} alt="DECATRON" className="h-14" />
                <h2 className="text-xl font-bold text-foreground">Edital Bot v2.0</h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Plataforma inteligente para análise automatizada de editais e termos de referência,
                  utilizando inteligência artificial para auxiliar na tomada de decisão.
                </p>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Ativo</span>
                    <span className="text-foreground">Análise de Editais</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Ativo</span>
                    <span className="text-foreground">Lista de Publicações</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Em breve</span>
                    <span className="text-muted-foreground">Questionamentos Técnicos</span>
                  </div>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  API: https://api.atria.ia.br
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Novo Usuário */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold text-foreground">Novo Usuário</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Nome completo</label>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Email corporativo</label>
                <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Senha temporária</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Perfil</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                  <option>Admin</option>
                  <option>Analista</option>
                </select>
              </div>
              {createError && <p className="text-sm text-destructive">{createError}</p>}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={createLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {createLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar Usuário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
