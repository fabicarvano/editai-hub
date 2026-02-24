const API_EDITAL = "https://api.atria.ia.br";
const API_LICITACOES = "https://api.atria.ia.br/pncp";

export function getToken(): string | null {
  return localStorage.getItem("edital_bot_token");
}

export function getNome(): string {
  return localStorage.getItem("edital_bot_nome") || "Usuário";
}

export function getRole(): string {
  return localStorage.getItem("edital_bot_role") || "user";
}

export function isAdmin(): boolean {
  return getRole() === "admin";
}

export function logout() {
  localStorage.removeItem("edital_bot_token");
  localStorage.removeItem("edital_bot_nome");
  localStorage.removeItem("edital_bot_role");
  window.location.href = "/login";
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res: Response) {
  if (res.status === 401) { logout(); throw new Error("Não autorizado"); }
  return res;
}

/** Authenticated fetch helper — prepends API_EDITAL and adds auth headers */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_EDITAL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  await handleResponse(res);
  return res;
}

export async function apiLogin(email: string, senha: string) {
  const res = await fetch(`${API_EDITAL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });
  if (res.status === 401) throw new Error("Email ou senha incorretos");
  if (!res.ok) throw new Error("Erro ao fazer login");
  const data = await res.json();
  localStorage.setItem("edital_bot_token", data.token);
  localStorage.setItem("edital_bot_nome", data.nome);
  localStorage.setItem("edital_bot_role", data.role || "user");
  return data;
}

export async function fetchTiposAnalise() {
  const res = await fetch(`${API_EDITAL}/tipos-analise`);
  if (!res.ok) throw new Error("Erro ao buscar tipos");
  return res.json();
}

export async function uploadEdital(file: File, tipoAnalise: string) {
  const formData = new FormData();
  formData.append("arquivo", file);
  formData.append("tipo_analise", tipoAnalise);
  const res = await fetch(`${API_EDITAL}/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  await handleResponse(res);
  if (!res.ok) throw new Error("Erro no upload");
  return res.json();
}

export async function fetchStatus(jobId: string) {
  const res = await fetch(`${API_EDITAL}/status/${jobId}`, { headers: authHeaders() });
  await handleResponse(res);
  return res.json();
}

export async function fetchHistorico() {
  const res = await fetch(`${API_EDITAL}/historico`, { headers: authHeaders() });
  await handleResponse(res);
  return res.json();
}

export async function fetchLicitacoes(params: Record<string, string | number | boolean>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") qs.append(k, String(v)); });
  const res = await fetch(`${API_LICITACOES}/api/licitacoes?${qs}`, { headers: authHeaders() });
  await handleResponse(res);
  return res.json();
}

export async function fetchLicitacaoDetalhe(id: number) {
  const res = await fetch(`${API_LICITACOES}/api/licitacoes/${id}`, { headers: authHeaders() });
  await handleResponse(res);
  return res.json();
}

export async function fetchLicitacoesStats() {
  const res = await fetch(`${API_LICITACOES}/api/licitacoes/stats`, { headers: authHeaders() });
  await handleResponse(res);
  return res.json();
}

export async function fetchUsuarios() {
  const res = await fetch(`${API_LICITACOES}/api/users`, { headers: authHeaders() });
  await handleResponse(res);
  return res.json();
}

export async function criarUsuario(data: { name: string; email: string; password: string; role: string }) {
  const res = await fetch(`${API_LICITACOES}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  await handleResponse(res);
  return res.json();
}

export async function alterarStatusUsuario(id: number, active: boolean) {
  const res = await fetch(`${API_LICITACOES}/api/users/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ active }),
  });
  await handleResponse(res);
  return res.json();
}

// ——— Questionamentos Técnicos ———

export async function uploadEditalQ(arquivo: File) {
  const formData = new FormData();
  formData.append("arquivo", arquivo);
  const res = await fetch(`${API_EDITAL}/api/questionamentos/upload`, {
    method: "POST", headers: authHeaders(), body: formData,
  });
  await handleResponse(res);
  return res.json();
}

export async function fetchItensDetectados(sessaoId: number) {
  const res = await fetch(`${API_EDITAL}/api/questionamentos/itens/${sessaoId}`, { headers: authHeaders() });
  await handleResponse(res);
  return res.json();
}

export async function adicionarItemFila(sessaoId: number, item: Record<string, any>) {
  const res = await fetch(`${API_EDITAL}/api/questionamentos/sessao/${sessaoId}/item`, {
    method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(item),
  });
  await handleResponse(res);
  return res.json();
}

export async function atualizarItemFila(sessaoId: number, itemId: number, item: Record<string, any>) {
  const res = await fetch(`${API_EDITAL}/api/questionamentos/sessao/${sessaoId}/item/${itemId}`, {
    method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(item),
  });
  await handleResponse(res);
  return res.json();
}

export async function removerItemFila(sessaoId: number, itemId: number) {
  const res = await fetch(`${API_EDITAL}/api/questionamentos/sessao/${sessaoId}/item/${itemId}`, {
    method: "DELETE", headers: authHeaders(),
  });
  await handleResponse(res);
  return res.json();
}

export async function gerarQuestionamento(sessaoId: number, itemId: number) {
  const res = await fetch(`${API_EDITAL}/api/questionamentos/gerar`, {
    method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ sessao_id: sessaoId, item_id: itemId }),
  });
  await handleResponse(res);
  return res.json();
}

export async function gerarTodosQuestionamentos(sessaoId: number) {
  const res = await fetch(`${API_EDITAL}/api/questionamentos/gerar-todos?sessao_id=${sessaoId}`, {
    method: "POST", headers: authHeaders(),
  });
  await handleResponse(res);
  return res.json();
}

export async function fetchConsolidado(sessaoId: number) {
  const res = await fetch(`${API_EDITAL}/api/questionamentos/consolidado/${sessaoId}`, { headers: authHeaders() });
  await handleResponse(res);
  return res.json();
}

export async function fetchRascunhos() {
  const res = await fetch(`${API_EDITAL}/api/questionamentos/rascunhos`, { headers: authHeaders() });
  await handleResponse(res);
  return res.json();
}

export async function fetchRascunho(sessaoId: number) {
  const res = await fetch(`${API_EDITAL}/api/questionamentos/rascunho/${sessaoId}`, { headers: authHeaders() });
  await handleResponse(res);
  return res.json();
}

export async function deletarRascunho(sessaoId: number) {
  const res = await fetch(`${API_EDITAL}/api/questionamentos/rascunho/${sessaoId}`, {
    method: "DELETE", headers: authHeaders(),
  });
  await handleResponse(res);
  return res.json();
}

export async function fetchRadarKpis(params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  const res = await fetch(`${API_EDITAL}/api/radar/kpis${qs ? '?' + qs : ''}`, { headers: authHeaders() });
  await handleResponse(res);
  return res.json();
}

export async function exportarDocx(sessaoId: number, empresa: string, responsavel: string) {
  const res = await fetch(`${API_EDITAL}/api/questionamentos/exportar`, {
    method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ sessao_id: sessaoId, empresa, responsavel }),
  });
  await handleResponse(res);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Questionamentos_${sessaoId}_${new Date().toISOString().slice(0, 10)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
