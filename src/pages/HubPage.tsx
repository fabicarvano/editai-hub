import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getNome, fetchRadarKpis } from "@/lib/api";
import AppHeader from "@/components/AppHeader";
import { Skeleton } from "@/components/ui/skeleton";

const modules = [
  {
    icon: "📋",
    title: "Análise de Editais",
    description: "Análise prévia de edital, análise técnica de TR e análise de minuta de contrato por inteligência artificial",
    badge: "Em breve",
    active: false,
    path: "/analise",
  },
  {
    icon: "📰",
    title: "Lista de Publicações",
    description: "Monitoramento automático de editais publicados nos portais governamentais",
    badge: "Disponível",
    active: true,
    path: "/licitacoes",
  },
  {
    icon: "❓",
    title: "Questionamentos Técnicos",
    description: "Geração inteligente de questionamentos técnicos com apoio de IA para análise e impugnação de editais",
    badge: "Em breve",
    active: false,
    path: "/questionamentos",
  },
];

function formatValor(v: number): string {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)} bi`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)} mi`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)} mil`;
  return `R$ ${v.toFixed(0)}`;
}

export default function HubPage() {
  const navigate = useNavigate();
  const nome = getNome();

  const [radarLoading, setRadarLoading] = useState(true);
  const [radarKpis, setRadarKpis] = useState<{ total_itens?: number; valor_total?: number } | null>(null);

  useEffect(() => {
    fetchRadarKpis()
      .then((r) => setRadarKpis(r.data || r))
      .catch(() => setRadarKpis(null))
      .finally(() => setRadarLoading(false));
  }, []);

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

          {/* Card Radar de Compras */}
          <div
            className="group relative flex flex-col rounded-xl border border-primary/30 bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <span className="absolute right-4 top-4 rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
              Novo
            </span>
            <span className="text-4xl">🎯</span>
            <h3 className="mt-3 text-lg font-semibold text-foreground">Radar de Compras</h3>
            <p className="mt-1 text-sm text-muted-foreground">Planejamento governamental de TI</p>

            <div className="mt-3 flex gap-4">
              {radarLoading ? (
                <>
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
                </>
              ) : radarKpis ? (
                <>
                  <span className="text-sm font-semibold text-foreground">
                    {radarKpis.total_itens?.toLocaleString("pt-BR") ?? "—"} itens
                  </span>
                  <span className="text-sm font-semibold text-indigo-600">
                    {radarKpis.valor_total ? formatValor(radarKpis.valor_total) : "—"}
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Dados indisponíveis</span>
              )}
            </div>

            <p className="mt-2 flex-1 text-xs text-muted-foreground">
              Atualizado diariamente · 27 estados
            </p>

            <div className="mt-4 flex items-center justify-between">
              <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
                Disponível
              </span>
              <button
                onClick={() => navigate("/radar")}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Acessar →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
