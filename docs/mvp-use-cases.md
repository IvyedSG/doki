# MVP — Casos de Uso Detallados

> Basado en: "Aplicación de escritorio basada en Inteligencia Artificial y su efecto en la normalización de documentos académicos en estudiantes universitarios, Lima 2026"

---

## Flujo General

```
Landing (upload)
  ├→ Documento (.docx / .txt / .md) — obligatorio
  └→ Rúbrica (.pdf / .docx / .csv) — opcional
       └→ AI detecta parámetros del documento
            └→ Vista de revisión (confirma/edita parámetros + vista de rúbrica parseada)
                 └→ Iniciar → Workspace
                       ├→ AI analiza documento completo
                       ├→ Feedback cards + highlights en el doc
                       ├→ Evaluación contra rúbrica (si se subió)
                       └→ Chat contextual para profundizar
```

---

## Actores

| Actor | Descripción |
|---|---|
| **Estudiante** | Usuario final. Estudiante universitario que sube un documento académico para recibir retroalimentación formativa. |
| **Sistema (SLM + NLP)** | Motor offline que analiza el documento, identifica problemas y genera feedback pedagógico. |

---

## UC-01: Subir Documento

| Campo | Valor |
|---|---|
| **Nombre** | Subir documento académico |
| **Actor** | Estudiante |
| **Precondición** | El estudiante tiene un archivo .docx, .txt o .md |
| **Postcondición** | El documento se carga en memoria y se envía al SLM para detección de parámetros |
| **Disparador** | El estudiante arrastra un archivo o hace clic en la zona de upload |

**Flujo principal:**
1. El estudiante ve la pantalla de Landing con la zona de upload
2. Arrastra un archivo (o hace clic para seleccionar)
3. El sistema valida extensión (.docx, .txt, .md)
4. El sistema carga el contenido en memoria
5. El sistema envía el contenido al SLM para detección automática
6. Avanza a UC-02 (Vista de Revisión)

**Flujo alternativo — extensión no soportada:**
- El sistema muestra mensaje: "Formato no soportado. Usá .docx, .txt o .md"

**Flujo alternativo — archivo vacío:**
- El sistema muestra mensaje: "El documento está vacío"

---

## UC-01b: Subir Rúbrica o Estructura (Opcional)

| Campo | Valor |
|---|---|
| **Nombre** | Subir rúbrica de evaluación o estructura esperada del documento |
| **Actor** | Estudiante |
| **Precondición** | UC-01 completado (documento ya cargado) |
| **Postcondición** | La rúbrica se parsea a JSON estructurado y se vincula al análisis |
| **Disparador** | El estudiante hace clic en "Agregar rúbrica" en la pantalla de Revisión |

**Flujo principal:**
1. El estudiante ve un botón "Agregar rúbrica (opcional)" en la vista de Revisión
2. Hace clic y selecciona un archivo (.pdf, .docx, .csv)
3. El sistema valida extensión
4. El sistema parsea el contenido a `RubricSchema[]` (JSON)
5. El sistema muestra la rúbrica parseada en una vista previa con cada criterio identificado
6. El estudiante confirma que la interpretación es correcta o la descarta
7. La rúbrica queda vinculada al proyecto para la evaluación

**Flujo alternativo — no se puede parsear:**
1. El sistema detecta que la estructura no es reconocible
2. Muestra mensaje: "No pudimos interpretar este archivo como rúbrica. ¿Querés cargarlo como documento de referencia solamente?"
3. Si el estudiante acepta, se guarda como referencia (sin parseo)
4. Si rechaza, se descarta

**Formatos soportados:**
| Formato | Cómo se parsea |
|---|---|
| **CSV** | Columnas: criterio, descripción, puntaje máximo, nivel esperado |
| **DOCX** | Tablas → filas como criterios; texto estructurado → secciones |
| **PDF** | Extracción de texto + detección de tablas y listas |

**UI Notes:**
- La rúbrica parseada se muestra en una tabla expandible durante la Revisión
- Cada criterio muestra: nombre, descripción corta, nivel esperado
- Si hay criterios no claros, el modelo los marca con "?" y el estudiante puede editarlos

---

## UC-02: Revisar Parámetros Detectados por el SLM

| Campo | Valor |
|---|---|
| **Nombre** | Revisar configuración automática detectada por el SLM |
| **Actor** | Estudiante, Sistema |
| **Precondición** | UC-01 completado. El SLM procesó el documento |
| **Postcondición** | El estudiante confirma o ajusta los parámetros y avanza al Workspace |

**Flujo principal:**
1. El sistema muestra la pantalla "El modelo identificó lo siguiente:" con parámetros precargados
2. Cada parámetro es un select/componente editable:
   - **Normativa** (APA 7 / IEEE / Vancouver / Chicago)
   - **Tipo de documento** (Tesis / Informe / Ensayo / Monografía)
   - **Carrera / Escuela** (texto libre, precargado si se detectó)
   - **Nivel de profundidad** (Básico / Intermedio / Profundo)
3. El sistema muestra el nivel de confianza de cada detección:
   - ✓ Alta → selector precargado, sin resalte
   - ⚠ Media → selector precargado con borde ambar, sugerencia
   - ? Baja → selector vacío, el sistema pregunta en el chat
4. El estudiante revisa cada parámetro
5. Modifica los que considere incorrectos
6. Hace clic en "Comenzar análisis"
7. El sistema guarda la configuración y avanza al Workspace (UC-03)

**Flujo alternativo — sin detección posible:**
1. El sistema detecta que no puede determinar ningún parámetro con confianza
2. Muestra todos los campos vacíos con un mensaje: "No pudimos identificar automáticamente los parámetros. Configuralos manualmente."
3. El estudiante completa los campos manualmente
4. Continúa desde paso 6

**UI Notes:**
- Cada parámetro muestra un badge con el nivel de confianza
- Los selectores usan el componente `Chip` del design system
- La carrera es un input de texto libre con autocompletado opcional
- Si se cargó una rúbrica (UC-01b), se muestra una sección colapsable "Rúbrica detectada" con la vista previa de criterios parseados

---

## UC-03: Visualizar Workspace con Análisis Inicial

| Campo | Valor |
|---|---|
| **Nombre** | Ingresar al Workspace con análisis completo |
| **Actor** | Estudiante, Sistema |
| **Precondición** | UC-02 completado. Configuración guardada |
| **Postcondición** | El estudiante ve el documento en el panel derecho y el chat inicia con un resumen de hallazgos |

**Flujo principal:**
1. El sistema carga el Workspace con split panel
2. Panel izquierdo: chat, con el primer mensaje del modelo:
   > "Documento analizado. Identifiqué 3 problemas en Organización, 2 en Coherencia y 4 en Gramática. ¿Sobre qué dimensión querés empezar a trabajar?"
3. Panel derecho: documento renderizado con highlights semánticos
4. En el documento, los fragmentos problemáticos aparecen resaltados:
   - Azul (`--info`) para Organización
   - Ámbar (`--warn`) para Coherencia
   - Rojo (`--danger`) para Gramática
5. El estudiante puede hacer clic en un highlight para abrir su feedback card
6. El estudiante puede responder en el chat para profundizar

**UI Notes:**
- El documento ocupa el panel derecho con el boxed layout definido (`max-w-[800px]`, `px-3`)
- Los highlights usan el color semántico de cada dimensión con fondo translúcido
- Al hacer clic en un highlight, el feedback correspondiente se resalta en el chat

---

## UC-04 a UC-06: Detección por Dimensión

Estos tres casos de uso son ejecutados por el SLM durante el análisis inicial. No requieren interacción del usuario.

| UC | Dimensión | Qué detecta | Indicadores (tesis) |
|---|---|---|---|
| **UC-04** | Organización | • Títulos en mayúsculas sostenidas<br>• Jerarquía incorrecta de secciones<br>• Ausencia de secciones obligatorias<br>• Desorden en la estructura argumentativa<br>• Formato de párrafos inconsistente | Sugerencia de estructura, organización de ideas, ordenamiento de secciones |
| **UC-05** | Coherencia | • Falta de conectores entre párrafos<br>• Quiebres en el flujo del discurso<br>• Ambigüedad pronominal<br>• Transiciones abruptas<br>• Repetición excesiva de términos | Mejora de cohesión textual, sugerencia de conectores lógicos, revisión del flujo |
| **UC-06** | Gramática | • Errores de concordancia (sujeto-verbo, género-número)<br>• Problemas de puntuación (comas, puntos seguidos)<br>• Incorrecciones sintácticas<br>• Precisión léxica inadecuada<br>• Estilo no académico (coloquialismos) | Detección de errores gramaticales, sugerencia de correcciones sintácticas, validación de normativa lingüística |

---

## UC-07: Visualizar Feedback por Dimensiones

| Campo | Valor |
|---|---|
| **Nombre** | Navegar feedback agrupado por dimensión |
| **Actor** | Estudiante |
| **Precondición** | UC-03 completado. El análisis está disponible |
| **Postcondición** | El estudiante ve la lista de hallazgos filtrada por dimensión |

**Flujo principal:**
1. El estudiante ve las tarjetas de feedback en el panel de chat (o en un panel lateral de tabs)
2. Cada tarjeta muestra:
   - Badge de dimensión con su color semántico
   - Texto corto del problema detectado
   - Fragmento del documento citado (entre comillas)
   - Botón "Ver regla" para expandir (UC-09)
3. Las tarjetas se pueden filtrar por dimensión (tabs: Todos / Organización / Coherencia / Gramática)
4. Al hacer clic en una tarjeta, el documento se desplaza al fragmento correspondiente

---

## UC-08: Resaltar Fragmentos en el Documento

| Campo | Valor |
|---|---|
| **Nombre** | Ver highlights semánticos en el documento |
| **Actor** | Estudiante |
| **Precondición** | UC-03 completado |
| **Postcondición** | El estudiante identifica visualmente los problemas en contexto |

**Flujo principal:**
1. El documento renderizado muestra highlights con fondo semitransparente:
   - `rgba(91,156,246,.10)` + borde inferior `1px solid var(--info)` → Organización
   - `rgba(240,160,80,.12)` + borde inferior `1px solid var(--warn)` → Coherencia
   - `rgba(224,85,85,.10)` + borde inferior `1px solid var(--danger)` → Gramática
2. Al hacer hover sobre un highlight, aparece un tooltip con la dimensión
3. Al hacer clic, el chat se desplaza a la feedback card correspondiente
4. El highlight tiene cursor pointer y border-radius 2px

---

## UC-09: Explicar Regla Normativa

| Campo | Valor |
|---|---|
| **Nombre** | Ver regla normativa infringida |
| **Actor** | Estudiante |
| **Precondición** | UC-07 activo. El estudiante ve una tarjeta de feedback |
| **Postcondición** | El estudiante comprende la regla académica detrás del error |

**Flujo principal:**
1. El estudiante hace clic en "Ver regla" en una tarjeta de feedback
2. La tarjeta se expande mostrando:
   - **Problema**: El fragmento con el error
   - **Regla**: Explicación de la normativa infringida (según APA 7, IEEE, etc.)
   - **Corrección**: Cómo debería escribirse correctamente
   - **Botón "¿Cómo corrijo esto?"**: abre el chat contextual (UC-10)
   - **Botón "Ver ejemplo"**: muestra un ejemplo concreto (UC-11)
3. El estudiante lee la regla y decide si profundiza

---

## UC-10: Chat Contextual Sobre un Hallazgo

| Campo | Valor |
|---|---|
| **Nombre** | Conversar con la IA sobre un problema específico |
| **Actor** | Estudiante, Sistema |
| **Precondición** | UC-09 activo. El estudiante hizo clic en "¿Cómo corrijo esto?" |
| **Postcondición** | El estudiante recibe orientación personalizada en el chat |

**Flujo principal:**
1. El chat se abre (o se enfoca) con contexto precargado del hallazgo
2. El modelo responde con el fragmento problemático y pregunta orientadora
3. El estudiante puede hacer preguntas de seguimiento
4. El modelo responde dentro del andamiaje cognitivo (explica, no hace el trabajo)

**Formato de respuesta del modelo:**
```
Fragmento original:
« [texto con error] »

[Explicación breve del problema]

¿Querés que te muestre cómo estructurarlo correctamente o preferís
intentarlo vos y vuelvo a revisarlo?
```

---

## UC-11: Pedir Ejemplo de Corrección

| Campo | Valor |
|---|---|
| **Nombre** | Solicitar ejemplo concreto de corrección |
| **Actor** | Estudiante |
| **Precondición** | UC-09 activo |
| **Postcondición** | El estudiante ve un ejemplo práctico de cómo corregir |

**Flujo principal:**
1. El estudiante hace clic en "Ver ejemplo"
2. El modelo genera un ejemplo concreto en el chat
3. El ejemplo muestra: versión incorrecta → versión corregida
4. Opcionalmente, el modelo marca los cambios (diff)

**Formato:**
```
✗ INCORRECTO:
  « [texto original] »

✓ CORREGIDO:
  « [texto corregido] »

📌 Cambio clave:
  [explicación de qué cambió y por qué]
```

---

## UC-12: Control de Profundidad del Andamiaje

| Campo | Valor |
|---|---|
| **Nombre** | Configurar nivel de detalle del feedback |
| **Actor** | Estudiante |
| **Precondición** | UC-03 activo |
| **Postcondición** | El feedback se adapta al nivel seleccionado |

**Niveles:**
| Nivel | Feedback visual | Chat |
|---|---|---|
| **Básico** | Solo highlight + dimensión | Sin explicación automática. El usuario debe preguntar |
| **Intermedio** | Highlight + regla normativa en la tarjeta | Explicación breve en tarjeta expandida |
| **Profundo** | Highlight + regla + pregunta pedagógica | Chat activo con andamiaje cognitivo completo |

**Flujo:**
1. El estudiante cambia el nivel desde un control en el Workspace (chip o dropdown)
2. El sistema ajusta la cantidad de información mostrada en cada tarjeta de feedback
3. En nivel Básico: tarjeta minimal (solo problema + dimensión)
4. En nivel Intermedio: tarjeta expandible con regla
5. En nivel Profundo: tarjeta completa + mensaje inicial del chat contextual

---

## UC-13: Chat Libre con el Modelo

| Campo | Valor |
|---|---|
| **Nombre** | Conversación libre con el asistente |
| **Actor** | Estudiante, Sistema |
| **Precondición** | UC-03 activo |
| **Postcondición** | El estudiante recibe respuesta a su consulta |

**Flujo principal:**
1. El estudiante escribe una pregunta no anclada a un hallazgo específico
2. El modelo responde basado en el documento y el contexto académico
3. El estudiante puede preguntar sobre:
   - Normativas específicas
   - Estructura de secciones
   - Citas y referencias
   - Dudas generales de redacción académica
4. El modelo responde siempre con enfoque formativo (andamiaje)

**Restricción:** El modelo nunca edita el documento directamente. Solo orienta.

---

## UC-14: Evaluar Documento Contra Rúbrica

| Campo | Valor |
|---|---|
| **Nombre** | Evaluar el documento según los criterios de la rúbrica |
| **Actor** | Estudiante, Sistema |
| **Precondición** | UC-01b completado (rúbrica cargada y parseada). UC-03 activo |
| **Postcondición** | El estudiante ve el cumplimiento de cada criterio de la rúbrica |

**Flujo principal:**
1. El sistema evalúa cada criterio de la rúbrica contra el documento
2. Para cada criterio, genera:
   - Estado: ✅ Cumple / ⚠ Parcial / ❌ No cumple / ➖ No aplica
   - Explicación de por qué cumple o no
   - Fragmentos del documento que evidencian el cumplimiento (o la falta de él)
3. En el chat, el modelo agrega al resumen inicial:
   ```
   📋 Evaluación contra rúbrica:
   ─────────────────────────────
   ✅ 4/8 criterios cumplen
   ⚠ 2/8 cumplen parcialmente
   ❌ 2/8 no cumplen
   ```
4. El estudiante puede hacer clic en "Ver rúbrica" para ver la tabla completa
5. Cada criterio es clickeable → abre el detalle en el chat

**Formato de respuesta del modelo:**
```
📋 Criterio: Estructura IMRyD
   Estado: ❌ No cumple
   Esperado: Introducción, Métodos, Resultados, Discusión
   Detectado: Introducción, Marco Teórico, Metodología, Resultados

   El documento no sigue la estructura IMRyD. Tiene 'Marco Teórico'
   como sección independiente, que debería estar dentro de
   Introducción o eliminarse según la rúbrica.

   ¿Querés que te muestre cómo reorganizar las secciones?
```

**UI Notes:**
- La tabla de rúbrica se muestra en un panel colapsable dentro del Workspace
- Cada criterio tiene el color del estado (verde/ámbar/rojo)
- Al hacer clic en un criterio, el chat se contextualiza con ese criterio
- La rúbrica completa se puede exportar como reporte de evaluación

---

## UC-15: Chat Contextual Sobre un Criterio de Rúbrica

| Campo | Valor |
|---|---|
| **Nombre** | Conversar sobre el cumplimiento de un criterio específico de la rúbrica |
| **Actor** | Estudiante, Sistema |
| **Precondición** | UC-14 activo. El estudiante hizo clic en un criterio |
| **Postcondición** | El estudiante recibe orientación sobre cómo cumplir ese criterio |

**Flujo principal:**
1. El estudiante hace clic en un criterio de la rúbrica (✅/⚠/❌)
2. El chat se contextualiza con ese criterio
3. El modelo explica qué falta y cómo abordarlo
4. El estudiante puede preguntar:
   - "¿Cómo estructuro esta sección?"
   - "¿Qué contenido debería tener?"
   - "Mostrame un ejemplo de esta sección bien hecha"
5. El modelo responde con orientación formativa

---

## Mapa de Navegación

```
Landing
  ├→ [Upload doc] ─────────────────────────────────────────┐
  │               └→ [Upload rúbrica (opcional)]           │
  │                    └→ AI detecta parámetros + rubrica   │
  │                         └→ Vista de Revisión (UC-02)   │
  │                              └→ [Comenzar]             │
  │                                   └→ Workspace (UC-03) │
  │                                        ├→ Feedback cards (UC-07/09)
  │                                        ├→ Highlights (UC-08)
  │                                        ├→ Chat contextual (UC-10/11/13/15)
  │                                        ├→ Evaluación rúbrica (UC-14)
  │                                        └→ Control profundidad (UC-12)
  └→ [Sin documento] → No hay análisis posible
```

---

## Lo que NO está en el MVP

| Funcionalidad | Razón |
|---|---|---|
| Edición de documentos dentro de la app | El diseño dice: "el estudiante edita en su editor, la app es un lector anotador" |
| Exportar documento corregido | El estudiante aplica los cambios manualmente |
| Múltiples proyectos simultáneos | MVP tiene un solo proyecto activo |
| Autenticación de usuarios | App local/offline, sin backend |
| Exportar reporte de evaluación | Se puede agregar post-MVP |
| Historial de análisis | Se puede agregar post-MVP para la medición pretest/postest |

## Notas sobre formatos de archivo

| Archivo | Formatos soportados | ¿Por qué? |
|---|---|---|
| **Documento académico** | .docx, .txt, .md | El estudiante edita en Word/Drive. El análisis es sobre el texto plano o estructurado. |
| **Rúbrica / estructura** | .pdf, .docx, .csv | Las rúbricas suelen darse en PDF (syllabus) o DOCX (formato editable). CSV para rúbricas estructuradas. |
