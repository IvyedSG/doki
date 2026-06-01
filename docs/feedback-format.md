# MVP — Formato de Feedback y Respuesta del Modelo

> Especificación de cómo el SLM estructura el feedback, cómo se renderiza en la UI y cómo responde en el chat.
> Basado en los indicadores de la tesis y el diseño de andamiaje cognitivo.

---

## 1. Arquitectura del Feedback

```
SLM analiza documento
  └→ Genera lista de FeedbackItem[] (JSON)
       └→ Frontend recibe y renderiza:
            ├→ Highlights en el documento (UC-08)
            ├→ Tarjetas de feedback (UC-07)
            └→ Mensaje inicial del chat (UC-03)
```

Cada `FeedbackItem` contiene:
- El fragmento exacto del documento
- La dimensión (organización / coherencia / gramática)
- El problema detectado
- La regla normativa infringida
- Una sugerencia de corrección
- Texto pedagógico para el andamiaje

---

## 2. Formato de Datos: FeedbackItem

```typescript
interface FeedbackItem {
  id: string;                          // "fb-org-001"
  dimension: "organizacion" | "coherencia" | "gramatica";
  severity: "bajo" | "medio" | "alto";

  // Fragmento del documento
  fragment: {
    text: string;                      // Texto exacto del error
    offsetStart: number;               // Caracter inicial en el doc
    offsetEnd: number;                 // Caracter final en el doc
  };

  // Contenido pedagógico
  problem: string;                     // "El título está en mayúsculas sostenidas"
  rule: string;                        // Regla normativa (según APA 7, IEEE, etc.)
  correction: string;                  // Cómo debería escribirse
  tip: string;                         // Consejo corto para recordar

  // Andamiaje
  pedagogicalPrompt?: string;          // Pregunta para el chat contextual
  example?: {                          // Ejemplo concreto (nivel profundo)
    before: string;
    after: string;
    diff: string;                      // Explicación del cambio
  };

  // Metadata
  confidence: number;                  // 0.0 - 1.0
  relatedNorm: string;                 // "APA 7", "IEEE", etc.
}
```

---

## 3. Ejemplos de Feedback por Dimensión

### 3.1 Organización — Título en mayúsculas sostenidas

**Fragmento del documento:**
```
APLICACIÓN DE ESCRITORIO BASADA EN INTELIGENCIA ARTIFICIAL Y SU EFECTO EN LA NORMALIZACIÓN DE DOCUMENTOS ACADÉMICOS
```

**Qué detecta el modelo:**
El título completo está escrito en mayúsculas sostenidas (all caps). En APA 7 e IEEE, los títulos llevan mayúscula solo al inicio y en nombres propios (title case o sentence case según la norma).

**FeedbackItem:**
```json
{
  "id": "fb-org-001",
  "dimension": "organizacion",
  "severity": "medio",
  "fragment": {
    "text": "APLICACIÓN DE ESCRITORIO BASADA EN INTELIGENCIA ARTIFICIAL Y SU EFECTO EN LA NORMALIZACIÓN DE DOCUMENTOS ACADÉMICOS",
    "offsetStart": 145,
    "offsetEnd": 260
  },
  "problem": "El título principal está en mayúsculas sostenidas.",
  "rule": "Los títulos no deben escribirse completamente en mayúsculas. Según APA 7, los títulos de nivel 1 usan title case (mayúscula inicial en palabras significativas).",
  "correction": "Aplicación de Escritorio Basada en Inteligencia Artificial y su Efecto en la Normalización de Documentos Académicos",
  "tip": "Usá mayúscula solo al inicio de cada palabra significativa (no artículos, preposiciones o conjunciones cortas).",
  "pedagogicalPrompt": "¿Sabés diferenciar cuándo una palabra en el título debe ir en mayúscula y cuándo no?",
  "example": {
    "before": "APLICACIÓN DE ESCRITORIO BASADA EN INTELIGENCIA ARTIFICIAL",
    "after": "Aplicación de Escritorio Basada en Inteligencia Artificial",
    "diff": "Se aplicó title case: mayúscula inicial en 'Aplicación', 'Escritorio', 'Basada', 'Inteligencia', 'Artificial'. Las preposiciones 'de', 'en' y la conjunción 'y' quedan en minúscula."
  },
  "confidence": 0.95,
  "relatedNorm": "APA 7"
}
```

**Renderizado en UI:**

| Elemento | Comportamiento |
|---|---|
| **Highlight** | Fondo `rgba(91,156,246,.10)`, borde inferior `1px solid var(--info)`. Al hacer hover: tooltip "Organización". |
| **Feedback card (nivel profundo)** | Badge azul "ORGANIZACIÓN". Texto: "El título principal está en mayúsculas sostenidas." Cita: «APLICACIÓN DE ESCRITORIO...». Botones: "Ver regla", "Ver ejemplo". |
| **Feedback card expandida** | Regla: "Los títulos no deben escribirse completamente en mayúsculas...". Corrección: "Aplicación de Escritorio Basada en...". |
| **Chat al hacer clic en "¿Cómo corrijo esto?"** | El modelo responde con el `pedagogicalPrompt` y espera la respuesta del estudiante. |

---

### 3.2 Organización — Jerarquía de secciones incorrecta

**Fragmento del documento:**
```
2.1. Marco Teórico
2.1.1 Antecedentes
2.1.2 Bases teóricas
2.2 Metodología
```

**Qué detecta el modelo:**
La subsección 2.1.1 y 2.1.2 no tienen punto después del tercer nivel (inconsistente con 2.1). Además, 2.2 debiera ser nivel 2 pero está al mismo nivel jerárquico que 2.1.1 — hay un salto de nivel.

**FeedbackItem:**
```json
{
  "id": "fb-org-002",
  "dimension": "organizacion",
  "severity": "alto",
  "fragment": {
    "text": "2.1.1 Antecedentes\n2.1.2 Bases teóricas\n2.2 Metodología",
    "offsetStart": 320,
    "offsetEnd": 385
  },
  "problem": "Inconsistencia en la jerarquía de numeración de secciones.",
  "rule": "La numeración debe ser consistente: si usás 2.1.1, también debe ser 2.2.1 (no 2.2). Cada nivel de jerarquía agrega un dígito. No se puede saltar de 2.1.2 a 2.2 sin antes cerrar la jerarquía.",
  "correction": "Corregir la numeración: 2.2.1 Metodología (o subir 2.1.1 y 2.1.2 a 2.2 y 2.3 si son pares de Marco Teórico).",
  "tip": "Cada vez que agregás un dígito a la numeración, creás un subnivel. Todos los subniveles del mismo padre deben tener la misma cantidad de dígitos."
}
```

---

### 3.3 Coherencia — Falta de conector entre párrafos

**Fragmento del documento:**
```
La escritura académica constituye una competencia central en la formación universitaria. Su dominio en estudiantes universitarios influye directamente en la calidad de informes.
```

**Qué detecta el modelo:**
Dos oraciones que tratan el mismo tema pero sin conector lógico entre ellas. La transición es abrupta.

**FeedbackItem:**
```json
{
  "id": "fb-coh-001",
  "dimension": "coherencia",
  "severity": "medio",
  "fragment": {
    "text": "La escritura académica constituye una competencia central en la formación universitaria. Su dominio en estudiantes universitarios influye directamente en la calidad de informes.",
    "offsetStart": 50,
    "offsetEnd": 200
  },
  "problem": "Transición abrupta entre oraciones. Falta un conector que vincule las ideas.",
  "rule": "Entre oraciones que desarrollan una misma idea debe haber un conector lógico que explicite la relación: causa-efecto (por lo tanto, en consecuencia), adición (además, asimismo), o énfasis (en particular, específicamente).",
  "correction": "La escritura académica constituye una competencia central en la formación universitaria. **En consecuencia,** su dominio en estudiantes universitarios influye directamente en la calidad de informes.",
  "tip": "Si podés unir dos oraciones con 'y' pero elegís no hacerlo, necesitás un conector más específico que muestre la relación entre ellas.",
  "pedagogicalPrompt": "¿Qué relación hay entre la escritura académica como competencia y el dominio que influye en la calidad? ¿Es causa, consecuencia, o un ejemplo?",
  "example": {
    "before": "La escritura académica constituye una competencia central... Su dominio influye directamente...",
    "after": "La escritura académica constituye una competencia central... **Por consiguiente,** su dominio influye directamente...",
    "diff": "Se agregó 'Por consiguiente' para explicitar la relación de consecuencia entre la competencia y su impacto."
  }
}
```

**Renderizado en UI:**

| Elemento | Comportamiento |
|---|---|
| **Highlight** | Fondo `rgba(240,160,80,.12)`, borde inferior `1px solid var(--warn)`. |
| **Feedback card** | Badge ámbar "COHERENCIA". Texto: "Transición abrupta entre oraciones. Falta un conector." |
| **Card expandida** | Muestra la regla con ejemplos de conectores posibles (por lo tanto, en consecuencia, asimismo, etc.) |
| **Chat** | El modelo pregunta: "¿Qué relación hay entre estas dos ideas?" para que el estudiante reflexione antes de recibir la respuesta. |

---

### 3.4 Coherencia — Ambigüedad pronominal

**Fragmento del documento:**
```
El profesor entregó los informes a los estudiantes antes de la revisión. Ellos notaron que tenía errores.
```

**Qué detecta el modelo:**
"Ellos" podría referirse a los estudiantes o a los informes. "Tenía" no concuerda en número con su antecedente.

**FeedbackItem:**
```json
{
  "id": "fb-coh-002",
  "dimension": "coherencia",
  "severity": "alto",
  "fragment": {
    "text": "Ellos notaron que tenía errores.",
    "offsetStart": 85,
    "offsetEnd": 115
  },
  "problem": "Ambigüedad pronominal: 'Ellos' y 'tenía' no tienen un antecedente claro.",
  "rule": "Todo pronombre debe referirse sin ambigüedad a su antecedente. Si hay más de un posible antecedente, se debe reformular la oración.",
  "correction": "Los estudiantes notaron que los informes tenían errores.",
  "tip": "Después de escribir 'ellos', 'su', 'le' — preguntate: ¿el lector sabe exactamente a qué o quién me refiero?"
}
```

---

### 3.5 Gramática — Error de concordancia sujeto-verbo

**Fragmento del documento:**
```
El conjunto de variables propuestas fueron analizadas mediante el software estadístico.
```

**Qué detecta el modelo:**
"El conjunto... fueron analizadas" — el sujeto es "el conjunto" (singular), el verbo debería concordar en singular. El error ocurre porque hay un sustantivo plural intermedio ("variables") que "atrae" al verbo.

**FeedbackItem:**
```json
{
  "id": "fb-gram-001",
  "dimension": "gramatica",
  "severity": "alto",
  "fragment": {
    "text": "El conjunto de variables propuestas fueron analizadas",
    "offsetStart": 400,
    "offsetEnd": 455
  },
  "problem": "Error de concordancia: el sujeto 'El conjunto' es singular, pero el verbo 'fueron' está en plural.",
  "rule": "El verbo concuerda con el núcleo del sujeto, no con los complementos del sujeto. 'El conjunto (de variables...)' → núcleo = 'conjunto' (singular) → 'fue analizado'.",
  "correction": "El conjunto de variables propuestas **fue analizado** mediante el software estadístico.",
  "tip": "Identificá el núcleo del sujeto (la palabra principal, sin preposiciones ni complementos). Ese es el que manda la concordancia.",
  "pedagogicalPrompt": "¿Cuál es el sujeto de esta oración? Si marcás 'El conjunto', el verbo va en singular. Si marcás 'variables', preguntate: ¿quién realiza la acción de ser analizadas?",
  "example": {
    "before": "El conjunto de variables propuestas **fueron** analizadas",
    "after": "El conjunto de variables propuestas **fue analizado**",
    "diff": "'Fueron analizadas' (plural, femenino) → 'fue analizado' (singular, masculino). El núcleo 'conjunto' es singular y masculino."
  }
}
```

**Renderizado en UI:**

| Elemento | Comportamiento |
|---|---|
| **Highlight** | Fondo `rgba(224,85,85,.10)`, borde inferior `1px solid var(--danger)`. |
| **Feedback card** | Badge rojo "GRAMÁTICA". Texto: "Error de concordancia: 'El conjunto... fueron analizadas'." |
| **Card expandida** | Regla gramatical + identificación del núcleo del sujeto + corrección. |
| **Chat** | El modelo primero pregunta "¿Cuál es el sujeto?" para que el estudiante reflexione (andamiaje). Luego explica si el estudiante responde incorrectamente o pide ayuda. |

---

### 3.6 Gramática — Precisión léxica (coloquialismo)

**Fragmento del documento:**
```
Los resultados de la encuesta son bien interesantes para la investigación porque muestran un montón de información relevante.
```

**Qué detecta el modelo:**
"Bien interesantes" y "un montón de" son expresiones coloquiales, no académicas.

**FeedbackItem:**
```json
{
  "id": "fb-gram-002",
  "dimension": "gramatica",
  "severity": "bajo",
  "fragment": {
    "text": "son bien interesantes... muestran un montón de información",
    "offsetStart": 35,
    "offsetEnd": 90
  },
  "problem": "Uso de expresiones coloquiales ('bien interesantes', 'un montón de') inapropiadas para el registro académico.",
  "rule": "El registro académico requiere precisión léxica y formalidad. 'Bien' como adverbio de grado coloquial debe reemplazarse por 'muy', 'sumamente', 'altamente'. 'Un montón de' debe reemplazarse por 'una gran cantidad de', 'numerosos', 'considerable'.",
  "correction": "Los resultados de la encuesta son **altamente significativos** para la investigación porque revelan **una cantidad considerable de** información relevante.",
  "tip": "En el texto académico, 'bien' no intensifica. Usá: muy, sumamente, altamente, notablemente, considerablemente."
}
```

---

### 3.7 Gramática — Puntuación (coma en enumeración)

**Fragmento del documento:**
```
Las variables analizadas fueron: edad, género nivel socioeconómico y ubicación geográfica.
```

**Qué detecta el modelo:**
Falta la coma serial (coma de Oxford) antes de "y" en la enumeración. "género nivel socioeconómico" también omite la coma entre elementos.

**FeedbackItem:**
```json
{
  "id": "fb-gram-003",
  "dimension": "gramatica",
  "severity": "bajo",
  "fragment": {
    "text": "edad, género nivel socioeconómico y ubicación geográfica",
    "offsetStart": 50,
    "offsetEnd": 100
  },
  "problem": "Omisión de comas en enumeración. Falta coma antes de 'y' (coma de Oxford) y entre 'género' y 'nivel'.",
  "rule": "En enumeraciones de tres o más elementos, se separan con coma todos los elementos, incluyendo antes de la conjunción 'y' (coma de Oxford, recomendada APA 7).",
  "correction": "edad, **género,** nivel socioeconómico, **y** ubicación geográfica",
  "tip": "Regla práctica: si decís 'A, B, C y D' → necesitás coma antes de 'y' para evitar ambigüedad. 'A, B, C, y D'."
}
```

---

## 4. Mensaje Inicial del Chat en el Workspace

Cuando el estudiante ingresa al Workspace (UC-03), el modelo genera un mensaje de bienvenida con el resumen de hallazgos.

**Formato:**

```
📊 Documento analizado — {config.docType} · {config.norm}

Dimensión        Hallazgos
─────────────────────────────
Organización     {n} problemas  (● {lista corta})
Coherencia       {n} problemas  (● {lista corta})
Gramática        {n} problemas  (● {lista corta})

¿Sobre qué dimensión querés empezar a trabajar?
O decime directamente el número del problema si ya lo identificaste.
```

**Ejemplo real:**
```
📊 Documento analizado — Tesis · APA 7

Dimensión        Hallazgos
─────────────────────────────
Organización     2 problemas  (● título en mayúsculas, ● jerarquía secciones)
Coherencia       1 problema   (● transición abrupta entre párrafos)
Gramática        3 problemas  (● concordancia, ● coloquialismos, ● puntuación)

¿Sobre qué dimensión querés empezar a trabajar?
O decime directamente el número del problema si ya lo identificaste.
```

**Renderizado en UI:**
- Este mensaje aparece como el primer mensaje del modelo en el chat
- Las dimensiones están coloreadas según su color semántico
- La lista de hallazgos es clickeable → lleva a la feedback card correspondiente

---

## 5. Patrones de Respuesta del Chat

### 5.1 El estudiante elige una dimensión

```
Estudiante: → "Hablemos de Organización"
Modelo:     → "Bien. En Organización encontré 2 problemas:

             1. **Título en mayúsculas sostenidas**
                «APLICACIÓN DE ESCRITORIO BASADA...»
                → ¿Sabés por qué está mal?

             2. **Jerarquía de secciones incorrecta**
                «2.1.1 Antecedentes / 2.2 Metodología»
                → Notás algo raro en la numeración?

             ¿Cuál querés ver primero?"
```

### 5.2 El estudiante pide la regla

```
Estudiante: → "Mostrame la regla del título"
Modelo:     → "Según APA 7 (sección 2.4):

              Los títulos de nivel 1 usan **title case**: mayúscula
              inicial en palabras significativas (sustantivos, verbos,
              adjetivos, adverbios) y minúscula en palabras funcionales
              (artículos, preposiciones, conjunciones).

              ✗ APLICACIÓN DE ESCRITORIO BASADA EN INTELIGENCIA
              ✓ Aplicación de Escritorio Basada en Inteligencia

              ¿Querés que te muestre más ejemplos o pasamos al
              siguiente problema?"
```

### 5.3 El estudiante pide un ejemplo

```
Estudiante: → "Dame un ejemplo de cómo corregir la concordancia"
Modelo:     → "Claro:

              ✗ INCORRECTO:
                «El conjunto de variables propuestas **fueron**
                 analizadas mediante el software estadístico.»

              ✓ CORREGIDO:
                «El conjunto de variables propuestas **fue analizado**
                 mediante el software estadístico.»

              📌 Cambio clave:
                El núcleo del sujeto es 'conjunto' (singular, masculino).
                Por eso: 'fue analizado' y no 'fueron analizadas'.
                No te dejes engañar por 'variables' (plural) que está
                cerca del verbo pero es solo un complemento.

              ¿Se entiende o querés que practiquemos con otro ejemplo?"```

### 5.4 El estudiante pregunta algo no relacionado

```
Estudiante: → "¿Cómo pongo las referencias en APA 7?"
Modelo:     → "En APA 7, las referencias se ordenan alfabéticamente
              por el apellido del primer autor. El formato básico es:

              Apellido, A. A. (Año). *Título del trabajo*. Editorial.

              Ejemplo:
              García, J. (2020). *Metodología de la investigación*.
              Editorial Académica.

              Si querés, puedo revisar si en tu documento hay citas
              o referencias con formato incorrecto — ¿te sirve?"
```

---

## 6. Estados del Feedback en la UI

### 6.1 Highlight en el documento

```
Fragmento normal:    "El conjunto de variables propuestas fueron analizadas..."
                     └──────────────────────┬──────────────────────┘
Highlight:                                  ↑
              Fondo rgba(224,85,85,.10) + borde inferior danger
              Cursor: pointer
              Tooltip hover: "Gramática · Error de concordancia"
              Click: scroll al feedback card correspondiente
```

### 6.2 Feedback card (colapsada)

```
┌──────────────────────────────────────────────────┐
│ ● GRAMÁTICA                        [▼ Ver regla] │
│ Error de concordancia: 'El conjunto... fueron     │
│ analizadas'.                                       │
│ «El conjunto de variables propuestas fueron        │
│  analizadas mediante el software estadístico.»     │
└──────────────────────────────────────────────────┘
```

### 6.3 Feedback card (expandida — nivel profundo)

```
┌──────────────────────────────────────────────────┐
│ ● GRAMÁTICA                        [▲ Ocultar]   │
│ Error de concordancia: 'El conjunto... fueron     │
│ analizadas'.                                       │
│ «El conjunto de variables propuestas fueron        │
│  analizadas mediante el software estadístico.»     │
│                                                    │
│ ─── Regla ──────────────────────────────────────  │
│ El verbo concuerda con el núcleo del sujeto, no   │
│ con sus complementos. En este caso, el núcleo es  │
│ 'conjunto' (singular), por lo tanto debe ir       │
│ 'fue analizado', no 'fueron analizadas'.          │
│                                                    │
│ ─── Corrección ─────────────────────────────────  │
│ ✓ «El conjunto de variables propuestas fue         │
│    analizado mediante el software estadístico.»    │
│                                                    │
│ ─── Tips ──────────────────────────────────────── │
│ Identificá el núcleo del sujeto. Ignorá los        │
│ complementos que empiezan con 'de', 'por', 'para'. │
│                                                    │
│ [💬 ¿Cómo corrijo esto?]  [📋 Ver ejemplo]         │
└──────────────────────────────────────────────────┘
```

---

## 7. Secuencia Completa: Ejemplo Extremo a Extremo

### Documento original del estudiante

```markdown
APLICACIÓN DE ESCRITORIO BASADA EN INTELIGENCIA ARTIFICIAL Y SU EFECTO EN LA NORMALIZACIÓN DE DOCUMENTOS ACADÉMICOS

1. INTRODUCCIÓN

La escritura académica constituye una competencia central en la formación universitaria. Su dominio en estudiantes universitarios influye directamente en la calidad de informes, ensayos, monografías y trabajos de fin de carrera.

El conjunto de variables propuestas fueron analizadas mediante el software estadístico. Los resultados son bien interesantes para la investigación porque muestran un montón de información relevante.

2.1. Marco Teórico
2.1.1 Antecedentes
2.1.2 Bases teóricas
2.2 Metodología
```

### Lo que el modelo detecta

```
FeedbackItem[] generado:
├── fb-org-001: Título en mayúsculas sostenidas         (severidad: medio)
├── fb-org-002: Jerarquía de secciones incorrecta        (severidad: alto)
├── fb-coh-001: Transición abrupta entre párrafos        (severidad: medio)
├── fb-gram-001: Concordancia sujeto-verbo               (severidad: alto)
├── fb-gram-002: Coloquialismos ("bien", "montón")       (severidad: bajo)
```

### Lo que ve el estudiante en el Workspace

**Documento (panel derecho):**
```
APLICACIÓN DE ESCRITORIO BASADA EN INTELIGENCIA ARTIFICIAL ──── resaltado AZUL
Y SU EFECTO EN LA NORMALIZACIÓN DE DOCUMENTOS ACADÉMICOS

1. INTRODUCCIÓN

La escritura académica constituye una competencia central en la
formación universitaria. Su dominio en estudiantes universitarios
influye directamente en la calidad de informes, ensayos, ────────── resaltado ÁMBAR
monografías y trabajos de fin de carrera.

El conjunto de variables propuestas fueron analizadas ───────────── resaltado ROJO
mediante el software estadístico. Los resultados son bien
interesantes para la investigación porque muestran un ───────────── resaltado ROJO
montón de información relevante.

2.1. Marco Teórico
2.1.1 Antecedentes
2.1.2 Bases teóricas
2.2 Metodología ──────────────────────────────────────────────────── resaltado AZUL
```

**Chat (panel izquierdo) — primer mensaje:**
```
📊 Documento analizado — Tesis · APA 7

Dimensión        Hallazgos
─────────────────────────────
Organización     2 problemas  (● título mayúsculas, ● jerarquía)
Coherencia       1 problema   (● transición)
Gramática        2 problemas  (● concordancia, ● coloquialismos)

¿Sobre qué dimensión querés empezar a trabajar?
```

**Feedback cards (en el chat o panel de feedback):**

```
┌──────────────────────────────────────────────────────────┐
│ ● ORGANIZACIÓN                           [▼ Ver regla]    │
│ El título principal está en mayúsculas sostenidas.        │
│ «APLICACIÓN DE ESCRITORIO BASADA EN...»                   │
├──────────────────────────────────────────────────────────┤
│ ● ORGANIZACIÓN                           [▼ Ver regla]    │
│ Inconsistencia en la jerarquía de numeración.             │
│ «2.1.1 Antecedentes / 2.2 Metodología»                    │
├──────────────────────────────────────────────────────────┤
│ ● COHERENCIA                             [▼ Ver regla]    │
│ Transición abrupta entre oraciones.                       │
│ «La escritura académica... Su dominio...»                  │
├──────────────────────────────────────────────────────────┤
│ ● GRAMÁTICA                              [▼ Ver regla]    │
│ Error de concordancia: 'El conjunto... fueron analizadas'. │
│ «El conjunto de variables propuestas fueron...»            │
├──────────────────────────────────────────────────────────┤
│ ● GRAMÁTICA                              [▼ Ver regla]    │
│ Uso de expresiones coloquiales.                           │
│ «bien interesantes», «un montón de»                        │
└──────────────────────────────────────────────────────────┘
```

---

## 8. Comportamiento de la UI por Nivel de Profundidad

| Elemento | Básico | Intermedio | Profundo |
|---|---|---|---|
| Highlight en doc | ✓ Color semántico | ✓ Color semántico | ✓ Color semántico |
| Feedback card | Dimensión + problema + cita | + Regla (colapsada) | + Regla + Tips + Ejemplo + Botón chat |
| Chat automático | No se inicia | Solo si el usuario hace clic | Primer mensaje con resumen + preguntas |
| "Ver regla" | — | ✓ Muestra regla en card | ✓ Muestra regla + tips |
| "Ver ejemplo" | — | — | ✓ Ejemplo before/after |
| "¿Cómo corrijo esto?" | Abre chat genérico | Abre chat con contexto | Abre chat con `pedagogicalPrompt` |
| Chat response | Responde directo | Pregunta + responde | Andamiaje: primero pregunta, luego explica |

---

## 9. Especificaciones Técnicas de Renderizado

### Highlight CSS (del design system)

```css
.highlight-org  { background: rgba(91,156,246,.10); border-bottom: 1px solid var(--info); }
.highlight-coh  { background: rgba(240,160,80,.12);  border-bottom: 1px solid var(--warn); }
.highlight-gram { background: rgba(224,85,85,.10);   border-bottom: 1px solid var(--danger); }

[class^="highlight-"] {
  cursor: pointer;
  border-radius: 2px;
  padding: 0 1px;
  transition: background 0.15s;
}

[class^="highlight-"]:hover {
  filter: brightness(1.4);
}
```

### Feedback card CSS (del design system)

```css
.feedback-card {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--rad);
  padding: 10px 12px;
  margin-bottom: 8px;
  cursor: pointer;
}

.feedback-card.org  { border-left: 2px solid var(--info);   border-radius: 0 var(--rad) var(--rad) 0; }
.feedback-card.coh  { border-left: 2px solid var(--warn);   border-radius: 0 var(--rad) var(--rad) 0; }
.feedback-card.gram { border-left: 2px solid var(--danger); border-radius: 0 var(--rad) var(--rad) 0; }
```

---

## 10. Resumen de Tipos de Respuesta del Modelo

| Tipo | Cuándo ocurre | Formato |
|---|---|---|
| **Resumen inicial** | Al entrar al Workspace | Tabla con dimensiones + hallazgos + pregunta |
| **Explicación de regla** | Usuario hace clic en "Ver regla" | Regla normativa + cita + corrección |
| **Ejemplo concreto** | Usuario hace clic en "Ver ejemplo" | Before → After → diff explicado |
| **Pregunta pedagógica** | Usuario hace clic en "¿Cómo corrijo esto?" | Pregunta socrática + espera respuesta |
| **Seguimiento** | Usuario responde en el chat | Respuesta contextual según lo que preguntó |
| **Chat libre** | Usuario pregunta algo nuevo | Respuesta académica sin editar el documento |

---

## 11. Rúbrica: Formato de Datos

### 11.1 Schema RubricSchema

```typescript
interface RubricSchema {
  id: string;                                    // "rubric-001"
  name: string;                                  // "Rúbrica de Tesis - Ing. Software"
  source: "csv" | "docx" | "pdf";                // Formato original
  criteria: RubricCriterion[];
  metadata: {
    totalCriteria: number;
    maxScore?: number;                            // Puntaje máximo total (opcional)
    sourceFile: string;                           // Nombre del archivo original
  };
}

interface RubricCriterion {
  id: string;                                     // "crit-001"
  name: string;                                   // "Estructura IMRyD"
  description: string;                            // "El documento sigue la estructura Introducción, Métodos, Resultados, Discusión"
  category?: string;                              // "Organización" | "Contenido" | "Formato" (opcional)
  expectedLevel: string;                          // "Obligatorio" | "Recomendado" | "Opcional"
  maxScore?: number;                              // Puntaje máximo para este criterio (opcional)
  weight?: number;                                // Ponderación 0.0 - 1.0 (opcional)
  keywords?: string[];                            // ["IMRyD", "Introducción", "Métodos"] (para matching automático)
}
```

### 11.2 Schema RubricEvaluation

```typescript
interface RubricEvaluation {
  criterionId: string;
  criterionName: string;
  status: "cumple" | "parcial" | "no_cumple" | "no_aplica";
  confidence: number;                              // 0.0 - 1.0
  evidence: {                                      // Fragmentos que sustentan la evaluación
    text: string;
    offsetStart: number;
    offsetEnd: number;
  }[];
  explanation: string;                             // Por qué cumple o no
  suggestion: string;                              // Cómo mejorar para cumplir
}
```

---

## 12. Parseo de Rúbrica por Formato

### 12.1 CSV

```csv
criterio,descripcion,max_puntaje,nivel_esperado
"Estructura IMRyD","El documento sigue IMRyD",5,obligatorio
"Resumen","Incluye resumen de 150-250 palabras",3,obligatorio
"Citas actualizadas","Mínimo 10 citas de los últimos 5 años",4,recomendado
"Formato APA 7","Aplica formato APA 7 en citas y referencias",5,obligatorio
```

**Parseo:** Cada fila es un `RubricCriterion`. Columnas mapeadas por nombre.

### 12.2 DOCX (tabla estructurada)

```
┌──────────────┬─────────────────────────────────┬──────┬─────────────┐
│ Criterio     │ Descripción                     │ Ptos │ Nivel       │
├──────────────┼─────────────────────────────────┼──────┼─────────────┤
│ Portada      │ Incluye datos del autor y tema  │ 2    │ Obligatorio │
│ Índice       │ Tabla de contenidos actualizada │ 2    │ Recomendado │
│ Introducción │ Plantea problema y objetivos    │ 5    │ Obligatorio │
└──────────────┴─────────────────────────────────┴──────┴─────────────┘
```

**Parseo:** Detecta tablas en el XML del DOCX. Primera fila = headers. Resto = criterios.

### 12.3 PDF

**Parseo:** Extracción de texto + detección de:
- Tablas mediante coordenadas de texto
- Listas numeradas o con viñetas
- Secciones con formato consistente (criterio + descripción)

**Advertencia:** PDFs sin estructura de tabla se parsean con menor confianza. El sistema marca los criterios con confianza baja para revisión manual.

---

## 13. Rúbrica: Ejemplos de Evaluación

### 13.1 Rúbrica de ejemplo (estructura de tesis)

```json
{
  "id": "rubric-001",
  "name": "Estructura de Tesis - Ing. Software",
  "source": "csv",
  "criteria": [
    {
      "id": "crit-001",
      "name": "Portada normalizada",
      "description": "La portada incluye: título de la tesis, autores, asesor, universidad, escuela, año",
      "category": "Formato",
      "expectedLevel": "Obligatorio",
      "maxScore": 3
    },
    {
      "id": "crit-002",
      "name": "Resumen y palabras clave",
      "description": "Resumen de 150-250 palabras con objetivo, método, resultados, conclusión. Palabras clave: 3-5",
      "category": "Contenido",
      "expectedLevel": "Obligatorio",
      "maxScore": 5
    },
    {
      "id": "crit-003",
      "name": "Estructura IMRyD",
      "description": "El documento sigue la secuencia: Introducción, Métodos, Resultados, Discusión (IMRyD)",
      "category": "Organización",
      "expectedLevel": "Obligatorio",
      "maxScore": 5
    },
    {
      "id": "crit-004",
      "name": "Introducción con problema y objetivos",
      "description": "La introducción plantea el problema de investigación, preguntas, objetivos e hipótesis",
      "category": "Contenido",
      "expectedLevel": "Obligatorio",
      "maxScore": 5
    },
    {
      "id": "crit-005",
      "name": "Marco teórico actualizado",
      "description": "Mínimo 15 referencias de los últimos 5 años. Citas en formato APA 7",
      "category": "Contenido",
      "expectedLevel": "Recomendado",
      "maxScore": 4
    },
    {
      "id": "crit-006",
      "name": "Referencias en APA 7",
      "description": "Todas las referencias siguen el formato APA 7: autor, año, título, editorial/DOI",
      "category": "Formato",
      "expectedLevel": "Obligatorio",
      "maxScore": 5
    },
    {
      "id": "crit-007",
      "name": "Paginación y márgenes",
      "description": "Números de página consecutivos, márgenes de 2.54 cm, interlineado 1.5 o doble",
      "category": "Formato",
      "expectedLevel": "Obligatorio",
      "maxScore": 3
    }
  ],
  "metadata": {
    "totalCriteria": 7,
    "maxScore": 30,
    "sourceFile": "rubrica_tesis.csv"
  }
}
```

### 13.2 Evaluación contra el documento de ejemplo

Para el documento de la sección 7, la evaluación contra esta rúbrica generaría:

```json
[
  {
    "criterionId": "crit-001",
    "criterionName": "Portada normalizada",
    "status": "no_cumple",
    "confidence": 0.85,
    "evidence": [],
    "explanation": "El documento no contiene una portada. Comienza directamente con el título.",
    "suggestion": "Agregar una portada con: título completo, nombres de los autores, asesor, universidad (Universidad Autónoma del Perú), escuela profesional y año."
  },
  {
    "criterionId": "crit-002",
    "criterionName": "Resumen y palabras clave",
    "status": "no_cumple",
    "confidence": 0.9,
    "evidence": [],
    "explanation": "No se encontró una sección de resumen ni palabras clave en el documento.",
    "suggestion": "Incluir un resumen estructurado (objetivo, método, resultados, conclusión) de 150-250 palabras y 3-5 palabras clave después del resumen."
  },
  {
    "criterionId": "crit-003",
    "criterionName": "Estructura IMRyD",
    "status": "parcial",
    "confidence": 0.75,
    "evidence": [
      {
        "text": "1. INTRODUCCIÓN",
        "offsetStart": 145,
        "offsetEnd": 160
      },
      {
        "text": "2.1. Marco Teórico\n2.1.1 Antecedentes\n2.1.2 Bases teóricas\n2.2 Metodología",
        "offsetStart": 320,
        "offsetEnd": 385
      }
    ],
    "explanation": "El documento tiene Introducción y Metodología, pero no tiene secciones de Resultados ni Discusión. Además, 'Marco Teórico' está como subsección de nivel 2, pero en IMRyD el marco teórico forma parte de la Introducción o es una sección previa.",
    "suggestion": "Reorganizar: Introducción (incluye marco teórico), Métodos, Resultados, Discusión. Eliminar la sección 'Marco Teórico' como entidad separada."
  },
  {
    "criterionId": "crit-004",
    "criterionName": "Introducción con problema y objetivos",
    "status": "parcial",
    "confidence": 0.6,
    "evidence": [
      {
        "text": "La escritura académica constituye una competencia central en la formación universitaria. Su dominio en estudiantes universitarios influye directamente en la calidad de informes, ensayos, monografías y trabajos de fin de carrera.",
        "offsetStart": 165,
        "offsetEnd": 320
      }
    ],
    "explanation": "La introducción menciona la importancia del tema pero no plantea explícitamente el problema de investigación, las preguntas, los objetivos ni las hipótesis. Es un párrafo contextual, no una introducción académica formal.",
    "suggestion": "Agregar: planteamiento del problema, preguntas de investigación, objetivo general y específicos, hipótesis. Usar la estructura: contexto → brecha → pregunta → objetivo."
  },
  {
    "criterionId": "crit-005",
    "criterionName": "Marco teórico actualizado",
    "status": "no_cumple",
    "confidence": 0.95,
    "evidence": [],
    "explanation": "No se detectaron citas ni referencias en el documento. La sección 'Antecedentes' y 'Bases teóricas' están vacías de contenido.",
    "suggestion": "Desarrollar el marco teórico con al menos 15 referencias de los últimos 5 años. Incluir citas en APA 7 dentro del texto."
  },
  {
    "criterionId": "crit-006",
    "criterionName": "Referencias en APA 7",
    "status": "no_cumple",
    "confidence": 0.95,
    "evidence": [],
    "explanation": "No se encontró una sección de referencias al final del documento.",
    "suggestion": "Agregar una sección 'Referencias' al final con todas las fuentes citadas en formato APA 7."
  },
  {
    "criterionId": "crit-007",
    "criterionName": "Paginación y márgenes",
    "status": "no_aplica",
    "confidence": 0.5,
    "evidence": [],
    "explanation": "No se puede determinar la paginación ni los márgenes a partir del texto plano. El formato físico debe verificarse en el archivo .docx original.",
    "suggestion": "Verificar que el documento tenga márgenes de 2.54 cm en los 4 lados, interlineado 1.5, y números de página consecutivos."
  }
]
```

### 13.3 Cómo se ve en el chat

**Cuando hay rúbrica cargada, el resumen inicial incluye:**

```
📊 Documento analizado — Tesis · APA 7

Dimensión        Hallazgos
─────────────────────────────
Organización     2 problemas  (● título mayúsculas, ● jerarquía)
Coherencia       1 problema   (● transición)
Gramática        2 problemas  (● concordancia, ● coloquialismos)

📋 Evaluación contra rúbrica (7 criterios):
─────────────────────────────────────────────
❌ Portada normalizada
❌ Resumen y palabras clave
⚠ Estructura IMRyD              (parcial)
⚠ Introducción con problema     (parcial)
❌ Marco teórico actualizado
❌ Referencias APA 7
➖ Paginación y márgenes        (no aplica)

✅ 0/7 cumplen  |  ⚠ 2/7 parcial  |  ❌ 4/7 no cumplen  |  ➖ 1/7 no aplica

¿Sobre qué dimensión querés empezar a trabajar?
O escribí "Ver rúbrica" para ver la tabla completa.
```

### 13.4 Cómo se ve la tabla de rúbrica en la UI

```
┌──────────────────────────────────────────────────────────────┐
│ 📋 Rúbrica: Estructura de Tesis - Ing. Software              │
│                                                              │
│ Criterio                              Estado   Puntos        │
│ ──────────────────────────────────────────────────────────── │
│ ❌ Portada normalizada                 No cumple   0/3       │
│ ❌ Resumen y palabras clave            No cumple   0/5       │
│ ⚠ Estructura IMRyD                    Parcial     2/5       │
│ ⚠ Introducción con problema/objetivos  Parcial     2/5       │
│ ❌ Marco teórico actualizado           No cumple   0/4       │
│ ❌ Referencias en APA 7                No cumple   0/5       │
│ ➖ Paginación y márgenes               No aplica   —        │
│ ──────────────────────────────────────────────────────────── │
│ Total:                                    4/30  (13%)       │
│                                                              │
│ [Cada fila es clickeable → abre detalle en el chat]          │
└──────────────────────────────────────────────────────────────┘
```

### 13.5 Chat contextual al hacer clic en un criterio

```
Estudiante: → [clic en "Estructura IMRyD"]

Modelo:     → 📋 **Estructura IMRyD** · Estado: ⚠ Parcial

              Esperado: El documento sigue la secuencia Introducción,
              Métodos, Resultados, Discusión (IMRyD)

              Detectado: Tiene Introducción y Metodología, pero
              faltan Resultados y Discusión.

              📌 El documento tiene 'Marco Teórico' como sección
              independiente. En IMRyD, los antecedentes y bases
              teóricas van dentro de la Introducción.

              Estructura actual:
               1. Introducción  ✓
               2. Marco Teórico ✗ (debería estar dentro de 1.)
               3. Metodología   ✓
               —. Resultados    ✗ (falta)
               —. Discusión     ✗ (falta)

              ¿Querés que te muestre cómo reordenar las secciones
              paso a paso?
```

### 13.6 Chat: el estudiante pide ayuda para cumplir un criterio

```
Estudiante: → "¿Cómo armo la portada que cumpla con la rúbrica?"

Modelo:     → Para cumplir con el criterio "Portada normalizada",
              necesitás incluir en este orden:

              1. **Título de la tesis** (completo, en negrita, centrado)
              2. **Autores** (nombres completos)
              3. **Asesor** (nombre y grado académico)
              4. **Universidad** (Universidad Autónoma del Perú)
              5. **Escuela profesional** (Ingeniería de Software)
              6. **Año** (2026)

              Según la rúbrica, esto vale 3 puntos. ¿Querés que
              redacte un ejemplo de portada que podés usar como
              referencia?
```

---

## 14. Estrategia de Parseo de Rúbrica por el SLM

El SLM recibe el archivo de rúbrica y ejecuta estos pasos:

```
1. Determinar el formato (.csv / .docx / .pdf)
2. Extraer texto crudo
   ├── CSV → split por filas y columnas
   ├── DOCX → parsear XML para tablas + texto estructurado
   └── PDF → extracción de texto con detección de tablas
3. Identificar estructura de criterios:
   ├── Buscar encabezados (criterio, descripción, puntaje, etc.)
   └── Mapear cada fila/elemento a RubricCriterion
4. Asignar confidence a cada criterio:
   ├── 0.9+ → Tabla CSV o DOCX bien formada
   ├── 0.6-0.8 → Texto estructurado en PDF
   └── < 0.5 → Marcar para revisión manual
5. Devolver RubricSchema[]
```

**Si el PDF no tiene estructura clara:** el modelo extrae lo que puede y marca los criterios dudosos para que el estudiante los revise y edite manualmente.

---

## 15. Resumen General de Tipos de Respuesta del Modelo

| Tipo | Cuándo ocurre | Formato |
|---|---|---|
| **Resumen inicial** | Al entrar al Workspace | Tabla con dimensiones + hallazgos + pregunta |
| **Resumen con rúbrica** | Si hay rúbrica cargada | Ídem + tabla de criterios con estados |
| **Explicación de regla** | Usuario hace clic en "Ver regla" | Regla normativa + cita + corrección |
| **Ejemplo concreto** | Usuario hace clic en "Ver ejemplo" | Before → After → diff explicado |
| **Pregunta pedagógica** | Usuario hace clic en "¿Cómo corrijo esto?" | Pregunta socrática + espera respuesta |
| **Seguimiento** | Usuario responde en el chat | Respuesta contextual según lo que preguntó |
| **Chat libre** | Usuario pregunta algo nuevo | Respuesta académica sin editar el documento |
| **Evaluación de rúbrica** | Al entrar al Workspace (con rúbrica) | Tabla de criterios + estado + puntaje |
| **Detalle de criterio** | Usuario hace clic en un criterio | Explicación + evidencia + sugerencia |
| **Ayuda para cumplir criterio** | Usuario pregunta cómo mejorar | Guía paso a paso para ese criterio |
