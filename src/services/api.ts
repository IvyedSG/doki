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
  SeccionesRequest,
  SeccionesResponse,
} from "../types/api";

const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8010";

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
  salud: (signal?: AbortSignal) => request<SaludResponse>("/salud", { signal }),

  estructura: (tipo_doc: string) =>
    request<EstructuraResponse>(`/estructura/${encodeURIComponent(tipo_doc)}`),

  analizar: (data: AnalizarRequest, signal?: AbortSignal) =>
    request<AnalizarResponse>("/analizar", {
      method: "POST",
      body: JSON.stringify(data),
      signal,
    }),

  secciones: (data: SeccionesRequest, signal?: AbortSignal) =>
    request<SeccionesResponse>("/secciones", {
      method: "POST",
      body: JSON.stringify(data),
      signal,
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
