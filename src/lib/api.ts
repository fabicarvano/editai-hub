const API_EDITAL = "https://api.atria.ia.br";
const API_LICITACOES = "http://207.38.88.213:8000";

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
