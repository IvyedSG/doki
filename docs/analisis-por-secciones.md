# Análisis por secciones + mejoras de UX (front)

Resumen de los cambios en el frontend para que el análisis cubra **todo** el documento, sea
**progresivo** y la interfaz sea más clara. Todo offline.

## 1. Nueva orquestación del análisis (`src/components/Workspace/Workspace.tsx`)

El efecto de análisis ahora corre, dentro de un `run()` async con cancelación:

1. `api.salud()` — verifica que el backend responda.
2. `api.analizar({ dimensiones: ["gramatica"] })` — ortografía + gramática sobre **todo** el doc.
3. `api.secciones({ texto })` — obtiene los cortes del documento (por el índice).
4. `api.analizar({ dimensiones, alcance: "global" })` — estructura + cohesión + conectores (todo el doc).
5. Por cada sección: `api.analizar({ texto: recorte, alcance: "seccion", offset_base: sec.inicio })`
   — ideas + flujo, **progresivo** (Introducción → Método → …).

Las sugerencias de todas las pasadas se acumulan con **ids únicos del front** (`s0`, `s1`, …),
porque el back reinicia los ids en cada respuesta. Así no hay colisiones de `key`/highlight.

## 2. Estados visibles (3 avisos, con la paleta del sistema)

- **Progreso** (acento): `Analizando por secciones — 2/7: 3. OBJETIVOS` mientras corre el modelo.
- **Aviso** (info/azul): al terminar, `Análisis por secciones (N): el modelo revisó el documento
  completo, parte por parte.` — reemplaza al viejo aviso de “solo vio el inicio”.
- **Degradación** (warn/amarillo): solo si **realmente** falló algún motor, con sus nombres. Ya **no**
  aparece el cartel confuso con paréntesis vacíos.

## 3. Bugs corregidos

- **Botón “¿Cómo corrijo esto?” duplicado:** había un bloque JSX repetido (se veía dos veces). Ahora
  aparece **una sola vez**.
- **Doble envío en el chat:** se agregó guard `if (sending) return` y `disabled={sending}` en el
  botón, evitando que un doble clic mande la misma pregunta dos veces.

## 4. Robustez

- **`AbortController`:** cada pasada recibe un `signal`; al cambiar de documento o desmontar, se
  **aborta de verdad** lo que está en vuelo (evita análisis dobles, p. ej. con React StrictMode en
  dev, y cancela un análisis viejo si el usuario sube otro documento).
- **Guard de cancelación:** todos los `setState` (incl. `setProgreso`) se chequean contra `cancelado`,
  así una corrida cancelada no pisa el estado de la nueva.
- **Motores fallidos incrementales:** se publican a medida que se detectan, no solo al final.
- **Errores por sección aislados:** una sección que falle no tumba el resto del análisis.

## 5. Costura con el back (codegen)

Los tipos del back se generan con `bun run gen:api` (openapi-typescript desde
`http://localhost:8010/openapi.json`) hacia `src/types/api-gen.ts`. **No se editan a mano.** Cuando el
back cambia el contrato, se regenera y `tsc` avisa si algo dejó de calzar.

Tipos nuevos usados: `SeccionesRequest`, `SeccionesResponse`, `SeccionInfo`, y los campos
`alcance` / `offset_base` en `AnalizarRequest`.

## 6. Costo honesto

Más cobertura = más tiempo: N secciones son N llamadas al modelo. Lo compensa el modo **progresivo**
(se ven los resultados sección por sección, sin esperar en blanco). En equipos con poca RAM el tiempo
total es el dato a medir.
