import { useState, useEffect, useRef, useCallback } from "react";
import { Upload, X, FileText, CheckCircle, Clock, AlertCircle, Loader2, RotateCcw, Target, FileSearch, FileLock2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import { fetchTiposAnalise, uploadEdital, fetchStatus, fetchHistorico } from "@/lib/api";

interface TipoAnalise {
  id: string;
  titulo: string;
  descricao: string;
  icone?: string;
}

interface StatusData {
  job_id: string;
  status: string;
  progresso: number;
  etapa_atual: string;
  score: number | null;
  decisao: "GO" | "NO-GO" | "AVALIAR" | null;
  resumo: string | null;
  erro_mensagem: string | null;
  arquivo_nome: string;
  tipo_analise: string;
  criado_em: string;
  concluido_em: string | null;
}

interface HistoricoItem extends StatusData {}

const statusSteps = [
  { key: "enfileirado", label: "Arquivo recebido" },
  { key: "extraindo_texto", label: "Extraindo texto do documento..." },
  { key: "analisando", label: "Analisando com inteligência artificial..." },
  { key: "enviando_email", label: "Enviando resultado por email..." },
  { key: "concluido", label: "Análise concluída!" },
];

const statusLabels: Record<string, string> = {
  enfileirado: "Na fila de processamento...",
  extraindo_texto: "Extraindo texto do documento...",
  analisando: "Analisando com inteligência artificial...",
  enviando_email: "Enviando resultado por email...",
  concluido: "✅ Análise concluída! Resultado enviado para seu email.",
  erro: "❌ Ocorreu um erro",
};

function getDecisaoBadge(decisao: string | null) {
  if (!decisao) return null;
  const map: Record<string, string> = {
    GO: "bg-[hsl(145,63%,90%)] text-[hsl(145,50%,24%)] border border-success",
    "NO-GO": "bg-[hsl(354,70%,93%)] text-[hsl(354,50%,28%)] border border-destructive",
    AVALIAR: "bg-[hsl(45,100%,90%)] text-[hsl(40,60%,20%)] border border-warning",
  };
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${map[decisao] || ""}`}>
      {decisao}
    </span>
  );
}

function getScoreColor(score: number) {
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-destructive";
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function AnalisePage() {
  const [tipos, setTipos] = useState<TipoAnalise[]>([]);
  const [tipoSelecionado, setTipoSelecionado] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<"form" | "progress" | "result">("form");
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTiposAnalise()
      .then((data) => setTipos(Array.isArray(data) ? data : []))
      .catch(() => {});
    loadHistorico();
  }, []);

  const loadHistorico = useCallback(() => {
    fetchHistorico()
      .then((data) => setHistorico(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleUpload = async () => {
    if (!file || !tipoSelecionado) return;
    setUploading(true);
    setUploadError("");
    try {
      const data = await uploadEdital(file, tipoSelecionado);
      setPhase("progress");
      startPolling(data.job_id);
    } catch (err: any) {
      setUploadError(err.message || "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  const startPolling = (jobId: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      try {
        const data = await fetchStatus(jobId);
        setStatusData(data);
        if (data.status === "concluido") {
          clearInterval(intervalRef.current!);
          setPhase("result");
          loadHistorico();
        } else if (data.status === "erro") {
          clearInterval(intervalRef.current!);
          setPhase("result");
          loadHistorico();
        }
      } catch {
        clearInterval(intervalRef.current!);
      }
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const reset = () => {
    setPhase("form");
    setFile(null);
    setTipoSelecionado("");
    setStatusData(null);
    setUploadError("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && validateFile(f)) setFile(f);
  };

  const validateFile = (f: File) => {
    const valid = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!valid.includes(f.type)) return false;
    if (f.size > 20 * 1024 * 1024) return false;
    return true;
  };

  const currentStepIndex = statusData
    ? statusSteps.findIndex((s) => s.key === statusData.status)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <Breadcrumb items={[{ label: "Hub", to: "/hub" }, { label: "Análise de Editais" }]} />

      <main className="mx-auto max-w-7xl px-4 pb-12 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          {/* LEFT COLUMN */}
          <div>
            {phase === "form" && (
              <div className="rounded-xl border bg-card p-6">
                <h2 className="text-xl font-bold text-foreground">Nova Análise</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Selecione o tipo e faça o upload do documento
                </p>
                {tipos.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando tipos...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {/* Card 1 — GO/NO-GO */}
                    {tipos[0] && (
                      <button
                        key={tipos[0].id}
                        onClick={() => setTipoSelecionado(tipos[0].id)}
                        className={`group relative flex cursor-pointer flex-col items-start rounded-2xl border-2 p-7 text-left transition-all duration-300 ${
                          tipoSelecionado === tipos[0].id
                            ? "border-[#0090d4] shadow-[0_0_0_4px_rgba(0,144,212,0.15),0_4px_16px_rgba(0,144,212,0.2)]"
                            : "border-[#e5e7eb] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-[#0090d4] hover:shadow-[0_0_0_3px_rgba(0,144,212,0.2),0_8px_24px_rgba(0,144,212,0.25)]"
                        }`}
                        style={{
                          background: tipoSelecionado === tipos[0].id
                            ? "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)"
                            : undefined,
                        }}
                        onMouseEnter={(e) => {
                          if (tipoSelecionado !== tipos[0].id) {
                            (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, #f8fbff 0%, #eff8ff 100%)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (tipoSelecionado !== tipos[0].id) {
                            (e.currentTarget as HTMLElement).style.background = "";
                          }
                        }}
                      >
                        <Target
                          size={40}
                          className={`mb-3 transition-transform duration-300 group-hover:scale-[1.12] ${
                            tipoSelecionado === tipos[0].id ? "text-[#1a2744]" : "text-[#0090d4]"
                          }`}
                        />
                        <span className="block text-sm font-bold text-foreground">Análise GO/NO-GO</span>
                        <span className="mt-1 block text-xs text-muted-foreground">Avalia aderência ao portfólio e decide se vale participar</span>
                      </button>
                    )}

                    {/* Card 2 — Análise do TR */}
                    {tipos[1] && (
                      <button
                        key={tipos[1].id}
                        onClick={() => setTipoSelecionado(tipos[1].id)}
                        className={`group relative flex cursor-pointer flex-col items-start rounded-2xl border-2 p-7 text-left transition-all duration-300 ${
                          tipoSelecionado === tipos[1].id
                            ? "border-[#0090d4] shadow-[0_0_0_4px_rgba(0,144,212,0.15),0_4px_16px_rgba(0,144,212,0.2)]"
                            : "border-[#e5e7eb] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-[#0090d4] hover:shadow-[0_0_0_3px_rgba(0,144,212,0.2),0_8px_24px_rgba(0,144,212,0.25)]"
                        }`}
                        style={{
                          background: tipoSelecionado === tipos[1].id
                            ? "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)"
                            : undefined,
                        }}
                        onMouseEnter={(e) => {
                          if (tipoSelecionado !== tipos[1].id) {
                            (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, #f8fbff 0%, #eff8ff 100%)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (tipoSelecionado !== tipos[1].id) {
                            (e.currentTarget as HTMLElement).style.background = "";
                          }
                        }}
                      >
                        <FileSearch
                          size={40}
                          className={`mb-3 transition-transform duration-300 group-hover:scale-[1.12] ${
                            tipoSelecionado === tipos[1].id ? "text-[#1a2744]" : "text-[#0090d4]"
                          }`}
                        />
                        <span className="block text-sm font-bold text-foreground">Análise do TR</span>
                        <span className="mt-1 block text-xs text-muted-foreground">Laudo técnico completo: escopo, SLAs, exigências, riscos e scorecard</span>
                      </button>
                    )}

                    {/* Card 3 — Análise de Minuta (INATIVO) */}
                    <div
                      className="relative flex cursor-not-allowed flex-col items-start rounded-2xl border-2 border-[#e5e7eb] p-7 opacity-[0.55] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                    >
                      <span
                        className="absolute right-3 top-3 rounded-full px-2 py-0.5 font-medium"
                        style={{ background: "#f3f4f6", color: "#6b7280", fontSize: "11px" }}
                      >
                        Em breve
                      </span>
                      <FileLock2 size={40} className="mb-3 text-[#9ca3af]" />
                      <span className="block text-sm font-bold text-muted-foreground">Análise de Minuta</span>
                      <span className="mt-1 block text-xs text-muted-foreground">Revisão jurídica automatizada de minutas contratuais</span>
                    </div>
                  </div>
                )}

                {/* Step 2 */}
                {tipoSelecionado && (
                  <>
                    <h3 className="mb-3 mt-6 text-sm font-semibold text-foreground">2. Upload do edital</h3>
                    {!file ? (
                      <div
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => fileInputRef.current?.click()}
                        className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-primary/40 bg-accent/40 px-6 py-10 transition-colors hover:border-primary/70"
                      >
                        <Upload className="h-8 w-8 text-primary/60" />
                        <span className="text-sm text-muted-foreground">
                          Arraste o arquivo aqui ou clique para selecionar
                        </span>
                        <div className="flex gap-2">
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            PDF
                          </span>
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            DOCX
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">Máximo 20MB</span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.docx"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f && validateFile(f)) setFile(f);
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-lg border bg-accent/30 px-4 py-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div className="flex-1 truncate">
                          <span className="block text-sm font-medium text-foreground truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                        <button
                          onClick={() => setFile(null)}
                          className="rounded-md p-1 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Step 3 */}
                <button
                  disabled={!tipoSelecionado || !file || uploading}
                  onClick={handleUpload}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Analisar Documento
                </button>

                {uploadError && (
                  <p className="mt-2 text-center text-sm text-destructive">{uploadError}</p>
                )}
              </div>
            )}

            {phase === "progress" && statusData && (
              <div className="rounded-xl border bg-card p-6">
                <h2 className="text-xl font-bold text-foreground">Processando análise</h2>
                <p className="mt-1 text-sm text-muted-foreground">{statusData.arquivo_nome}</p>

                <div className="mt-6 space-y-4">
                  {statusSteps.map((step, i) => {
                    const done = i < currentStepIndex;
                    const active = i === currentStepIndex;
                    return (
                      <div key={step.key} className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          {done ? (
                            <CheckCircle className="h-5 w-5 text-success" />
                          ) : active ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          ) : (
                            <Clock className="h-5 w-5 text-muted-foreground/40" />
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            done ? "text-success" : active ? "font-medium text-foreground" : "text-muted-foreground/50"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${statusData.progresso}%` }}
                    />
                  </div>
                  <p className="mt-2 text-center text-sm text-muted-foreground">
                    {statusData.progresso}% — {statusLabels[statusData.status] || statusData.etapa_atual}
                  </p>
                </div>
              </div>
            )}

            {phase === "result" && statusData && (
              <div className="rounded-xl border bg-card p-6">
                {statusData.status === "erro" ? (
                  <div className="text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                    <h2 className="mt-3 text-lg font-bold text-foreground">Erro na análise</h2>
                    <p className="mt-1 text-sm text-destructive">{statusData.erro_mensagem}</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-wrap items-center gap-4">
                      {statusData.score !== null && (
                        <span className={`text-5xl font-extrabold ${getScoreColor(statusData.score)}`}>
                          {statusData.score}
                        </span>
                      )}
                      {statusData.decisao && getDecisaoBadge(statusData.decisao)}
                    </div>
                    {statusData.resumo && (
                      <p className="mt-4 text-sm leading-relaxed text-foreground">{statusData.resumo}</p>
                    )}
                  </div>
                )}

                <button
                  onClick={reset}
                  className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <RotateCcw className="h-4 w-4" /> Nova Análise
                </button>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — Histórico */}
          <div>
            <div className="rounded-xl border bg-card p-6">
              <h2 className="text-lg font-bold text-foreground">Histórico de Análises</h2>

              {historico.length === 0 ? (
                <div className="mt-8 flex flex-col items-center gap-2 py-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/30" />
                  <span className="text-sm text-muted-foreground">Nenhuma análise realizada ainda</span>
                </div>
              ) : (
                <div className="mt-4 max-h-[600px] space-y-3 overflow-y-auto pr-1">
                  {historico.map((item) => (
                    <div key={item.job_id} className="rounded-lg border bg-background p-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground" title={item.arquivo_nome}>
                          {item.arquivo_nome}
                        </span>
                        {item.decisao && getDecisaoBadge(item.decisao)}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">{item.tipo_analise}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{formatDate(item.criado_em)}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        {item.score !== null && (
                          <span className={`text-sm font-bold ${getScoreColor(item.score)}`}>
                            Score: {item.score}
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.status === "concluido"
                              ? "bg-success/15 text-success"
                              : item.status === "erro"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-primary/15 text-primary animate-pulse-slow"
                          }`}
                        >
                          {item.status === "concluido"
                            ? "Concluído"
                            : item.status === "erro"
                            ? "Erro"
                            : "Processando"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
