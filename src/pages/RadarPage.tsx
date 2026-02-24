import { useState, useEffect, useCallback } from "react";
import {
  fetchRadarKpis, fetchRadarPorCategoria, fetchRadarPorEsfera,
  fetchRadarPorUf, fetchRadarTimeline, fetchRadarTopOrgaos,
  fetchRadarItens, fetchRadarFiltrosOpcoes,
} from "@/lib/api";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import { Filter, List, LayoutDashboard, Download, ChevronLeft, ChevronRight, ChevronsUpDown, ExternalLink } from "lucide-react";

/* ──────────────── Types ──────────────── */

interface FiltrosRadar {
  busca: string; uf: string; esfera: string; poder: string;
  familia: string; categoria: string; pdm: string;
  valor_min: string; valor_max: string;
  data_de: string; data_ate: string;
  apenas_ativos: boolean; ano: string; municipio: string;
}

const filtrosVazios: FiltrosRadar = {
  busca: "", uf: "", esfera: "", poder: "", familia: "",
  categoria: "", pdm: "", valor_min: "", valor_max: "",
  data_de: "", data_ate: "", apenas_ativos: true, ano: "2026", municipio: "",
};

type ModoRadar = "dashboard" | "lista";
type OrderDir = "ASC" | "DESC";

/* ──────────────── Helpers ──────────────── */

function formatBRL(v: number | null | undefined) {
  if (v == null) return "—";
  if (v >= 1_000_000_000) return `R$ ${(v / 1e9).toFixed(1)} bi`;
  if (v >= 1_000_000) return `R$ ${(v / 1e6).toFixed(1)} mi`;
  if (v >= 1_000) return `R$ ${(v / 1e3).toFixed(0)} mil`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatBRLFull(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

const PIE_COLORS = [
  "hsl(200,100%,42%)", "hsl(145,63%,42%)", "hsl(45,100%,51%)",
  "hsl(354,70%,54%)", "hsl(270,60%,50%)", "hsl(30,90%,50%)",
];

/* ──────────────── Component ──────────────── */

export default function RadarPage() {
  const [modo, setModo] = useState<ModoRadar>("dashboard");
  const [filtros, setFiltros] = useState<FiltrosRadar>(filtrosVazios);
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosRadar>(filtrosVazios);
  const [kpis, setKpis] = useState<any>(null);
  const [porCategoria, setPorCategoria] = useState<any[]>([]);
  const [porEsfera, setPorEsfera] = useState<any[]>([]);
  const [porUf, setPorUf] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [topOrgaos, setTopOrgaos] = useState<any[]>([]);
  const [opcoesFiltros, setOpcoesFiltros] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [paginacao, setPaginacao] = useState({ total: 0, pagina_atual: 1, total_paginas: 1, limit: 50 });
  const [orderBy, setOrderBy] = useState("valor_total_estimado");
  const [orderDir, setOrderDir] = useState<OrderDir>("DESC");
  const [page, setPage] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [carregandoItens, setCarregandoItens] = useState(false);
  const [showFiltros, setShowFiltros] = useState(false);

  /* ── Param builder ── */
  const buildParams = (f: FiltrosRadar): Record<string, string> => {
    const p: Record<string, string> = {};
    if (f.busca) p.busca = f.busca;
    if (f.uf) p.uf = f.uf;
    if (f.esfera) p.esfera = f.esfera;
    if (f.poder) p.poder = f.poder;
    if (f.familia) p.familia = f.familia;
    if (f.categoria) p.categoria = f.categoria;
    if (f.pdm) p.pdm = f.pdm;
    if (f.valor_min) p.valor_min = f.valor_min;
    if (f.valor_max) p.valor_max = f.valor_max;
    if (f.data_de) p.data_de = f.data_de;
    if (f.data_ate) p.data_ate = f.data_ate;
    if (f.municipio) p.municipio = f.municipio;
    if (f.ano) p.ano = f.ano;
    p.apenas_ativos = f.apenas_ativos ? "true" : "false";
    return p;
  };

  /* ── Data loaders ── */
  const carregarDashboard = useCallback(async (f: FiltrosRadar) => {
    setCarregando(true);
    const params = buildParams(f);
    try {
      const [kpisR, catR, esfR, ufR, tlR, orgR] = await Promise.all([
        fetchRadarKpis(params),
        fetchRadarPorCategoria(params),
        fetchRadarPorEsfera(params),
        fetchRadarPorUf(params),
        fetchRadarTimeline(params),
        fetchRadarTopOrgaos(params),
      ]);
      if (kpisR.success) setKpis(kpisR.data);
      if (catR.success) setPorCategoria(catR.data);
      if (esfR.success) setPorEsfera(esfR.data);
      if (ufR.success) setPorUf(ufR.data);
      if (tlR.success) setTimeline(tlR.data);
      if (orgR.success) setTopOrgaos(orgR.data);
    } catch {
      /* toast could go here */
    } finally {
      setCarregando(false);
    }
  }, []);

  const carregarItens = useCallback(async (f: FiltrosRadar, pg: number, ob: string, od: string) => {
    setCarregandoItens(true);
    const params = buildParams(f);
    try {
      const r = await fetchRadarItens({ ...params, page: pg, limit: 50, order_by: ob, order_dir: od });
      if (r.success) {
        setItens(r.data.itens);
        setPaginacao(r.data.paginacao);
      }
    } catch {
      /* ignore */
    } finally {
      setCarregandoItens(false);
    }
  }, []);

  /* ── Effects ── */
  useEffect(() => {
    fetchRadarFiltrosOpcoes().then(d => {
      if (d.success) setOpcoesFiltros(d.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    carregarDashboard(filtrosAplicados);
    carregarItens(filtrosAplicados, 1, "valor_total_estimado", "DESC");
  }, [filtrosAplicados, carregarDashboard, carregarItens]);

  useEffect(() => {
    if (modo === "lista") carregarItens(filtrosAplicados, page, orderBy, orderDir);
  }, [modo, filtrosAplicados, page, orderBy, orderDir, carregarItens]);

  /* ── CSV export ── */
  const exportarCSV = async () => {
    const params = buildParams(filtrosAplicados);
    const r = await fetchRadarItens({ ...params, limit: 9999, page: 1 });
    if (!r.success) return;
    const cols = ["orgao_entidade", "pdm_descricao", "categoria", "uf", "esfera_nome", "poder_nome", "quantidade_estimada", "valor_unitario", "valor_total_estimado", "data_desejada"];
    const header = cols.join(";");
    const rows = r.data.itens.map((i: any) => cols.map(c => `"${i[c] ?? ""}"`).join(";"));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `radar_compras_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Sort handler ── */
  const toggleSort = (col: string) => {
    if (orderBy === col) {
      setOrderDir(d => (d === "ASC" ? "DESC" : "ASC"));
    } else {
      setOrderBy(col);
      setOrderDir("DESC");
    }
    setPage(1);
  };

  const aplicar = () => { setFiltrosAplicados({ ...filtros }); setPage(1); };
  const limpar = () => { setFiltros(filtrosVazios); setFiltrosAplicados(filtrosVazios); setPage(1); };

  const filtrosAtivos = Object.entries(filtrosAplicados).filter(
    ([k, v]) => k !== "apenas_ativos" && k !== "ano" && v !== "" && v !== filtrosVazios[k as keyof FiltrosRadar]
  ).length;

  /* ──────────────── FILTER PANEL (shared) ──────────────── */
  const filterPanel = (compact = false) => (
    <div className={`rounded-xl border bg-card p-5 ${compact ? "mb-4" : "mb-6"}`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Busca */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Busca</label>
          <input
            value={filtros.busca}
            onChange={e => setFiltros(f => ({ ...f, busca: e.target.value }))}
            placeholder="Produto, órgão..."
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {/* UF */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">UF</label>
          <select value={filtros.uf} onChange={e => setFiltros(f => ({ ...f, uf: e.target.value }))} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
            <option value="">Todas</option>
            {opcoesFiltros?.ufs?.map((u: string) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        {/* Esfera */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Esfera</label>
          <select value={filtros.esfera} onChange={e => setFiltros(f => ({ ...f, esfera: e.target.value }))} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
            <option value="">Todas</option>
            {opcoesFiltros?.esferas?.map((e: string) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        {/* Poder */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Poder</label>
          <select value={filtros.poder} onChange={e => setFiltros(f => ({ ...f, poder: e.target.value }))} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
            <option value="">Todos</option>
            {opcoesFiltros?.poderes?.map((p: string) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {/* Categoria */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Categoria</label>
          <select value={filtros.categoria} onChange={e => setFiltros(f => ({ ...f, categoria: e.target.value }))} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
            <option value="">Todas</option>
            {opcoesFiltros?.categorias?.map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {/* Valor mín */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Valor mín</label>
          <input
            type="number" value={filtros.valor_min}
            onChange={e => setFiltros(f => ({ ...f, valor_min: e.target.value }))}
            placeholder="0"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {/* Valor máx */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Valor máx</label>
          <input
            type="number" value={filtros.valor_max}
            onChange={e => setFiltros(f => ({ ...f, valor_max: e.target.value }))}
            placeholder="999.999.999"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {/* Município */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Município</label>
          <input
            value={filtros.municipio}
            onChange={e => setFiltros(f => ({ ...f, municipio: e.target.value }))}
            placeholder="Ex: Brasília"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      {/* Apenas ativos toggle */}
      <div className="mt-3 flex items-center gap-2">
        <input
          type="checkbox" checked={filtros.apenas_ativos}
          onChange={e => setFiltros(f => ({ ...f, apenas_ativos: e.target.checked }))}
          className="rounded border"
        />
        <span className="text-sm text-muted-foreground">Apenas itens ativos</span>
      </div>
      <div className="mt-4 flex gap-3">
        <button onClick={aplicar} className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          Aplicar
        </button>
        <button onClick={limpar} className="rounded-lg border px-5 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
          Limpar
        </button>
      </div>
    </div>
  );

  /* ──────────────── DASHBOARD MODE ──────────────── */
  if (modo === "dashboard") {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <Breadcrumb items={[{ label: "Hub", to: "/hub" }, { label: "Radar de Compras" }]} />

        <main className="mx-auto max-w-7xl px-4 pb-12 md:px-8">
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">🎯 Radar de Compras do Governo</h1>
              <p className="text-sm text-muted-foreground">
                Planejamento anual de compras de TI · {kpis?.total_itens?.toLocaleString("pt-BR") ?? "..."} itens
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFiltros(!showFiltros)}
                className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Filter size={16} /> Filtros
                {filtrosAtivos > 0 && (
                  <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-xs font-semibold text-primary">{filtrosAtivos}</span>
                )}
              </button>
              <button
                onClick={() => setModo("lista")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <List size={16} /> Ver lista completa
              </button>
            </div>
          </div>

          {/* Filtros */}
          {showFiltros && filterPanel()}

          {/* KPI Cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {carregando ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-card p-5">
                  <Skeleton className="mb-2 h-4 w-20" />
                  <Skeleton className="h-7 w-28" />
                </div>
              ))
            ) : (
              <>
                <KpiCard label="Total Itens" value={kpis?.total_itens?.toLocaleString("pt-BR") ?? "—"} />
                <KpiCard label="Valor Total" value={formatBRL(kpis?.valor_total)} accent />
                <KpiCard label="Órgãos Únicos" value={kpis?.total_orgaos?.toLocaleString("pt-BR") ?? "—"} />
                <KpiCard label="Estados" value={kpis?.total_ufs ?? "—"} />
                <KpiCard label="Ticket Médio" value={formatBRL(kpis?.ticket_medio)} />
              </>
            )}
          </div>

          {/* Charts row */}
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            {/* Bar chart — Top Categorias */}
            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold text-foreground">Top 10 Categorias</h3>
              {carregando ? <Skeleton className="h-64 w-full" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={porCategoria} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <XAxis type="number" tickFormatter={v => formatBRL(v)} tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category" dataKey="categoria" width={140} tick={{ fontSize: 11 }}
                      tickFormatter={v => v.length > 22 ? v.slice(0, 20) + "…" : v}
                    />
                    <ReTooltip formatter={(v: number) => formatBRLFull(v)} />
                    <Bar dataKey="valor_total" fill="hsl(200,100%,42%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pie — Por Esfera */}
            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold text-foreground">Distribuição por Esfera</h3>
              {carregando ? <Skeleton className="mx-auto h-64 w-64 rounded-full" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={porEsfera} dataKey="valor_total" nameKey="esfera" cx="50%" cy="50%"
                      outerRadius={100} innerRadius={50} paddingAngle={2} label={({ esfera, percent }) => `${esfera} ${(percent * 100).toFixed(0)}%`}
                    >
                      {porEsfera.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <ReTooltip formatter={(v: number) => formatBRLFull(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="mb-6 rounded-xl border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Intenção de Compra por Mês — 2026</h3>
            {carregando ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={timeline} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(216,20%,88%)" />
                  <XAxis dataKey="mes_label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => formatBRL(v)} tick={{ fontSize: 11 }} />
                  <ReTooltip formatter={(v: number) => formatBRLFull(v)} />
                  <Line type="monotone" dataKey="valor_total" stroke="hsl(200,100%,42%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Tables row */}
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            {/* Ranking UF */}
            <div className="rounded-xl border bg-card">
              <div className="border-b p-4">
                <h3 className="text-sm font-semibold text-foreground">Ranking por UF</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">UF</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">Itens</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carregando
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="border-t"><td colSpan={3} className="px-4 py-2"><Skeleton className="h-4 w-full" /></td></tr>
                        ))
                      : porUf.map(u => (
                          <tr key={u.uf} className="border-t hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2 font-medium text-foreground">{u.uf}</td>
                            <td className="px-4 py-2 text-right text-muted-foreground">{u.total_itens?.toLocaleString("pt-BR")}</td>
                            <td className="px-4 py-2 text-right font-medium text-foreground">{formatBRL(u.valor_total)}</td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Órgãos */}
            <div className="rounded-xl border bg-card">
              <div className="border-b p-4">
                <h3 className="text-sm font-semibold text-foreground">Top Órgãos</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Órgão</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">UF</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Esfera</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carregando
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="border-t"><td colSpan={4} className="px-4 py-2"><Skeleton className="h-4 w-full" /></td></tr>
                        ))
                      : topOrgaos.map((o, i) => (
                          <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                            <td className="max-w-[200px] truncate px-4 py-2 text-foreground" title={o.orgao_entidade}>{o.orgao_entidade}</td>
                            <td className="px-4 py-2"><span className="rounded bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">{o.uf}</span></td>
                            <td className="px-4 py-2 text-muted-foreground">{o.esfera_nome}</td>
                            <td className="px-4 py-2 text-right font-medium text-foreground">{formatBRL(o.valor_total)}</td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Preview lista */}
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-sm font-semibold text-foreground">Itens Planejados</h3>
              <button onClick={() => setModo("lista")} className="text-sm font-medium text-primary hover:underline">
                Ver lista completa →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Órgão</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Produto</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">UF</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {carregando
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-t"><td colSpan={4} className="px-4 py-2"><Skeleton className="h-4 w-full" /></td></tr>
                      ))
                    : (itens.length > 0 ? itens : []).slice(0, 5).map((item, i) => (
                        <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                          <td className="max-w-[180px] truncate px-4 py-2 text-foreground" title={item.orgao_entidade}>{item.orgao_entidade}</td>
                          <td className="max-w-[200px] truncate px-4 py-2 text-muted-foreground">{item.pdm_descricao}</td>
                          <td className="px-4 py-2"><span className="rounded bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">{item.uf}</span></td>
                          <td className="px-4 py-2 text-right font-medium text-foreground">{formatBRL(item.valor_total_estimado)}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ──────────────── LIST MODE ──────────────── */
  const sortHeader = (label: string, col: string) => (
    <th
      onClick={() => toggleSort(col)}
      className="cursor-pointer px-4 py-2 text-left font-medium text-muted-foreground hover:text-foreground transition-colors select-none"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ChevronsUpDown size={12} className={orderBy === col ? "text-primary" : "text-muted-foreground/40"} />
      </span>
    </th>
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <Breadcrumb items={[
        { label: "Hub", to: "/hub" },
        { label: "Radar de Compras", to: "/radar" },
        { label: "Lista Completa" },
      ]} />

      <main className="mx-auto max-w-7xl px-4 pb-12 md:px-8">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <button
            onClick={() => setModo("dashboard")}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <h1 className="text-xl font-bold text-foreground">
            📋 Itens Planejados ({paginacao.total.toLocaleString("pt-BR")})
          </h1>
          <button
            onClick={exportarCSV}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Download size={16} /> Exportar CSV
          </button>
        </div>

        {/* Filtros — always visible */}
        {filterPanel(true)}

        {/* Results summary */}
        <div className="mb-3 text-sm text-muted-foreground">
          {paginacao.total.toLocaleString("pt-BR")} itens encontrados
          {filtrosAtivos > 0 && (
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {filtrosAtivos} filtro{filtrosAtivos > 1 ? "s" : ""} ativo{filtrosAtivos > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {sortHeader("Órgão", "orgao_entidade")}
                {sortHeader("Produto", "pdm_descricao")}
                {sortHeader("Categoria", "categoria")}
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">UF</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Esfera</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Poder</th>
                {sortHeader("Qtd", "quantidade_estimada")}
                {sortHeader("Vlr Unit.", "valor_unitario")}
                {sortHeader("Vlr Total", "valor_total_estimado")}
                {sortHeader("Data Desejada", "data_desejada")}
                <th className="px-4 py-2 text-center font-medium text-muted-foreground">Link</th>
              </tr>
            </thead>
            <tbody>
              {carregandoItens
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-t">
                      <td colSpan={11} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    </tr>
                  ))
                : itens.map(item => (
                    <tr key={item.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="max-w-[180px] truncate px-4 py-2 text-foreground" title={item.orgao_entidade}>
                        {item.orgao_entidade?.slice(0, 30)}{item.orgao_entidade?.length > 30 ? "…" : ""}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-2 text-muted-foreground" title={item.pdm_descricao}>{item.pdm_descricao}</td>
                      <td className="px-4 py-2 text-muted-foreground">{item.categoria}</td>
                      <td className="px-4 py-2">
                        <span className="rounded bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">{item.uf}</span>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{item.esfera_nome}</td>
                      <td className="px-4 py-2 text-muted-foreground">{item.poder_nome}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{item.quantidade_estimada?.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{formatBRLFull(item.valor_unitario)}</td>
                      <td className="px-4 py-2 text-right font-medium text-foreground">{formatBRL(item.valor_total_estimado)}</td>
                      <td className="px-4 py-2 text-muted-foreground">{formatDate(item.data_desejada)}</td>
                      <td className="px-4 py-2 text-center">
                        {item.link_pca && (
                          <a href={item.link_pca} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors">
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="inline-flex items-center gap-1 rounded-lg border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} /> Anterior
          </button>
          <span className="text-sm text-muted-foreground">
            Página {paginacao.pagina_atual} de {paginacao.total_paginas}
          </span>
          <button
            disabled={page >= paginacao.total_paginas}
            onClick={() => setPage(p => p + 1)}
            className="inline-flex items-center gap-1 rounded-lg border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Próxima <ChevronRight size={16} />
          </button>
        </div>
      </main>
    </div>
  );
}

/* ──────────────── Sub-components ──────────────── */

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
