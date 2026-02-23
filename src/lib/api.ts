const API_BASE = "https://api.atria.ia.br";

export function getToken(): string | null {
  return localStorage.getItem("edital_bot_token");
}

export function getNome(): string {
  return localStorage.getItem("edital_bot_nome") || "Usuário";
}

export function logout() {
  localStorage.removeItem("edital_bot_token");
  localStorage.removeItem("edital_bot_nome");
  window.location.href = "/login";
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res: Response) {
  if (res.status === 401) {
    logout();
    throw new Error("Não autorizado");
  }
  return res;
}

export async function apiLogin(email: string, senha: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });
  if (res.status === 401) throw new Error("Email ou senha incorretos");
  if (!res.ok) throw new Error("Erro ao fazer login");
  const data = await res.json();
  localStorage.setItem("edital_bot_token", data.token);
  localStorage.setItem("edital_bot_nome", data.nome);
  return data;
}

export async function fetchTiposAnalise() {
  const res = await fetch(`${API_BASE}/tipos-analise`);
  if (!res.ok) throw new Error("Erro ao buscar tipos");
  return res.json();
}

export async function uploadEdital(file: File, tipoAnalise: string) {
  const formData = new FormData();
  formData.append("arquivo", file);
  formData.append("tipo_analise", tipoAnalise);
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  await handleResponse(res);
  if (!res.ok) throw new Error("Erro no upload");
  return res.json();
}

export async function fetchStatus(jobId: string) {
  const res = await fetch(`${API_BASE}/status/${jobId}`, {
    headers: authHeaders(),
  });
  await handleResponse(res);
  if (!res.ok) throw new Error("Erro ao buscar status");
  return res.json();
}

export async function fetchHistorico() {
  const res = await fetch(`${API_BASE}/historico`, {
    headers: authHeaders(),
  });
  await handleResponse(res);
  if (!res.ok) throw new Error("Erro ao buscar histórico");
  return res.json();
}
