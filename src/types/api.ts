/**
 * Tipos de la API — GENERADOS desde el contrato del back (doki-be).
 *
 * Las definiciones reales viven en `api-gen.ts` (auto-generado con `openapi-typescript` desde
 * http://localhost:8010/openapi.json). Este archivo solo re-exporta con nombres planos para que
 * el resto del front siga importando `{ Sugerencia, AnalizarRequest, ... }` sin cambios.
 *
 * ⚠️ NO edites los tipos del back a mano. Cuando el back cambie el contrato, corré:
 *     bun run gen:api
 * y TypeScript te avisará en `tsc` si algo del front dejó de calzar.
 */
import type { components } from "./api-gen";

type S = components["schemas"];

// Enums / primitivos
export type Dimension = S["Dimension"];
export type Severidad = S["Severidad"];
export type SeveridadHallazgo = S["SeveridadHallazgo"];
export type Nivel = S["Nivel"];
export type Fuente = S["Fuente"];
export type Rango = S["Rango"];
export type Sugerencia = S["Sugerencia"];
export type HallazgoRevision = S["HallazgoRevision"];
export type RevisionDocumento = S["RevisionDocumento"];
export type SeccionEsperada = S["SeccionEsperada"];

// Operaciones principales
export type AnalizarRequest = S["AnalizarRequest"];
export type AnalizarResponse = S["AnalizarResponse"];
export type ReescribirRequest = S["ReescribirRequest"];
export type ReescribirResponse = S["ReescribirResponse"];
export type EstructuraResponse = S["EstructuraResponse"];
export type SaludResponse = S["SaludResponse"];
export type SeccionesRequest = S["SeccionesRequest"];
export type SeccionesResponse = S["SeccionesResponse"];
export type SeccionInfo = S["SeccionInfo"];

// Asistente
export type MensajeChat = S["MensajeChat"];
export type ContextoChat = S["ContextoChat"];
export type ChatRequest = S["ChatRequest"];
export type ChatResponse = S["ChatResponse"];
export type DetectarParametrosRequest = S["DetectarParametrosRequest"];
export type DetectarParametrosResponse = S["DetectarParametrosResponse"];

// Refinamiento solo-front: el back tipa `estado` como string libre.
export type EstadoSalud = "ok" | "cargando" | "error";
