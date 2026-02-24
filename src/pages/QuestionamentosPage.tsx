import { useState, useEffect, useCallback, useRef } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  uploadEditalQ, fetchItensDetectados, adicionarItemFila, atualizarItemFila,
  removerItemFila, gerarQuestionamento, gerarTodosQuestionamentos, fetchConsolidado,
  fetchRascunhos, fetchRascunho, deletarRascunho, exportarDocx,
} from "@/lib/api";
import { Loader2, Upload, ArrowLeft, Trash2, Copy, RefreshCw, FileDown, Plus, ChevronDown, ChevronRight } from "lucide-react";

type Modo = "inicio" | "upload" | "editor";
type StatusItem = "pendente" | "em_edicao" | "gerando" | "gerado" | "erro";

interface ItemDetectado {
  numero_item: string;
  titulo_item: string;
  trecho_original: string;
  nivel: number;
}

interface ItemFila {
  id: number;
  numero_item: string;
  titulo_item: string;
  trecho_original: string;
  trecho_editado?: string;
  objetivo?: "esclarecimento" | "alteracao";
  tom: string;
  perfil: string;
  duvida?: string;
  spec_original?: string;
  spec_proposta?: string;
  opc_justificativas: boolean;
  opc_legislacao: boolean;
  opc_relacao_itens: boolean;
  opc_contestar: boolean;
  output_gerado?: string;
  status: StatusItem;
  ordem: number;
}

interface NoArvore {
  item: ItemDetectado;
  filhos: NoArvore[];
}

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

  // ─── ESTADOS GLOBAIS ───
  const [modo, setModo] = useState<Modo>("inicio");
  const [sessaoId, setSessaoId] = useState<number | null>(null);
  const [sessaoInfo, setSessaoInfo] = useState<any>(null);
  const [itensDetectados, setItensDetectados] = useState<ItemDetectado[]>([]);
  const [arvore, setArvore] = useState<NoArvore[]>([]);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [itemConfigurando, setItemConfigurando] = useState<ItemFila | null>(null);
  const [filaItens, setFilaItens] = useState<ItemFila[]>([]);
  const [gerados, setGerados] = useState<ItemFila[]>([]);
  const [rascunhos, setRascunhos] = useState<any[]>([]);
  const [carregandoRascunhos, setCarregandoRascunhos] = useState(false);

  // upload
  const [uploadArquivo, setUploadArquivo] = useState<File | null>(null);
  const [processando, setProcessando] = useState(false);
  const [erroUpload, setErroUpload] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // geração
  const [gerandoItem, setGerandoItem] = useState(false);
  const [gerandoLote, setGerandoLote] = useState(false);
  const [progressoLote, setProgressoLote] = useState({ atual: 0, total: 0 });

  // painel direito
  const [abaPainelDir, setAbaPainelDir] = useState<"gerados" | "consolidado">("gerados");
  const [consolidadoTexto, setConsolidadoTexto] = useState("");
  const [painelDirRecolhido, setPainelDirRecolhido] = useState(false);

  // painel esquerdo redimensionável
  const [larguraPainelEsq, setLarguraPainelEsq] = useState(280);
  const [redimensionando, setRedimensionando] = useState(false);

  // export modal
  const [modalExportar, setModalExportar] = useState(false);
  const [exportEmpresa, setExportEmpresa] = useState("DECATRON Tecnologia");
  const [exportResponsavel, setExportResponsavel] = useState("");

  // edição manual de trecho
  const [itemEditandoManual, setItemEditandoManual] = useState(false);

  // formulário manual
  const [mostrarFormManual, setMostrarFormManual] = useState(false);
  const [novoItemNumero, setNovoItemNumero] = useState("");
  const [novoItemTrecho, setNovoItemTrecho] = useState("");

  // ─── CONSTRUIR ÁRVORE ───
  const construirArvore = useCallback((itens: ItemDetectado[]): NoArvore[] => {
    if (!itens || itens.length === 0) return [];

    // Normalizar: garantir nivel e numero sem ponto final
    const normalizados = itens.map(i => ({
      ...i,
      nivel: i.nivel || 1,
      _num: i.numero_item.replace(/\.$/, ''),
    }));

    // Ordenar numericamente por todos os segmentos
    const ordenados = [...normalizados].sort((a, b) => {
      const pa = a._num.split('.').map(Number);
      const pb = b._num.split('.').map(Number);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] || 0) - (pb[i] || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });

    // Mapa de numero → nó para lookup O(1)
    const mapa = new Map<string, NoArvore>();
    const raizes: NoArvore[] = [];

    for (const item of ordenados) {
      const no: NoArvore = { item: { ...item, nivel: item.nivel }, filhos: [] };
      mapa.set(item._num, no);

      const segmentos = item._num.split('.');

      if (segmentos.length <= 1) {
        raizes.push(no);
      } else {
        let paiEncontrado = false;
        for (let i = segmentos.length - 1; i >= 1; i--) {
          const numPai = segmentos.slice(0, i).join('.');
          const noPai = mapa.get(numPai);
          if (noPai) {
            noPai.filhos.push(no);
            paiEncontrado = true;
            break;
          }
        }
        if (!paiEncontrado) {
          raizes.push(no);
        }
      }
    }

    return raizes;
  }, []);

  useEffect(() => {
    if (itensDetectados.length > 0) {
      const novaArvore = construirArvore(itensDetectados);
      setArvore(novaArvore);
      // Expandir todos os nós de nível 1 automaticamente
      const nivel1Nums = itensDetectados
        .filter((i) => (i.nivel || 1) === 1)
        .map((i) => i.numero_item.replace(/\.$/, ''));
      setExpandidos(new Set(nivel1Nums));
    } else {
      setArvore([]);
    }
  }, [itensDetectados, construirArvore]);

  // ─── CARREGAR RASCUNHOS ───
  useEffect(() => {
    if (modo === "inicio") {
      setCarregandoRascunhos(true);
      fetchRascunhos()
        .then((r) => {
          const list = Array.isArray(r?.data) ? r.data : Array.isArray(r?.data?.rascunhos) ? r.data.rascunhos : [];
          setRascunhos(list.filter(Boolean));
        })
        .catch(() => {})
        .finally(() => setCarregandoRascunhos(false));
    }
  }, [modo]);

  // ─── TOGGLE EXPANSÃO ───
  const toggleExpansao = (numeroItem: string) => {
    const num = numeroItem.replace(/\.$/, '');
    setExpandidos((prev) => {
      const novo = new Set(prev);
      if (novo.has(num)) novo.delete(num);
      else novo.add(num);
      return novo;
    });
  };

  // ─── RESIZE PAINEL ESQUERDO ───
  const iniciarResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setRedimensionando(true);
    const xInicial = e.clientX;
    const larguraInicial = larguraPainelEsq;

    const onMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - xInicial;
      const novaLargura = Math.min(500, Math.max(200, larguraInicial + delta));
      setLarguraPainelEsq(novaLargura);
    };

    const onMouseUp = () => {
      setRedimensionando(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [larguraPainelEsq]);

  useEffect(() => {
    if (redimensionando) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [redimensionando]);

  // ─── ABRIR CONFIGURADOR ───
  const abrirConfigurador = (item: ItemDetectado) => {
    const naFila = filaItens.find((f) => f.numero_item === item.numero_item);
    if (naFila) {
      setItemConfigurando(naFila);
      return;
    }
    const naGerados = gerados.find((g) => g.numero_item === item.numero_item);
    if (naGerados) {
      setItemConfigurando(naGerados);
      return;
    }
    setItemConfigurando({
      id: 0,
      numero_item: item.numero_item,
      titulo_item: item.titulo_item,
      trecho_original: item.trecho_original,
      objetivo: undefined,
      tom: "tecnico",
      perfil: "tecnico",
      opc_justificativas: true,
      opc_legislacao: true,
      opc_relacao_itens: false,
      opc_contestar: false,
      status: "pendente",
      ordem: filaItens.length,
    });
    setItemEditandoManual(false);
  };

  // ─── ADICIONAR À FILA ───
  const adicionarAFila = async () => {
    if (!itemConfigurando || !sessaoId) return;
    try {
      const res = await adicionarItemFila(sessaoId, {
        ...itemConfigurando,
        status: "pendente",
      });
      const itemSalvo: ItemFila = { ...itemConfigurando, id: res.data?.id ?? res.id, status: "pendente" };
      setFilaItens((prev) => [...prev.filter((f) => f.numero_item !== itemSalvo.numero_item), itemSalvo]);
      setItemConfigurando(itemSalvo);
      toast({ title: "Item adicionado à fila" });
    } catch (e) {
      toast({ title: "Erro ao adicionar à fila", variant: "destructive" });
    }
  };

  // ─── GERAR AGORA ───
  const gerarAgora = async () => {
    if (!itemConfigurando || !sessaoId) return;
    if (!itemConfigurando.objetivo) {
      toast({ title: "Selecione o objetivo (Esclarecimento ou Alteração)", variant: "destructive" });
      return;
    }
    if (itemConfigurando.objetivo === "esclarecimento" && !itemConfigurando.duvida) {
      toast({ title: "Preencha 'O que está gerando dúvida?'", variant: "destructive" });
      return;
    }
    if (itemConfigurando.objetivo === "alteracao" && !itemConfigurando.spec_proposta) {
      toast({ title: "Preencha a Especificação Proposta", variant: "destructive" });
      return;
    }

    setGerandoItem(true);
    try {
      let itemId = itemConfigurando.id;
      if (itemId === 0) {
        const resAdd = await adicionarItemFila(sessaoId, itemConfigurando);
        itemId = resAdd.data?.id ?? resAdd.id;
        setItemConfigurando((prev) => (prev ? { ...prev, id: itemId } : prev));
      } else {
        await atualizarItemFila(sessaoId, itemId, itemConfigurando);
      }
      setItemConfigurando((prev) => (prev ? { ...prev, status: "gerando" } : prev));
      const res = await gerarQuestionamento(sessaoId, itemId);
      const itemGerado: ItemFila = {
        ...itemConfigurando,
        id: itemId,
        output_gerado: res.data?.output ?? res.output ?? "",
        status: "gerado",
      };
      setItemConfigurando(itemGerado);
      setGerados((prev) => [...prev.filter((g) => g.numero_item !== itemGerado.numero_item), itemGerado]);
      setFilaItens((prev) => prev.filter((f) => f.numero_item !== itemGerado.numero_item));
      setAbaPainelDir("gerados");
    } catch {
      setItemConfigurando((prev) => (prev ? { ...prev, status: "erro" } : prev));
      toast({ title: "Erro ao gerar questionamento", variant: "destructive" });
    }
    setGerandoItem(false);
  };

  // ─── GERAR TODOS ───
  const gerarTodos = async () => {
    if (!sessaoId || filaItens.length === 0) return;
    setGerandoLote(true);
    setProgressoLote({ atual: 0, total: filaItens.length });

    for (let i = 0; i < filaItens.length; i++) {
      const item = filaItens[i];
      setProgressoLote({ atual: i + 1, total: filaItens.length });
      setFilaItens((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: "gerando" } : f)));

      try {
        await atualizarItemFila(sessaoId, item.id, item);
        const res = await gerarQuestionamento(sessaoId, item.id);
        const itemGerado: ItemFila = { ...item, output_gerado: res.data?.output ?? res.output ?? "", status: "gerado" };
        setGerados((prev) => [...prev.filter((g) => g.numero_item !== itemGerado.numero_item), itemGerado]);
        setFilaItens((prev) => prev.map((f) => (f.id === item.id ? itemGerado : f)));
      } catch {
        setFilaItens((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: "erro" } : f)));
      }
    }

    setGerandoLote(false);
    setAbaPainelDir("gerados");
  };

  // ─── UPLOAD ───
  const handleUpload = async () => {
    if (!uploadArquivo) return;
    setProcessando(true);
    setErroUpload("");
    try {
      const res = await uploadEditalQ(uploadArquivo);
      const sid = res.data?.sessao_id ?? res.sessao_id;
      setSessaoId(sid);
      setSessaoInfo(res.data ?? res);
      const itensArray = Array.isArray(res.data?.itens) ? res.data.itens : Array.isArray(res?.itens) ? res.itens : [];
      console.log("itensDetectados recebidos após upload:", itensArray);
      setItensDetectados(itensArray);
      setFilaItens([]);
      setGerados([]);
      setModo("editor");
    } catch (e: any) {
      setErroUpload(e.message || "Erro ao processar edital");
    }
    setProcessando(false);
  };

  const carregarRascunho = async (id: number) => {
    try {
      const res = await fetchRascunho(id);
      const d = res.data ?? res;
      setSessaoId(d.sessao?.id ?? d.sessao_id ?? id);
      setSessaoInfo(d.sessao ?? d);
      setFilaItens(Array.isArray(d.itens) ? d.itens : []);
      setGerados((Array.isArray(d.itens) ? d.itens : []).filter((i: any) => i?.status === "gerado"));

      // Buscar itens detectados separadamente
      try {
        const resItens = await fetchItensDetectados(id);
        const itensArr = Array.isArray(resItens?.data?.itens_detectados)
          ? resItens.data.itens_detectados
          : Array.isArray(resItens?.data?.itens)
          ? resItens.data.itens
          : Array.isArray(resItens?.data)
          ? resItens.data
          : [];
        console.log("itensDetectados recebidos ao continuar rascunho:", itensArr);
        setItensDetectados(itensArr);
      } catch {
        console.warn("Não foi possível carregar itens detectados para o rascunho", id);
        setItensDetectados([]);
      }

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

  const copiarTexto = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  const voltar = () => {
    setModo("inicio");
    setSessaoId(null);
    setSessaoInfo(null);
    setItensDetectados([]);
    setFilaItens([]);
    setGerados([]);
    setItemConfigurando(null);
    setConsolidadoTexto("");
    setUploadArquivo(null);
  };

  // ─── COMPONENTE ÁRVORE ───
  const ItemArvore = ({ no, profundidade = 0 }: { no: NoArvore; profundidade?: number }) => {
    const { item, filhos } = no;
    const eNivel1 = item.nivel === 1;
    const temFilhos = filhos.length > 0;
    const estaExpandido = expandidos.has(item.numero_item.replace(/\.$/, ''));
    const naFila = filaItens.find((f) => f.numero_item === item.numero_item);
    const foiGerado = gerados.find((g) => g.numero_item === item.numero_item);
    const estaConfigurando = itemConfigurando?.numero_item === item.numero_item;

    const indentacao = profundidade * 16;

    const corBadge = () => {
      if (foiGerado) return "bg-green-100 text-green-700 border-green-200";
      if (naFila) return "bg-yellow-100 text-yellow-700 border-yellow-200";
      if (eNivel1) return "bg-slate-100 text-slate-600 border-slate-200";
      return "bg-blue-50 text-blue-700 border-blue-200";
    };

    return (
      <div>
        <div
          className={`group flex items-center gap-1.5 py-1 pr-2 rounded-md transition-colors ${
            eNivel1 ? "cursor-pointer hover:bg-accent" : "cursor-pointer"
          } ${estaConfigurando ? "bg-primary/10 border border-primary/30" : !eNivel1 ? "hover:bg-accent" : ""}`}
          style={{ paddingLeft: `${4 + indentacao}px` }}
          onClick={() => eNivel1 && temFilhos ? toggleExpansao(item.numero_item) : !eNivel1 ? abrirConfigurador(item) : null}
        >
          {/* Expand/collapse */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (temFilhos) toggleExpansao(item.numero_item);
            }}
            className={`w-4 h-4 flex items-center justify-center flex-shrink-0 text-muted-foreground ${
              !temFilhos ? "invisible" : "hover:text-foreground"
            }`}
          >
            {estaExpandido ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>

          {/* Badge número */}
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 font-mono ${corBadge()}`}
            title={item.numero_item.replace(/\.$/, "")}
          >
            {item.numero_item.replace(/\.$/, "")}
          </span>

          {/* Título */}
          <span
            className={`flex-1 truncate ${
              eNivel1 ? "text-xs font-semibold text-foreground" : item.nivel >= 4 ? "text-[11px] text-muted-foreground" : "text-xs text-foreground"
            }`}
            title={`${item.numero_item.replace(/\.$/, '')} — ${item.titulo_item}`}
          >
            {item.titulo_item}
          </span>

          {/* Status */}
          {foiGerado && <span className="text-[10px] flex-shrink-0">✅</span>}
          {naFila && !foiGerado && (
            <span className="text-[10px] flex-shrink-0">{naFila.status === "gerando" ? "🔄" : "⏳"}</span>
          )}

          {/* Botão Questionar — nível 2+ */}
          {!eNivel1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                abrirConfigurador(item);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded hover:bg-primary/90"
            >
              Questionar
            </button>
          )}
        </div>

        {/* Filhos recursivos */}
        {estaExpandido && filhos.length > 0 && (
          <div>
            {filhos.map((filho) => (
              <ItemArvore key={filho.item.numero_item} no={filho} profundidade={profundidade + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── RENDER ───
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
                {rascunhos.filter(Boolean).map((r) => (
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
              if (f) setUploadArquivo(f);
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
              onChange={(e) => { if (e.target.files?.[0]) setUploadArquivo(e.target.files[0]); }}
            />
          </div>

          {uploadArquivo && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <span className="text-sm font-medium text-foreground">{uploadArquivo.name}</span>
              <Button onClick={handleUpload} disabled={processando}>
                {processando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Extraindo texto e detectando itens…</> : "Processar Edital"}
              </Button>
            </div>
          )}
          {erroUpload && <p className="mt-3 text-sm text-destructive">{erroUpload}</p>}
        </main>
      )}

      {/* ══════ MODO EDITOR ══════ */}
      {modo === "editor" && (
        <div className="flex h-[calc(100vh-64px)] flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-2">
            <Button variant="ghost" size="sm" onClick={voltar}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="truncate text-sm font-medium text-foreground">
              {(sessaoInfo?.nome_arquivo ?? "Edital").slice(0, 50)}
            </span>
            <Badge className={statusColors[sessaoInfo?.status] ?? statusColors.rascunho} variant="outline">
              {statusLabels[sessaoInfo?.status] ?? "Rascunho"}
            </Badge>
            <div className="ml-auto" />
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* ── WRAPPER PAINEL ESQUERDO + RESIZE ── */}
            <div className="flex flex-shrink-0 h-full" style={{ width: `${larguraPainelEsq}px` }}>
              <aside className="flex-1 flex flex-col border-r border-border bg-card overflow-hidden">
                {/* Cabeçalho */}
                <div className="px-3 pt-3 pb-2">
                  <p className="text-[11px] text-muted-foreground">
                    {itensDetectados.length > 0
                      ? `${itensDetectados.length} itens detectados • ${Math.max(...itensDetectados.map((i) => i.nivel || 1), 0)} níveis`
                      : filaItens.length > 0
                      ? `${filaItens.length} itens na fila`
                      : "Nenhum item"}
                  </p>
                </div>

                {/* Árvore */}
                <ScrollArea className="flex-1 px-1">
                  <div className="pb-2">
                    {arvore.map((no) => (
                      <ItemArvore key={no.item.numero_item} no={no} />
                    ))}

                    {arvore.length === 0 && itensDetectados.length === 0 && (
                      <p className="py-6 text-center text-xs text-muted-foreground">Nenhum item detectado</p>
                    )}

                    {/* Botão adicionar manualmente */}
                    <div className="mt-2 px-2">
                      {!mostrarFormManual ? (
                        <button
                          onClick={() => setMostrarFormManual(true)}
                          className="w-full text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded p-2 hover:border-primary/40 transition-colors"
                        >
                          ➕ Adicionar item manualmente
                        </button>
                      ) : (
                        <div className="space-y-2 border border-border rounded p-2">
                          <Input
                            value={novoItemNumero}
                            onChange={(e) => setNovoItemNumero(e.target.value)}
                            placeholder="Número (ex: 3.2.1.4)"
                            className="h-7 text-xs"
                          />
                          <Textarea
                            value={novoItemTrecho}
                            onChange={(e) => setNovoItemTrecho(e.target.value)}
                            placeholder="Cole o trecho do edital aqui..."
                            rows={3}
                            className="text-xs min-h-[60px] resize-none"
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              className="flex-1 text-xs h-7"
                              disabled={!novoItemNumero.trim() || !novoItemTrecho.trim()}
                              onClick={() => {
                                abrirConfigurador({
                                  numero_item: novoItemNumero.trim(),
                                  titulo_item: novoItemNumero.trim(),
                                  trecho_original: novoItemTrecho.trim(),
                                  nivel: 2,
                                });
                                setMostrarFormManual(false);
                                setNovoItemNumero("");
                                setNovoItemTrecho("");
                              }}
                            >
                              Adicionar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7"
                              onClick={() => {
                                setMostrarFormManual(false);
                                setNovoItemNumero("");
                                setNovoItemTrecho("");
                              }}
                            >
                              ✕
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>

                {/* Seção Fila */}
                {filaItens.length > 0 && (
                  <div className="border-t border-border p-3 space-y-2 max-h-48 overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Fila ({filaItens.length})</span>
                      {!gerandoLote ? (
                        <Button size="sm" className="h-6 text-[11px] px-2 gap-1" onClick={gerarTodos}>
                          🚀 Gerar Todos
                        </Button>
                      ) : (
                        <span className="text-xs text-primary animate-pulse">
                          {progressoLote.atual}/{progressoLote.total}…
                        </span>
                      )}
                    </div>

                    {gerandoLote && (
                      <Progress value={(progressoLote.atual / progressoLote.total) * 100} className="h-1.5" />
                    )}

                    {filaItens.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-xs">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            item.status === "gerado"
                              ? "bg-green-500"
                              : item.status === "gerando"
                              ? "bg-primary animate-pulse"
                              : item.status === "erro"
                              ? "bg-destructive"
                              : "bg-yellow-400"
                          }`}
                        />
                        <span className="truncate flex-1 text-muted-foreground">
                          {item.numero_item} {item.titulo_item}
                        </span>
                        <button
                          onClick={() =>
                            sessaoId &&
                            removerItemFila(sessaoId, item.id).then(() =>
                              setFilaItens((prev) => prev.filter((f) => f.id !== item.id))
                            )
                          }
                          className="text-muted-foreground hover:text-destructive flex-shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </aside>

              {/* Barra de resize */}
              <div
                onMouseDown={iniciarResize}
                className={`w-1 flex-shrink-0 cursor-col-resize hover:bg-primary/40 transition-colors ${
                  redimensionando ? 'bg-primary/50' : 'bg-transparent'
                }`}
                title="Arrastar para redimensionar"
              />
            </div>

            {/* ── PAINEL CENTRAL ── */}
            <main className="flex-1 overflow-y-auto p-6">
              {!itemConfigurando ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
                  <div className="text-4xl">📋</div>
                  <p className="text-lg font-medium">Selecione um item para questionar</p>
                  <p className="text-sm">
                    Navegue pela árvore à esquerda e clique em "Questionar" em qualquer item de nível 2 ou mais
                  </p>
                </div>
              ) : (
                <div className="max-w-2xl space-y-5">
                  {/* Header do item */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {itemConfigurando.numero_item.replace(/\.$/, "")}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          itemConfigurando.status === "gerado"
                            ? "bg-green-100 text-green-700"
                            : itemConfigurando.status === "gerando"
                            ? "bg-blue-100 text-blue-700"
                            : itemConfigurando.status === "erro"
                            ? "bg-red-100 text-red-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {itemConfigurando.status === "gerado"
                          ? "✅ Gerado"
                          : itemConfigurando.status === "gerando"
                          ? "🔄 Gerando..."
                          : itemConfigurando.status === "erro"
                          ? "❌ Erro"
                          : "⚪ Pendente"}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">{itemConfigurando.titulo_item}</h2>
                  </div>

                  {/* Trecho */}
                  <div>
                    <label className="text-sm font-medium mb-1 block text-foreground">Trecho do item</label>
                    <Textarea
                      value={
                        itemEditandoManual
                          ? itemConfigurando.trecho_editado || itemConfigurando.trecho_original
                          : itemConfigurando.trecho_original
                      }
                      onChange={(e) =>
                        setItemConfigurando((prev) => (prev ? { ...prev, trecho_editado: e.target.value } : prev))
                      }
                      disabled={!itemEditandoManual}
                      rows={4}
                      className="text-sm resize-none"
                    />
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs mt-1"
                      onClick={() => setItemEditandoManual((prev) => !prev)}
                    >
                      {itemEditandoManual ? "🔒 Travar edição" : "✏️ Habilitar edição manual"}
                    </Button>
                  </div>

                  {/* Objetivo */}
                  <div>
                    <label className="text-sm font-medium mb-2 block text-foreground">Objetivo *</label>
                    <div className="flex gap-4">
                      {[
                        { value: "esclarecimento" as const, label: "📋 Pedir Esclarecimento" },
                        { value: "alteracao" as const, label: "✏️ Sugerir Alteração" },
                      ].map((op) => (
                        <label key={op.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="objetivo"
                            value={op.value}
                            checked={itemConfigurando.objetivo === op.value}
                            onChange={() =>
                              setItemConfigurando((prev) => (prev ? { ...prev, objetivo: op.value } : prev))
                            }
                            className="accent-primary"
                          />
                          <span className="text-sm">{op.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Dúvida — esclarecimento */}
                  {itemConfigurando.objetivo === "esclarecimento" && (
                    <div>
                      <label className="text-sm font-medium mb-1 block text-foreground">
                        O que está gerando dúvida? *
                      </label>
                      <Textarea
                        value={itemConfigurando.duvida || ""}
                        onChange={(e) =>
                          setItemConfigurando((prev) => (prev ? { ...prev, duvida: e.target.value } : prev))
                        }
                        rows={3}
                        placeholder="Descreva o que gera dúvida neste item..."
                        className="text-sm"
                      />
                    </div>
                  )}

                  {/* Especificações — alteração */}
                  {itemConfigurando.objetivo === "alteracao" && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block text-foreground">Especificação Original</label>
                        <Textarea
                          value={itemConfigurando.spec_original || itemConfigurando.trecho_original}
                          onChange={(e) =>
                            setItemConfigurando((prev) => (prev ? { ...prev, spec_original: e.target.value } : prev))
                          }
                          rows={3}
                          className="text-sm resize-none bg-muted"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block text-foreground">
                          Especificação Proposta *
                        </label>
                        <Textarea
                          value={itemConfigurando.spec_proposta || ""}
                          onChange={(e) =>
                            setItemConfigurando((prev) => (prev ? { ...prev, spec_proposta: e.target.value } : prev))
                          }
                          rows={3}
                          placeholder="Descreva a alteração que você propõe..."
                          className="text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Tom */}
                  <div>
                    <label className="text-sm font-medium mb-1 block text-foreground">Tom</label>
                    <select
                      value={itemConfigurando.tom}
                      onChange={(e) =>
                        setItemConfigurando((prev) => (prev ? { ...prev, tom: e.target.value } : prev))
                      }
                      className="w-full text-sm border border-input rounded-md p-2 bg-background"
                    >
                      <option value="tecnico">🔧 Técnico-objetivo</option>
                      <option value="juridico">⚖️ Jurídico-formal</option>
                      <option value="administrativo">📋 Administrativo-neutro</option>
                      <option value="assertivo">🎯 Assertivo</option>
                    </select>
                  </div>

                  {/* Perfil */}
                  <div>
                    <label className="text-sm font-medium mb-2 block text-foreground">Perfil</label>
                    <div className="flex gap-2">
                      {(["tecnico", "administrativo"] as const).map((p) => (
                        <Button
                          key={p}
                          size="sm"
                          variant={itemConfigurando.perfil === p ? "default" : "outline"}
                          onClick={() =>
                            setItemConfigurando((prev) => (prev ? { ...prev, perfil: p } : prev))
                          }
                        >
                          {p === "tecnico" ? "Técnico" : "Administrativo"}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Opções avançadas */}
                  <div>
                    <label className="text-sm font-medium mb-2 block text-foreground">Opções avançadas</label>
                    <div className="space-y-2">
                      {[
                        { key: "opc_justificativas" as const, label: "Buscar justificativas plausíveis" },
                        { key: "opc_legislacao" as const, label: "Citar legislação e acórdãos TCU" },
                        { key: "opc_relacao_itens" as const, label: "Verificar relação com outros itens" },
                        { key: "opc_contestar" as const, label: "Contestar especificação restritiva" },
                      ].map((op) => (
                        <label key={op.key} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={itemConfigurando[op.key] as boolean}
                            onCheckedChange={(v) =>
                              setItemConfigurando((prev) => (prev ? { ...prev, [op.key]: !!v } : prev))
                            }
                          />
                          <span className="text-sm">{op.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Botões de ação */}
                  <div className="flex gap-3 pt-2 border-t border-border">
                    <Button
                      onClick={gerarAgora}
                      disabled={gerandoItem || !itemConfigurando.objetivo}
                      className="flex-1"
                    >
                      {gerandoItem ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando… (15-30s)
                        </>
                      ) : (
                        "🤖 Gerar Agora"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={adicionarAFila}
                      disabled={!itemConfigurando.objetivo || itemConfigurando.id > 0}
                      className="flex-1"
                    >
                      ➕ Adicionar à Fila
                    </Button>
                  </div>

                  {/* Output gerado inline */}
                  {itemConfigurando.status === "gerado" && itemConfigurando.output_gerado && (
                    <div className="border border-border rounded-lg p-4 bg-muted/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Resultado gerado</span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => copiarTexto(itemConfigurando.output_gerado || "")}
                          >
                            <Copy className="h-3 w-3 mr-1" /> Copiar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={gerarAgora}
                            disabled={gerandoItem}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" /> Regenerar
                          </Button>
                        </div>
                      </div>
                      <pre className="text-xs whitespace-pre-wrap text-foreground leading-relaxed">
                        {itemConfigurando.output_gerado}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </main>

            {/* ── PAINEL DIREITO — recolhível ── */}
            <div
              className={`border-l border-border flex flex-col h-full overflow-hidden transition-all duration-300 flex-shrink-0 relative bg-card ${
                painelDirRecolhido ? 'w-10' : 'w-96'
              }`}
            >
              {/* Botão recolher/expandir */}
              <button
                onClick={() => setPainelDirRecolhido(prev => !prev)}
                className="absolute top-3 left-0 z-10 w-6 h-12 bg-background border border-border border-l-0 rounded-r flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shadow-sm"
                title={painelDirRecolhido ? 'Expandir painel' : 'Recolher painel'}
              >
                {painelDirRecolhido ? '◀' : '▶'}
              </button>

              {/* Conteúdo — esconde quando recolhido */}
              {!painelDirRecolhido && (
                <>
                  {/* Tabs */}
                  <div className="flex border-b border-border pl-7">
                    <button
                      onClick={() => setAbaPainelDir("gerados")}
                      className={`flex-1 py-3 text-sm font-medium transition-colors ${
                        abaPainelDir === "gerados"
                          ? "border-b-2 border-primary text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Gerados ({gerados.length})
                    </button>
                    <button
                      onClick={() => {
                        setAbaPainelDir("consolidado");
                        if (sessaoId && gerados.length >= 2) {
                          fetchConsolidado(sessaoId)
                            .then((r) => setConsolidadoTexto(r.data?.texto || ""))
                            .catch(() => setConsolidadoTexto("Erro ao carregar consolidado."));
                        }
                      }}
                      className={`flex-1 py-3 text-sm font-medium transition-colors ${
                        abaPainelDir === "consolidado"
                          ? "border-b-2 border-primary text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Consolidado
                    </button>
                  </div>

                  <ScrollArea className="flex-1 p-3">
                    {abaPainelDir === "gerados" && (
                      <div className="space-y-3">
                        {gerados.length === 0 ? (
                          <div className="text-center text-muted-foreground text-sm py-8">
                            <p className="text-2xl mb-2">📝</p>
                            <p>Nenhum item gerado ainda</p>
                            <p className="text-xs mt-1">Use "Gerar Agora" ou "Gerar Todos"</p>
                          </div>
                        ) : (
                          gerados.map((item) => (
                            <div key={item.id} className="border border-border rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-mono bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                  {item.numero_item.replace(/\.$/, "")}
                                </span>
                                <span className="text-[11px] text-green-600">✅ Gerado</span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{item.titulo_item}</p>
                              <p className="text-xs text-foreground line-clamp-3 bg-muted p-2 rounded">
                                {item.output_gerado?.slice(0, 200)}…
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 text-xs h-7"
                                  onClick={() => {
                                    setItemConfigurando(item);
                                  }}
                                >
                                  👁 Ver completo
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 px-2"
                                  onClick={() => copiarTexto(item.output_gerado || "")}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {abaPainelDir === "consolidado" && (
                      <div className="space-y-3">
                        {gerados.length < 2 ? (
                          <div className="text-center text-muted-foreground text-sm py-8">
                            <p>Gere ao menos 2 itens para ver o consolidado</p>
                          </div>
                        ) : (
                          <>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-xs"
                                onClick={() => copiarTexto(consolidadoTexto)}
                              >
                                <Copy className="h-3 w-3 mr-1" /> Copiar tudo
                              </Button>
                              <Button size="sm" className="flex-1 text-xs" onClick={() => setModalExportar(true)}>
                                <FileDown className="h-3 w-3 mr-1" /> Exportar DOCX
                              </Button>
                            </div>
                            <pre className="text-xs text-foreground whitespace-pre-wrap bg-muted p-3 rounded overflow-x-auto leading-relaxed">
                              {consolidadoTexto || "Carregando..."}
                            </pre>
                          </>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </>
              )}

              {/* Quando recolhido: badge vertical */}
              {painelDirRecolhido && (
                <div className="flex flex-col items-center pt-16 gap-4">
                  <div
                    className="text-xs text-muted-foreground cursor-pointer hover:text-foreground"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                    onClick={() => setPainelDirRecolhido(false)}
                  >
                    Gerados ({gerados.length})
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════ MODAL EXPORTAR ══════ */}
      <Dialog open={modalExportar} onOpenChange={setModalExportar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar Questionamentos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">Empresa</label>
              <Input value={exportEmpresa} onChange={(e) => setExportEmpresa(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">Responsável técnico (opcional)</label>
              <Input
                value={exportResponsavel}
                onChange={(e) => setExportResponsavel(e.target.value)}
                placeholder="Nome do responsável"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (sessaoId) {
                  await exportarDocx(sessaoId, exportEmpresa, exportResponsavel);
                  setModalExportar(false);
                }
              }}
            >
              📄 Gerar e Baixar DOCX
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
