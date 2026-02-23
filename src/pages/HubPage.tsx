import { useNavigate } from "react-router-dom";
import { getNome } from "@/lib/api";
import AppHeader from "@/components/AppHeader";

const modules = [
  {
    icon: "📋",
    title: "Análise de Editais",
    description: "Análise GO/NO-GO e laudo técnico de Termos de Referência com inteligência artificial",
    badge: "Disponível",
    active: true,
    path: "/analise",
  },
  {
    icon: "📰",
    title: "Lista de Publicações",
    description: "Monitoramento automático de editais publicados nos portais governamentais",
    badge: "Em breve",
    active: false,
  },
  {
    icon: "❓",
    title: "Questionamentos Técnicos",
    description: "Elaboração automática de questionamentos técnicos para impugnação de editais",
    badge: "Em breve",
    active: false,
  },
];

export default function HubPage() {
  const navigate = useNavigate();
  const nome = getNome();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-8">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          Olá, {nome}! O que vamos fazer hoje?
        </h1>
        <p className="mt-1 text-muted-foreground">Selecione um módulo para começar</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <div
              key={m.title}
              className={`group relative flex flex-col rounded-xl border bg-card p-6 transition-all ${
                m.active
                  ? "border-primary/30 shadow-sm hover:-translate-y-1 hover:shadow-lg"
                  : "opacity-70"
              }`}
            >
              <span className="text-4xl">{m.icon}</span>
              <h3 className="mt-3 text-lg font-semibold text-foreground">{m.title}</h3>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{m.description}</p>

              <div className="mt-4 flex items-center justify-between">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    m.active
                      ? "bg-success/15 text-success"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {m.badge}
                </span>
                <button
                  disabled={!m.active}
                  onClick={() => m.path && navigate(m.path)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    m.active
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "cursor-not-allowed bg-muted text-muted-foreground"
                  }`}
                >
                  {m.active ? "Acessar" : "Em desenvolvimento"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
