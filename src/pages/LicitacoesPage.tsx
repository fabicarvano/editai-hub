import { useState, useEffect, useCallback } from "react";
import { Filter, X, ChevronDown, ExternalLink, Target, Loader2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import { fetchLicitacoes, fetchLicitacaoDetalhe, fetchUsuarios } from "@/lib/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

interface Filters {
  busca: string; uf: string; municipio: string; palavras: string;
  pub_de: string; pub_ate: string; enc_de: string; enc_ate: string;
  valor_min: string; valor_max: string; notificado: string;
}

const emptyFilters: Filters = {
  busca:"", uf:"", municipio:"", palavras:"",
  pub_de:"", pub_ate:"", enc_de:"", enc_ate:"",
  valor_min:"", valor_max:"", notificado:"",
};

function formatCurrency(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBR(d: string | null | undefined) {
  if (!d) return "—";
  try {
    const date = new Date(d);
    return date.toLocaleDateString("pt-BR");
  } catch { return d; }
}

function daysUntil(d: string | null | undefined) {
  if (!d) return Infinity;
  const diff = (new Date(d).getTime() - Date.now()) / (1000*60*60*24);
  return Math.ceil(diff);
}

function truncate(s: string | null | undefined, max: number) {
  if (!s) return "—";
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-muted-foreground text-xs">—</span>;
  const color = score >= 7 ? "bg-success/15 text-success" : score >= 4 ? "bg-warning/15 text-warning-foreground" : "bg-destructive/15 text-destructive";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>{score.toFixed(1)}</span>;
}

function EncBadge({ date }: { date: string | null | undefined }) {
  const formatted = formatDateBR(date);
  const days = daysUntil(date);
  let cls = "text-muted-foreground";
  if (days < 3) cls = "bg-destructive/15 text-destructive rounded-full px-2 py-0.5 text-xs font-medium";
  else if (days < 7) cls = "bg-warning/15 text-warning-foreground rounded-full px-2 py-0.5 text-xs font-medium";
  else cls = "text-sm";
  return <span className={cls}>{formatted}</span>;
}

export default function LicitacoesPage() {
  const [filters, setFilters] = useState<Filters>({ ...emptyFilters });
  const [appliedFilters, setAppliedFilters] = useState<Filters>({ ...emptyFilters });
  const [showFilters, setShowFilters] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [sort, setSort] = useState("recentes");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [apenasAtivas, setApenasAtivas] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    console.log("buscando licitacoes...");
    try {
      const params: Record<string, string | number> = { pagina: page, por_pagina: perPage };
      if (appliedFilters.busca) params.busca = appliedFilters.busca;
      if (appliedFilters.uf) params.uf = appliedFilters.uf;
      if (appliedFilters.municipio) params.municipio = appliedFilters.municipio;
      if (appliedFilters.palavras) params.palavras = appliedFilters.palavras;
      if (appliedFilters.pub_de) params.pub_de = appliedFilters.pub_de;
      if (appliedFilters.pub_ate) params.pub_ate = appliedFilters.pub_ate;
      if (appliedFilters.enc_de) params.enc_de = appliedFilters.enc_de;
      if (appliedFilters.enc_ate) params.enc_ate = appliedFilters.enc_ate;
      if (appliedFilters.valor_min) params.valor_min = appliedFilters.valor_min;
      if (appliedFilters.valor_max) params.valor_max = appliedFilters.valor_max;
      if (appliedFilters.notificado) params.notificado = appliedFilters.notificado;
      if (apenasAtivas) { params.enc_de = new Date().toISOString().slice(0, 10); }
      if (sort === "recentes") { params.ordem = "capturada_em"; params.direcao = "desc"; }
      else if (sort === "encerramento") { params.ordem = "data_encerramento_proposta"; params.direcao = "asc"; }
      else if (sort === "valor") { params.ordem = "valor_total_estimado"; params.direcao = "desc"; }
      else if (sort === "score") { params.ordem = "score_palavras"; params.direcao = "desc"; }
      const res = await fetchLicitacoes(params);
      setData(res);
    } catch { }
    setLoading(false);
  }, [page, perPage, sort, appliedFilters, apenasAtivas]);

  useEffect(() => { loadData(); }, [loadData]);

  const openDetail = async (id: number) => {
    setSelectedId(id);
    setSheetOpen(true);
    setDetailLoading(true);
    setLeadOpen(false);
    try {
      const d = await fetchLicitacaoDetalhe(id);
      setDetail(d?.data ?? d);
    } catch { setDetail(null); }
    setDetailLoading(false);
  };

  const applyFilters = () => { setAppliedFilters({ ...filters }); setPage(1); };
  const clearFilters = () => { setFilters({ ...emptyFilters }); setAppliedFilters({ ...emptyFilters }); setPage(1); };

  const activeFilterEntries = Object.entries(appliedFilters).filter(([, v]) => v !== "");
  const filterLabels: Record<string, string> = {
    busca:"Objeto", uf:"UF", municipio:"Município", palavras:"Palavra-chave",
    pub_de:"Pub. de", pub_ate:"Pub. até", enc_de:"Enc. de", enc_ate:"Enc. até",
    valor_min:"Valor mín.", valor_max:"Valor máx.", notificado:"Notificado",
  };

  const removeFilter = (key: string) => {
    const next = { ...appliedFilters, [key]: "" };
    setAppliedFilters(next);
    setFilters(next);
    setPage(1);
  };

  const results = data?.data || [];
  const totalCount = data?.paginacao?.total ?? 0;
  const totalPages = data?.paginacao?.total_paginas ?? 1;

  const openLeadPopover = async () => {
    setLeadOpen(true);
    if (users.length === 0) {
      try { const u = await fetchUsuarios(); setUsers(u?.data || []); } catch {}
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <Breadcrumb items={[{ label: "Hub", to: "/hub" }, { label: "Lista de Publicações" }]} />

      <main className="mx-auto max-w-7xl px-4 pb-12 md:px-8">
        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="mb-4 flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Filter className="h-4 w-4" />
          Filtros
          <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          {activeFilterEntries.length > 0 && (
            <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
              {activeFilterEntries.length}
            </span>
          )}
        </button>

        {/* Filter panel */}
        {showFilters && (
          <div className="mb-6 rounded-xl border bg-card p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Buscar no objeto</label>
                <input value={filters.busca} onChange={e => setFilters({...filters, busca: e.target.value})}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder="Ex: tecnologia da informação" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">UF</label>
                <select value={filters.uf} onChange={e => setFilters({...filters, uf: e.target.value})}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                  <option value="">Todos</option>
                  {UF_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Município</label>
                <input value={filters.municipio} onChange={e => setFilters({...filters, municipio: e.target.value})}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder="Ex: Brasília" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Palavra-chave</label>
                <input value={filters.palavras} onChange={e => setFilters({...filters, palavras: e.target.value})}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder="Ex: cloud, infraestrutura" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Publicado de</label>
                <input type="date" value={filters.pub_de} onChange={e => setFilters({...filters, pub_de: e.target.value})}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Publicado até</label>
                <input type="date" value={filters.pub_ate} onChange={e => setFilters({...filters, pub_ate: e.target.value})}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Encerra de</label>
                <input type="date" value={filters.enc_de} onChange={e => setFilters({...filters, enc_de: e.target.value})}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Encerra até</label>
                <input type="date" value={filters.enc_ate} onChange={e => setFilters({...filters, enc_ate: e.target.value})}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Valor mínimo</label>
                <input type="number" value={filters.valor_min} onChange={e => setFilters({...filters, valor_min: e.target.value})}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder="0" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Valor máximo</label>
                <input type="number" value={filters.valor_max} onChange={e => setFilters({...filters, valor_max: e.target.value})}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder="10000000" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Notificado</label>
                <select value={filters.notificado} onChange={e => setFilters({...filters, notificado: e.target.value})}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                  <option value="">Todos</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={applyFilters} className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Aplicar Filtros
              </button>
              <button onClick={clearFilters} className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-muted">
                Limpar
              </button>
            </div>
          </div>
        )}

        {/* Summary bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">
            <strong className="text-foreground">{totalCount}</strong> registros encontrados
          </span>
          {apenasAtivas && (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              Encerramento futuro
            </span>
          )}

          {activeFilterEntries.map(([key, val]) => (
            <span key={key} className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
              {filterLabels[key]}: {val}
              <button onClick={() => removeFilter(key)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
            </span>
          ))}

          <div className="ml-auto flex items-center gap-3">
            <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs outline-none focus:border-primary">
              <option value="recentes">Mais recentes</option>
              <option value="encerramento">Encerramento próximo</option>
              <option value="valor">Maior valor</option>
              <option value="score">Maior score</option>
            </select>
            <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs outline-none focus:border-primary">
              <option value={10}>10 / página</option>
              <option value={20}>20 / página</option>
              <option value={50}>50 / página</option>
            </select>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground select-none">
              <span>Apenas ativas</span>
              <div
                onClick={() => { setApenasAtivas(!apenasAtivas); setPage(1); }}
                className={`relative h-5 w-9 rounded-full transition-colors ${apenasAtivas ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${apenasAtivas ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Objeto</th>
                <th className="px-4 py-3 font-medium">Órgão</th>
                <th className="px-4 py-3 font-medium">Publicação</th>
                <th className="px-4 py-3 font-medium">UF</th>
                <th className="px-4 py-3 font-medium">Esfera</th>
                <th className="px-4 py-3 font-medium">Valor Estimado</th>
                <th className="px-4 py-3 font-medium">Encerramento</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhuma licitação encontrada
                  </td>
                </tr>
              ) : (
                results.map((item: any, idx: number) => (
                  <tr key={item.id} onClick={() => openDetail(item.id)}
                    className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 text-muted-foreground">{(page - 1) * perPage + idx + 1}</td>
                    <td className="max-w-[280px] px-4 py-3">
                      <div className="flex items-center gap-1.5">
                     {item.data_publicacao_pncp?.slice(0, 10) === new Date().toISOString().slice(0, 10) && (
                          <span className="shrink-0 rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">Nova</span>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate font-medium text-foreground">{truncate(item.objeto_compra, 80)}</span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm"><p className="text-xs">{item.objeto_compra}</p></TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-muted-foreground">{item.orgao_razao_social || item.orgao || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateBR(item.data_publicacao_pncp)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.unidade_uf_sigla || "—"}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const esferas: Record<string, { label: string; cls: string }> = {
                          F: { label: "Federal", cls: "bg-blue-100 text-blue-700" },
                          E: { label: "Estadual", cls: "bg-purple-100 text-purple-700" },
                          M: { label: "Municipal", cls: "bg-green-100 text-green-700" },
                          D: { label: "Distrital", cls: "bg-yellow-100 text-yellow-700" },
                          N: { label: "Nacional", cls: "bg-gray-100 text-gray-700" },
                        };
                        const esfera = esferas[item.orgao_esfera_id] ?? { label: item.orgao_esfera_id || "—", cls: "bg-gray-100 text-gray-600" };
                        return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${esfera.cls}`}>{esfera.label}</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{formatCurrency(item.valor_total_estimado)}</td>
                    <td className="px-4 py-3"><EncBadge date={item.data_encerramento_proposta} /></td>
                    <td className="px-4 py-3"><ScoreBadge score={item.score_palavras} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={e => { e.stopPropagation(); openDetail(item.id); }}
                          className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20">
                          Ver
                        </button>
                        {item.link_sistema_origem?.trim() ? (
                          <a href={item.link_sistema_origem.trim()} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
                            <ExternalLink className="h-3 w-3" /> Link
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground opacity-40 cursor-not-allowed">
                            <ExternalLink className="h-3 w-3" /> Link
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40">
            Anterior
          </button>
          <span className="text-sm text-muted-foreground">
            Página <strong className="text-foreground">{page}</strong> de <strong className="text-foreground">{totalPages}</strong>
            {" "}({totalCount} registros)
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40">
            Próximo
          </button>
        </div>
      </main>

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle className="text-lg">Detalhes da Licitação</SheetTitle>
          </SheetHeader>

          {detailLoading ? (
            <div className="space-y-4 p-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          ) : detail ? (
            <div className="space-y-6 p-4">
              {/* Header */}
              <div>
                <p className="text-sm font-semibold text-foreground">{detail.numero_controle_pncp || `ID #${detail.id}`}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {detail.situacao_nome && <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">{detail.situacao_nome}</span>}
                  <ScoreBadge score={detail.score_palavras} />
                </div>
                {detail.link_sistema_origem && (
                  <a href={detail.link_sistema_origem} target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <ExternalLink className="h-3 w-3" /> Ver no PNCP
                  </a>
                )}
              </div>

              {/* Identificação */}
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identificação</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Modalidade:</span> <span className="font-medium text-foreground">{detail.modalidade_nome || "—"}</span></div>
                  <div><span className="text-muted-foreground">Modo disputa:</span> <span className="font-medium text-foreground">{detail.modo_disputa_nome || "—"}</span></div>
                  <div><span className="text-muted-foreground">Instrumento:</span> <span className="font-medium text-foreground">{detail.instrumento_convocatorio || "—"}</span></div>
                  <div><span className="text-muted-foreground">Processo:</span> <span className="font-medium text-foreground">{detail.numero_compra || "—"}</span></div>
                  <div><span className="text-muted-foreground">Ano:</span> <span className="font-medium text-foreground">{detail.ano_compra || "—"}</span></div>
                  <div><span className="text-muted-foreground">Sequencial:</span> <span className="font-medium text-foreground">{detail.sequencial_compra || "—"}</span></div>
                </div>
              </section>

              {/* Órgão */}
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Órgão e Localização</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Razão Social:</span> <span className="font-medium text-foreground">{detail.orgao_razao_social || "—"}</span></p>
                  <p><span className="text-muted-foreground">CNPJ:</span> <span className="font-medium text-foreground">{detail.orgao_cnpj || "—"}</span></p>
                  <p><span className="text-muted-foreground">Unidade:</span> <span className="font-medium text-foreground">{detail.unidade_razao_social || detail.unidade_nome || "—"}</span></p>
                  <p><span className="text-muted-foreground">Localização:</span> <span className="font-medium text-foreground">{detail.unidade_municipio_nome || "—"}/{detail.unidade_uf_sigla || "—"}</span></p>
                </div>
              </section>

              {/* Objeto */}
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Objeto</h4>
                <p className="text-sm text-foreground">{detail.objeto_compra || "—"}</p>
                {detail.informacao_complementar && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-primary hover:underline">Informação complementar</summary>
                    <p className="mt-1 text-xs text-muted-foreground">{detail.informacao_complementar}</p>
                  </details>
                )}
              </section>

              {/* Datas */}
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Datas</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Publicação:</span> <span className="font-medium text-foreground">{formatDateBR(detail.data_publicacao_pncp)}</span></div>
                  <div><span className="text-muted-foreground">Abertura:</span> <span className="font-medium text-foreground">{formatDateBR(detail.data_abertura_proposta)}</span></div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Encerramento:</span>{" "}
                    <EncBadge date={detail.data_encerramento_proposta} />
                  </div>
                </div>
              </section>

              {/* Valores */}
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valores</h4>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(detail.valor_total_estimado)}</p>
                {detail.valor_total_homologado != null && (
                  <p className="mt-1 text-sm text-muted-foreground">Homologado: {formatCurrency(detail.valor_total_homologado)}</p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">SRP: {detail.srp ? "Sim" : "Não"}</p>
              </section>

              {/* Palavras-chave */}
              {detail.match_palavras_chave && (
                <section>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Palavras-chave match</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.match_palavras_chave.split(",").map((s: string) => s.trim()).filter(Boolean).map((w: string, i: number) => (
                      <span key={i} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{w}</span>
                    ))}
                  </div>
                  {detail.score_palavras != null && (
                    <p className="mt-2 text-sm text-muted-foreground">Score: <ScoreBadge score={detail.score_palavras} /></p>
                  )}
                </section>
              )}

              {/* Footer */}
              <div className="border-t pt-4">
                <Popover open={leadOpen} onOpenChange={setLeadOpen}>
                  <PopoverTrigger asChild>
                    <button onClick={openLeadPopover}
                      className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                      🎯 Gerar Lead
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="center">
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">Enviar lead para:</h4>
                      <div className="max-h-40 space-y-1.5 overflow-y-auto">
                        {users.length === 0 ? (
                          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
                          </div>
                        ) : users.map((u: any) => (
                          <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 hover:bg-muted">
                            <input type="radio" name="lead_user" className="accent-primary" />
                            <div>
                              <span className="block text-xs font-medium text-foreground">{u.name || u.nome}</span>
                              <span className="block text-[10px] text-muted-foreground">{u.email}</span>
                            </div>
                            <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{u.role || u.perfil}</span>
                          </label>
                        ))}
                      </div>
                      <textarea placeholder="Observações (opcional)" rows={2}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary" />
                      <div className="flex gap-2">
                        <button onClick={() => setLeadOpen(false)}
                          className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
                          Cancelar
                        </button>
                        <div className="group relative flex-1">
                          <button disabled
                            className="w-full cursor-not-allowed rounded-lg bg-primary/50 px-3 py-1.5 text-xs font-medium text-primary-foreground">
                            Gerar
                          </button>
                          <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-0.5 text-[10px] text-card opacity-0 transition-opacity group-hover:opacity-100">
                            Em desenvolvimento
                          </span>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">Erro ao carregar detalhes.</p>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
