import type {
  AnalizarRequest,
  AnalizarResponse,
  ChatRequest,
  ChatResponse,
  DetectarParametrosRequest,
  DetectarParametrosResponse,
  EstructuraResponse,
  ReescribirRequest,
  ReescribirResponse,
  SaludResponse,
} from "../types/api";

const BASE_URL = "http://localhost:8000";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? `Error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  salud: () => request<SaludResponse>("/salud"),

  estructura: (tipo_doc: string) =>
    request<EstructuraResponse>(`/estructura/${encodeURIComponent(tipo_doc)}`),

  analizar: (data: AnalizarRequest) =>
    request<AnalizarResponse>("/analizar", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  reescribir: (data: ReescribirRequest) =>
    request<ReescribirResponse>("/reescribir", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  chat: (data: ChatRequest) =>
    request<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  detectarParametros: (data: DetectarParametrosRequest) =>
    request<DetectarParametrosResponse>("/detectar-parametros", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export { ApiError };
