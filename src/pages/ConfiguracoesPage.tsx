import { useState } from "react";
import { Users, Bell, Link, Info } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";

const LOGO_URL = "https://i.postimg.cc/vT1GGCpn/decatron-2.png";

const sidebarItems = [
  { key: "usuarios", label: "Usuários", icon: Users, active: true },
  { key: "notificacoes", label: "Notificações", icon: Bell, active: false },
  { key: "integracoes", label: "Integrações", icon: Link, active: false },
  { key: "sobre", label: "Sobre o Sistema", icon: Info, active: true },
];

const mockUsers = [
  { nome: "Fabio Carvano", email: "fabio.carvano@decatron.com.br", status: "Ativo", perfil: "Analista" },
  { nome: "Administrador", email: "admin@decatron.com.br", status: "Ativo", perfil: "Admin" },
];

export default function ConfiguracoesPage() {
  const [section, setSection] = useState("usuarios");
  const [showModal, setShowModal] = useState(false);

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
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground">Gerenciamento de Usuários</h2>
                  <button
                    onClick={() => setShowModal(true)}
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
                      {mockUsers.map((u) => (
                        <tr key={u.email} className="border-b last:border-0">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                                {u.nome.charAt(0)}
                              </div>
                              <span className="font-medium text-foreground">{u.nome}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{u.email}</td>
                          <td className="py-3 pr-4">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              u.status === "Ativo"
                                ? "bg-success/15 text-success"
                                : "bg-destructive/15 text-destructive"
                            }`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{u.perfil}</td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              <button className="text-xs text-primary hover:underline">Editar</button>
                              <button className="text-xs text-destructive hover:underline">Bloquear</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="mt-4 text-xs text-muted-foreground">
                  Gerenciamento de usuários via API em desenvolvimento
                </p>
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
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Em breve</span>
                    <span className="text-muted-foreground">Lista de Publicações</span>
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
                <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Email corporativo</label>
                <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Senha temporária</label>
                <input type="password" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Perfil</label>
                <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                  <option>Admin</option>
                  <option>Analista</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Cancelar
              </button>
              <div className="group relative flex-1">
                <button
                  disabled
                  className="w-full cursor-not-allowed rounded-lg bg-primary/50 px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Criar Usuário
                </button>
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-card opacity-0 transition-opacity group-hover:opacity-100">
                  Em breve
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
