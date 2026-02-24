import { useState, useEffect, useCallback, useRef } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  uploadEditalQ, fetchItensDetectados, adicionarItemFila, atualizarItemFila,
  removerItemFila, gerarQuestionamento, fetchConsolidado, fetchRascunhos,
  fetchRascunho, deletarRascunho, exportarDocx,
} from "@/lib/api";
import { Loader2, Upload, ArrowLeft, Trash2, Copy, RefreshCw, FileDown, Search, Check, Plus } from "lucide-react";

type Modo = "inicio" | "upload" | "editor";

const statusColors: Record<string, string> = {
  pendente: "bg-muted text-muted-foreground",
  em_andamento: "bg-yellow-100 text-yellow-800",
  gerando: "bg-blue-100 text-blue-700 animate-pulse",
  gerado: "bg-green-100 text-green-700",
  erro: "bg-red-100 text-red-700",
  rascunho: "bg-muted text-muted-foreground",
  finalizado: "bg-green-100 text-green-700",
};

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em edição",
  gerando: "Gerando…",
  gerado: "Gerado",
  erro: "Erro",
  rascunho: "Rascunho",
  finalizado: "Finalizado",
};

export default function QuestionamentosPage() {
  const { toast } = useToast();

  const [modo, setModo] = useState<Modo>("inicio");
  const [sessaoId, setSessaoId] = useState<number | null>(null);
  const [sessaoInfo, setSessaoInfo] = useState<any>(null);
  const [itensDetectados, setItensDetectados] = useState<any[]>([]);
  const [fila, setFila] = useState<any[]>([]);
  const [itemSelecionado, setItemSelecionado] = useState<any>(null);
  const [rascunhos, setRascunhos] = useState<any[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<"itens" | "fila">("itens");
  const [abaPainelDir, setAbaPainelDir] = useState<"item" | "consolidado">("item");
  const [consolidado, setConsolidado] = useState("");
  const [gerando, setGerando] = useState(false);
  const [buscaItens, setBuscaItens] = useState("");
  const [addManual, setAddManual] = useState(false);
  const [manualNumero, setManualNumero] = useState("");
  const [manualTrecho, setManualTrecho] = useState("");

  // upload state
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // form state for selected item
  const [formObjetivo, setFormObjetivo] = useState("");
  const [formDuvida, setFormDuvida] = useState("");
  const [formEspecOriginal, setFormEspecOriginal] = useState("");
  const [formEspecProposta, setFormEspecProposta] = useState("");
  const [formTom, setFormTom] = useState("tecnico");
  const [formPerfil, setFormPerfil] = useState("tecnico");
  const [formTrechoEditavel, setFormTrechoEditavel] = useState(false);
  const [formTrecho, setFormTrecho] = useState("");
  const [opcJustificativas, setOpcJustificativas] = useState(true);
  const [opcLegislacao, setOpcLegislacao] = useState(true);
  const [opcRelacao, setOpcRelacao] = useState(false);
  const [opcContestar, setOpcContestar] = useState(false);

  // export modal
  const [exportModal, setExportModal] = useState(false);
  const [exportEmpresa, setExportEmpresa] = useState("DECATRON Tecnologia");
  const [exportResponsavel, setExportResponsavel] = useState("");

  // load rascunhos on mount
  useEffect(() => {
    if (modo === "inicio") {
      fetchRascunhos()
        .then((r) => setRascunhos(r.data ?? []))
        .catch(() => {});
    }
  }, [modo]);

  // load consolidado
  useEffect(() => {
    if (abaPainelDir === "consolidado" && sessaoId) {
      fetchConsolidado(sessaoId)
        .then((r) => setConsolidado(r.data?.texto ?? ""))
        .catch(() => setConsolidado("Erro ao carregar consolidado."));
    }
  }, [abaPainelDir, sessaoId]);

  // populate form when item selected
  useEffect(() => {
    if (itemSelecionado) {
      setFormObjetivo(itemSelecionado.objetivo || "");
      setFormDuvida(itemSelecionado.duvida || "");
      setFormEspecOriginal(itemSelecionado.especificacao_original || itemSelecionado.trecho_original || "");
      setFormEspecProposta(itemSelecionado.especificacao_proposta || "");
      setFormTom(itemSelecionado.tom || "tecnico");
      setFormPerfil(itemSelecionado.perfil || "tecnico");
      setFormTrecho(itemSelecionado.trecho_original || "");
      setFormTrechoEditavel(false);
      setOpcJustificativas(itemSelecionado.opc_justificativas ?? true);
      setOpcLegislacao(itemSelecionado.opc_legislacao ?? true);
      setOpcRelacao(itemSelecionado.opc_relacao_itens ?? false);
      setOpcContestar(itemSelecionado.opc_contestar ?? false);
    }
  }, [itemSelecionado]);

  const handleUpload = async () => {
    if (!arquivo) return;
    setUploading(true);
    setUploadError("");
    try {
      const res = await uploadEditalQ(arquivo);
      const sid = res.data?.sessao_id;
      setSessaoId(sid);
      setSessaoInfo(res.data);
      setItensDetectados(Array.isArray(res.data?.itens) ? res.data.itens : []);
      setFila(Array.isArray(res.data?.fila) ? res.data.fila : []);
      setModo("editor");
    } catch (e: any) {
      setUploadError(e.message || "Erro ao processar edital");
    }
    setUploading(false);
  };

  const carregarRascunho = async (id: number) => {
    try {
      const res = await fetchRascunho(id);
      const d = res.data;
      setSessaoId(d.sessao?.id ?? d.sessao_id ?? id);
      setSessaoInfo(d.sessao ?? d);
      setItensDetectados(Array.isArray(d.itens) ? d.itens : []);
      setFila(Array.isArray(d.itens) ? d.itens : []);
      setModo("editor");
    } catch {
      toast({ title: "Erro ao carregar rascunho", variant: "destructive" });
    }
  };

  const excluirRascunho = async (id: number) => {
    try {
      await deletarRascunho(id);
      setRascunhos((prev) => prev.filter((r) => r.sessao_id !== id));
      toast({ title: "Rascunho excluído" });
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const adicionarNaFila = async (item: any) => {
    if (!sessaoId) return;
    try {
      const res = await adicionarItemFila(sessaoId, {
        numero_item: item.numero_item,
        titulo_item: item.titulo_item,
        trecho_original: item.trecho_original,
        status: "pendente",
      });
      const novo = res.data;
      setFila((prev) => [...prev, novo]);
      toast({ title: "Item adicionado à fila" });
    } catch {
      toast({ title: "Erro ao adicionar item", variant: "destructive" });
    }
  };

  const removerDaFila = async (itemId: number) => {
    if (!sessaoId) return;
    try {
      await removerItemFila(sessaoId, itemId);
      setFila((prev) => prev.filter((i) => i.id !== itemId));
      if (itemSelecionado?.id === itemId) setItemSelecionado(null);
      toast({ title: "Item removido" });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const salvarConfig = async () => {
    if (!sessaoId || !itemSelecionado) return;
    const payload = {
      objetivo: formObjetivo,
      duvida: formDuvida,
      especificacao_original: formEspecOriginal,
      especificacao_proposta: formEspecProposta,
      tom: formTom,
      perfil: formPerfil,
      trecho_original: formTrecho,
      opc_justificativas: opcJustificativas,
      opc_legislacao: opcLegislacao,
      opc_relacao_itens: opcRelacao,
      opc_contestar: opcContestar,
      status: "em_andamento",
    };
    try {
      await atualizarItemFila(sessaoId, itemSelecionado.id, payload);
      setFila((prev) => prev.map((i) => (i.id === itemSelecionado.id ? { ...i, ...payload } : i)));
      setItemSelecionado((prev: any) => ({ ...prev, ...payload }));
      toast({ title: "Configuração salva" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const gerarItem = async (itemId: number) => {
    if (!sessaoId) return;
    setGerando(true);
    setFila((prev) => prev.map((i) => (i.id === itemId ? { ...i, status: "gerando" } : i)));
    try {
      const res = await gerarQuestionamento(sessaoId, itemId);
      const output = res.data?.output ?? "";
      setFila((prev) => prev.map((i) => (i.id === itemId ? { ...i, output_gerado: output, status: "gerado" } : i)));
      if (itemSelecionado?.id === itemId) {
        setItemSelecionado((prev: any) => ({ ...prev, output_gerado: output, status: "gerado" }));
      }
    } catch {
      setFila((prev) => prev.map((i) => (i.id === itemId ? { ...i, status: "erro" } : i)));
    }
    setGerando(false);
  };

  const copiarTexto = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  const itemNaFila = useCallback(
    (numeroItem: string) => fila.some((f) => f.numero_item === numeroItem),
    [fila]
  );

  const safeItens = Array.isArray(itensDetectados) ? itensDetectados : [];
  const safeFila = Array.isArray(fila) ? fila : [];

  const itensFiltrados = safeItens.filter(
    (i) =>
      !buscaItens ||
      i.titulo_item?.toLowerCase().includes(buscaItens.toLowerCase()) ||
      i.numero_item?.toLowerCase().includes(buscaItens.toLowerCase())
  );

  const qtdGerados = safeFila.filter((i) => i.status === "gerado").length;

  const voltar = () => {
    setModo("inicio");
    setSessaoId(null);
    setSessaoInfo(null);
    setItensDetectados([]);
    setFila([]);
    setItemSelecionado(null);
    setConsolidado("");
    setArquivo(null);
  };

  // ─── RENDER ────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* ══════ MODO INÍCIO ══════ */}
      {modo === "inicio" && (
        <main className="mx-auto max-w-4xl px-4 py-10 md:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">Questionamentos Técnicos</h1>
            <p className="mt-1 text-muted-foreground">Selecione um edital para iniciar ou continue um rascunho salvo</p>
            <Button className="mt-6 gap-2" size="lg" onClick={() => setModo("upload")}>
              <Plus className="h-4 w-4" /> Novo Questionamento
            </Button>
          </div>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-foreground">Rascunhos Salvos</h2>
            {rascunhos.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Nenhum rascunho salvo</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {rascunhos.map((r) => (
                  <Card key={r.sessao_id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium leading-snug">
                        {(r.titulo ?? r.nome_arquivo ?? "Sem título").slice(0, 60)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{r.created_at ? new Date(r.created_at).toLocaleDateString("pt-BR") : "—"}</span>
                        <Badge className={statusColors[r.status] ?? statusColors.rascunho} variant="outline">
                          {statusLabels[r.status] ?? r.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.total_itens ?? 0} itens na fila • {r.total_gerados ?? 0} gerados
                      </p>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" onClick={() => carregarRascunho(r.sessao_id)}>Continuar</Button>
                        <Button size="sm" variant="destructive" onClick={() => excluirRascunho(r.sessao_id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {/* ══════ MODO UPLOAD ══════ */}
      {modo === "upload" && (
        <main className="mx-auto max-w-xl px-4 py-10 md:px-8">
          <Button variant="ghost" className="mb-4 gap-1" onClick={() => setModo("inicio")}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Carregar Edital</h1>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) setArquivo(f);
            }}
            className={`mt-6 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Arraste um PDF ou DOCX aqui</p>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              Selecionar arquivo
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.doc"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) setArquivo(e.target.files[0]); }}
            />
          </div>

          {arquivo && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <span className="text-sm font-medium text-foreground">{arquivo.name}</span>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Extraindo texto e detectando itens…</> : "Processar Edital"}
              </Button>
            </div>
          )}
          {uploadError && <p className="mt-3 text-sm text-destructive">{uploadError}</p>}
        </main>
      )}

      {/* ══════ MODO EDITOR ══════ */}
      {modo === "editor" && (
        <div className="flex h-[calc(100vh-64px)] flex-col">
          {/* header */}
          <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-2">
            <Button variant="ghost" size="sm" onClick={voltar}><ArrowLeft className="h-4 w-4" /></Button>
            <span className="truncate text-sm font-medium text-foreground">
              {(sessaoInfo?.nome_arquivo ?? "Edital").slice(0, 50)}
            </span>
            <Badge className={statusColors[sessaoInfo?.status] ?? statusColors.rascunho} variant="outline">
              {statusLabels[sessaoInfo?.status] ?? "Rascunho"}
            </Badge>
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={salvarConfig}>💾 Salvar</Button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* ── PAINEL ESQUERDO ── */}
            <aside className="flex w-[300px] shrink-0 flex-col border-r border-border bg-card">
              <Tabs value={abaAtiva} onValueChange={(v) => setAbaAtiva(v as any)} className="flex flex-1 flex-col">
                <TabsList className="mx-2 mt-2 w-auto">
                  <TabsTrigger value="itens" className="flex-1 text-xs">Itens Detectados</TabsTrigger>
                  <TabsTrigger value="fila" className="flex-1 text-xs">Fila ({fila.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="itens" className="flex flex-1 flex-col overflow-hidden px-2 pb-2">
                  {/* Counter */}
                  {safeItens.length > 0 && (() => {
                    const niveis = new Set(safeItens.map(i => i.nivel ?? 1));
                    return (
                      <p className="mb-1 mt-1 text-[10px] text-muted-foreground">
                        {safeItens.length} itens • {niveis.size} {niveis.size === 1 ? "nível" : "níveis"}
                      </p>
                    );
                  })()}
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar item…"
                      value={buscaItens}
                      onChange={(e) => setBuscaItens(e.target.value)}
                      className="h-8 pl-7 text-xs"
                    />
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="space-y-0.5 pr-2">
                      {itensFiltrados.map((it) => {
                        const naFila = itemNaFila(it.numero_item);
                        const nivel = it.nivel ?? 1;
                        const indent = nivel <= 1 ? 0 : nivel === 2 ? 12 : nivel === 3 ? 24 : 12 * Math.min(nivel - 1, 5);
                        const badgeClass = nivel <= 1
                          ? "bg-blue-800 text-white"
                          : nivel === 2
                          ? "bg-blue-500 text-white"
                          : nivel === 3
                          ? "bg-blue-300 text-blue-900"
                          : "bg-slate-300 text-slate-700";
                        const textClass = nivel <= 1 ? "font-semibold text-xs" : nivel >= 4 ? "text-[11px] text-muted-foreground" : "text-xs";
                        return (
                          <button
                            key={it.numero_item}
                            onClick={() => {
                              if (naFila) {
                                const f = fila.find((fi) => fi.numero_item === it.numero_item);
                                if (f) { setItemSelecionado(f); setAbaAtiva("fila"); }
                              } else {
                                adicionarNaFila(it);
                              }
                            }}
                            style={{ paddingLeft: `${8 + indent}px` }}
                            className="flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left hover:bg-accent"
                          >
                            <Badge variant="secondary" className={`shrink-0 text-[10px] border-0 ${badgeClass}`}>{it.numero_item}</Badge>
                            <span className={`flex-1 truncate ${textClass}`}>{(it.titulo_item ?? "").slice(0, 60)}</span>
                            {naFila && <Check className="h-3.5 w-3.5 shrink-0 text-green-600" />}
                          </button>
                        );
                      })}
                      {itensFiltrados.length === 0 && (
                        <p className="py-4 text-center text-xs text-muted-foreground">Nenhum item encontrado</p>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Add manual item */}
                  <div className="border-t border-border pt-2 mt-1">
                    {!addManual ? (
                      <Button variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={() => setAddManual(true)}>
                        <Plus className="h-3 w-3" /> Adicionar item manualmente
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          placeholder="Número do item (ex: 3.2.1.4.)"
                          value={manualNumero}
                          onChange={(e) => setManualNumero(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Textarea
                          placeholder="Trecho do edital"
                          value={manualTrecho}
                          onChange={(e) => setManualTrecho(e.target.value)}
                          className="min-h-[60px] text-xs"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 text-xs"
                            disabled={!manualNumero.trim() || !sessaoId}
                            onClick={async () => {
                              await adicionarNaFila({
                                numero_item: manualNumero.trim(),
                                trecho_original: manualTrecho.trim(),
                                titulo_item: manualNumero.trim(),
                                objetivo: null,
                              });
                              setManualNumero("");
                              setManualTrecho("");
                              setAddManual(false);
                            }}
                          >
                            Adicionar à fila
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setAddManual(false); setManualNumero(""); setManualTrecho(""); }}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="fila" className="flex flex-1 flex-col overflow-hidden px-2 pb-2">
                  <ScrollArea className="flex-1">
                    <div className="space-y-1 pr-2">
                      {fila.map((fi) => (
                        <div
                          key={fi.id}
                          onClick={() => setItemSelecionado(fi)}
                          className={`group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent ${
                            itemSelecionado?.id === fi.id ? "border border-primary bg-primary/5" : ""
                          }`}
                        >
                          <Badge variant="outline" className={`shrink-0 text-[10px] ${statusColors[fi.status] ?? ""}`}>
                            {statusLabels[fi.status] ?? fi.status}
                          </Badge>
                          <span className="flex-1 truncate">{fi.numero_item} — {(fi.titulo_item ?? "").slice(0, 40)}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); removerDaFila(fi.id); }}
                            className="hidden shrink-0 text-muted-foreground hover:text-destructive group-hover:inline-flex"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {fila.length === 0 && (
                        <p className="py-4 text-center text-xs text-muted-foreground">Nenhum item na fila</p>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </aside>

            {/* ── PAINEL CENTRAL ── */}
            <main className="flex-1 overflow-y-auto p-4">
              {!itemSelecionado ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Selecione um item da fila para configurar
                </div>
              ) : (
                <div className="mx-auto max-w-2xl space-y-5">
                  <h2 className="text-lg font-semibold text-foreground">
                    {itemSelecionado.numero_item} — {itemSelecionado.titulo_item}
                  </h2>

                  {/* Trecho */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Trecho do item</label>
                    <Textarea
                      value={formTrecho}
                      onChange={(e) => setFormTrecho(e.target.value)}
                      disabled={!formTrechoEditavel}
                      className="text-xs"
                      rows={4}
                    />
                    <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs" onClick={() => setFormTrechoEditavel(!formTrechoEditavel)}>
                      {formTrechoEditavel ? "🔒 Travar edição" : "✏️ Habilitar edição manual"}
                    </Button>
                  </div>

                  {/* Objetivo */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">Objetivo *</label>
                    <RadioGroup value={formObjetivo} onValueChange={setFormObjetivo} className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="esclarecimento" /> 📋 Pedir Esclarecimento
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="alteracao" /> ✏️ Sugerir Alteração
                      </label>
                    </RadioGroup>
                  </div>

                  {formObjetivo === "esclarecimento" && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">O que está gerando dúvida? *</label>
                      <Textarea value={formDuvida} onChange={(e) => setFormDuvida(e.target.value)} className="text-xs" rows={3} />
                    </div>
                  )}

                  {formObjetivo === "alteracao" && (
                    <>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Especificação Original</label>
                        <Input value={formEspecOriginal} onChange={(e) => setFormEspecOriginal(e.target.value)} className="text-xs" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Especificação Proposta *</label>
                        <Textarea value={formEspecProposta} onChange={(e) => setFormEspecProposta(e.target.value)} className="text-xs" rows={3} />
                      </div>
                    </>
                  )}

                  {/* Tom */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Tom</label>
                    <Select value={formTom} onValueChange={setFormTom}>
                      <SelectTrigger className="w-full text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tecnico">🔧 Técnico-objetivo</SelectItem>
                        <SelectItem value="juridico">⚖️ Jurídico-formal</SelectItem>
                        <SelectItem value="administrativo">📋 Administrativo-neutro</SelectItem>
                        <SelectItem value="assertivo">🎯 Assertivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Perfil */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Perfil</label>
                    <div className="flex gap-2">
                      <Button size="sm" variant={formPerfil === "tecnico" ? "default" : "outline"} onClick={() => setFormPerfil("tecnico")}>Técnico</Button>
                      <Button size="sm" variant={formPerfil === "administrativo" ? "default" : "outline"} onClick={() => setFormPerfil("administrativo")}>Administrativo</Button>
                    </div>
                  </div>

                  {/* Opções avançadas */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">Opções avançadas</label>
                    <div className="space-y-2">
                      {[
                        { id: "just", label: "Buscar justificativas plausíveis", checked: opcJustificativas, set: setOpcJustificativas },
                        { id: "leg", label: "Citar legislação e acórdãos TCU", checked: opcLegislacao, set: setOpcLegislacao },
                        { id: "rel", label: "Verificar relação com outros itens", checked: opcRelacao, set: setOpcRelacao },
                        { id: "cont", label: "Contestar especificação restritiva", checked: opcContestar, set: setOpcContestar },
                      ].map((o) => (
                        <label key={o.id} className="flex items-center gap-2 text-xs">
                          <Checkbox checked={o.checked} onCheckedChange={(v) => o.set(!!v)} /> {o.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <Button onClick={() => gerarItem(itemSelecionado.id)} disabled={gerando || !formObjetivo}>
                      {gerando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando com IA… (15-30s)</> : "🤖 Gerar Questionamento"}
                    </Button>
                    <Button variant="outline" onClick={salvarConfig}>💾 Salvar configuração</Button>
                  </div>
                </div>
              )}
            </main>

            {/* ── PAINEL DIREITO ── */}
            <aside className="flex w-[380px] shrink-0 flex-col border-l border-border bg-card">
              <Tabs value={abaPainelDir} onValueChange={(v) => setAbaPainelDir(v as any)} className="flex flex-1 flex-col">
                <TabsList className="mx-2 mt-2 w-auto">
                  <TabsTrigger value="item" className="flex-1 text-xs">Este Item</TabsTrigger>
                  {qtdGerados >= 2 && <TabsTrigger value="consolidado" className="flex-1 text-xs">Consolidado</TabsTrigger>}
                </TabsList>

                <TabsContent value="item" className="flex flex-1 flex-col overflow-hidden px-3 pb-3">
                  {!itemSelecionado || (!itemSelecionado.output_gerado && itemSelecionado.status !== "gerando") ? (
                    <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
                      Configure e gere o questionamento no painel central
                    </div>
                  ) : itemSelecionado.status === "gerando" ? (
                    <div className="flex flex-1 items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Aguardando geração…
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col gap-2 pt-2">
                      <ScrollArea className="flex-1 rounded-md border border-border bg-background p-3">
                        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
                          {itemSelecionado.output_gerado}
                        </pre>
                      </ScrollArea>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => copiarTexto(itemSelecionado.output_gerado)}>
                          <Copy className="mr-1 h-3 w-3" /> Copiar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => gerarItem(itemSelecionado.id)} disabled={gerando}>
                          <RefreshCw className="mr-1 h-3 w-3" /> Regenerar
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="consolidado" className="flex flex-1 flex-col overflow-hidden px-3 pb-3">
                  <ScrollArea className="flex-1 rounded-md border border-border bg-background p-3">
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">{consolidado}</pre>
                  </ScrollArea>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => copiarTexto(consolidado)}>
                      <Copy className="mr-1 h-3 w-3" /> Copiar tudo
                    </Button>
                    <Button size="sm" onClick={() => setExportModal(true)}>
                      <FileDown className="mr-1 h-3 w-3" /> Exportar DOCX
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </aside>
          </div>
        </div>
      )}

      {/* ══════ MODAL EXPORTAR ══════ */}
      <Dialog open={exportModal} onOpenChange={setExportModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Exportar DOCX</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Empresa</label>
              <Input value={exportEmpresa} onChange={(e) => setExportEmpresa(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Responsável técnico</label>
              <Input value={exportResponsavel} onChange={(e) => setExportResponsavel(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={async () => { if (sessaoId) { await exportarDocx(sessaoId, exportEmpresa, exportResponsavel); setExportModal(false); } }}>
              📄 Gerar e Baixar DOCX
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
