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

  // Convierte cualquier formato soportado (.docx, .pdf, .pptx, .xlsx, .txt, .md, .html, etc.)
  // a Markdown usando Microsoft MarkItDown en el backend.
  convertir: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BASE_URL}/convertir`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new ApiError(res.status, `Error ${res.status}`);
    const data = (await res.json()) as { markdown: string };
    return data.markdown;
  },

  // Detecta la normativa por patrón de cita (regla en el back, determinista). Devuelve la
  // normativa + la EVIDENCIA (conteos) para mostrarla, no una caja negra. NO usa el modelo.
  detectarNormativa: async (
    texto: string,
    signal?: AbortSignal,
  ): Promise<{ normativa: string | null; ieee: number; apa: number; confianza: number }> => {
    const res = await fetch(`${BASE_URL}/detectar-normativa`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: texto,
      signal,
    });
    if (!res.ok) throw new ApiError(res.status, `Error ${res.status}`);
    return (await res.json()) as { normativa: string | null; ieee: number; apa: number; confianza: number };
  },

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
