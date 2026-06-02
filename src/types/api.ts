export type Dimension = "organizacion" | "coherencia" | "gramatica";

export type Severidad = "error" | "advertencia" | "sugerencia";

export type Nivel = "palabra" | "oracion" | "parrafo" | "documento";

export type Fuente = "reglas" | "pln" | "modelo";

export type EstadoSalud = "ok" | "cargando" | "error";

export interface Rango {
  inicio: number;
  fin: number;
}

export interface Sugerencia {
  id: string;
  rf: string;
  dimension: Dimension;
  severidad: Severidad;
  nivel: Nivel;
  rango: Rango | null;
  mensaje: string;
  sugerencia: string | null;
  fuente: Fuente;
}

export interface AnalizarRequest {
  texto: string;
  tipo_doc?: string;
  dimensiones?: Dimension[];
  seed?: number;
}

export interface AnalizarResponse {
  sugerencias: Sugerencia[];
  parcial: boolean;
  motores_ok: string[];
  motores_fallidos: string[];
}

export interface ReescribirRequest {
  fragmento: string;
  motivo?: string;
  seed?: number;
}

export interface ReescribirResponse {
  reescritura_formal: string;
  nota: string;
}

export interface SaludResponse {
  estado: EstadoSalud;
  modelo_listo: boolean;
  ollama_ok: boolean;
  reglas_listas: boolean;
  version: string;
  ollama_version: string | null;
  modelo_digest: string | null;
  pin_ok: boolean;
}

export interface SeccionEsperada {
  nombre: string;
  orden: number;
  recomendada: boolean;
}

export interface EstructuraResponse {
  tipo_doc: string;
  secciones: SeccionEsperada[];
}

export interface MensajeChat {
  rol: "usuario" | "asistente";
  contenido: string;
}

export interface ChatRequest {
  mensaje: string;
  historial?: MensajeChat[];
  contexto?: {
    documento?: string;
    sugerencia_id?: string;
    tipo_chat?: "general" | "regla" | "ejemplo" | "pedagogico";
  };
}

export interface ChatResponse {
  respuesta: string;
}

export interface DetectarParametrosRequest {
  texto: string;
}

export interface DetectarParametrosResponse {
  tipo_doc: string | null;
  normativa: string | null;
  carrera: string | null;
  confianza_tipo_doc: number | null;
  confianza_normativa: number | null;
  confianza_carrera: number | null;
}
