# NormaDoc — Design System

## Filosofía

Dark, monoespaciado, terminal-like. La app se siente como una herramienta de precisión, no como un producto SaaS genérico. El color de acento es el único elemento vivo — todo lo demás es escala de grises oscuros.

Tres principios:
- **Local-first**: la UI refuerza que nada sale del dispositivo (locks, status indicators, "sin conexión")
- **Feedback sobre edición**: la IA señala, el estudiante decide — el diseño no tiene botones de "aplicar cambio automáticamente"
- **Densidad útil**: pantalla densa pero sin ruido — cada elemento gana su lugar

---

## Tokens

### Colores

```css
:root {
  /* Fondos — de más oscuro a más claro */
  --bg:      #0f0f0f;  /* fondo base de la app */
  --bg2:     #161616;  /* sidebar, nav, paneles */
  --bg3:     #1e1e1e;  /* cards, inputs, zonas elevadas */
  --bg4:     #262626;  /* hover states, barras vacías */

  /* Bordes */
  --border:  #2a2a2a;  /* separadores principales */
  --border2: #333333;  /* bordes de cards y chips activos */

  /* Texto */
  --text:    #e8e6df;  /* texto principal */
  --text2:   #888888;  /* texto secundario / labels */
  --text3:   #555555;  /* texto terciario / hints */

  /* Acento principal */
  --accent:  #c8f07a;  /* verde lima — botones primarios, chips activos, highlights */
  --accent2: #a8d456;  /* acento hover */

  /* Semánticos — solo para feedback */
  --info:    #5b9cf6;  /* organización */
  --warn:    #f0a050;  /* coherencia */
  --danger:  #e05555;  /* gramática */
  --teal:    #4ecba8;  /* estados positivos / modelo activo */
}
```

### Tipografía

```css
--font: 'DM Mono', monospace;
```

**Solo una familia tipográfica en toda la app.** DM Mono da el carácter de herramienta técnica. Importar desde Google Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
```

| Uso | Size | Weight |
|-----|------|--------|
| Títulos de sección | 18px | 500 |
| Título de wizard | 18px | 500 |
| Body / párrafos doc | 12px | 400 |
| Labels de campo | 10px | 400 |
| Eyebrows / badges | 10px | 400 |
| Sidebar items | 11px | 400 |
| Feedback cards | 11px | 400 |
| Bottom bar | 10px | 400 |
| Letter-spacing eyebrows | — | 0.08–0.12em |

### Espaciado

```
4px   — gap interno mínimo (icon + text)
6px   — gap entre chips
8px   — padding interno pequeño
12px  — gap entre elementos de panel
14px  — padding de sidebar
16px  — padding horizontal de nav/toolbar
28px  — padding de wizard card
36px  — padding horizontal del área de documento
```

### Radios

```css
--rad:    8px;   /* chips, inputs, cards pequeñas, feedback cards */
--rad-lg: 12px;  /* wizard card, upload zone */
--rad-xl: 16px;  /* wizard card exterior */
```

---

## Paleta semántica del feedback

Las 3 dimensiones del instrumento tienen color propio y consistente en toda la UI:

| Dimensión | Color | Variable | Uso |
|-----------|-------|----------|-----|
| Organización | Azul | `--info` `#5b9cf6` | border-left, label, highlight en doc |
| Coherencia | Ámbar | `--warn` `#f0a050` | border-left, label, highlight en doc |
| Gramática | Rojo | `--danger` `#e05555` | border-left, label, highlight en doc |
| Modelo activo | Teal | `--teal` `#4ecba8` | status dot, barras positivas |
| Acento UI | Lima | `--accent` `#c8f07a` | botones, chips seleccionados, links |

---

## Componentes

### Nav bar

```
height: 40px
background: var(--bg2)
border-bottom: 1px solid var(--border)
padding: 0 16px
```

Contiene: traffic lights decorativos (rojo `#e05555`, amarillo `#f0a050`, verde `#c8f07a` — 10px círculos), título centrado en `--text2` `11px` `letter-spacing: 0.08em`, versión a la derecha en `--text3` `10px`.

### Sidebar

```
width: 200px
background: var(--bg2)
border-right: 1px solid var(--border)
```

**Header de proyecto:**
```
padding: 12px 14px
border-bottom: 1px solid var(--border)
```
- Eyebrow: `10px`, `--accent`, `letter-spacing: 0.08em`
- Nombre: `12px`, `--text`, `font-weight: 500`
- Meta (normativa · carrera): `10px`, `--text3`

**Section labels:**
```
padding: 10px 14px 4px
font-size: 9px
color: var(--text3)
letter-spacing: 0.10em
```

**Items:**
```
padding: 7px 14px
font-size: 11px
color: var(--text2)
display: flex; align-items: center; gap: 8px
```
- Hover: `background: var(--bg3)`
- Activo: `background: var(--bg3)`, `color: var(--text)`
- Icono: Tabler outline, `font-size: 14px`

**Score mini (al fondo de sidebar):**
```
margin-top: auto
padding: 12px 14px
border-top: 1px solid var(--border)
```
- Label: `9px`, `--text3`, `letter-spacing: 0.08em`
- Barra: `height: 3px`, `border-radius: 2px`, bg vacío `var(--bg4)`
- Fill: color semántico de cada dimensión
- Valor: `10px`, `--text`, `width: 20px`, `text-align: right`

### Toolbar de documento

```
height: 36px
border-bottom: 1px solid var(--border)
padding: 0 14px
gap: 10px
```

- Nombre de archivo: icono `ti-file-text` + texto `11px --text2`
- Separador: `width: 1px; height: 16px; background: var(--border)`
- Botones toolbar: `background: none; border: none; color: var(--text3); font-size: 11px; padding: 4px 8px; border-radius: 4px` — hover: `color: var(--text2); background: var(--bg3)`
- Status indicator: `margin-left: auto`, dot animado + texto `10px`

**Status dot animado:**
```css
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--teal);
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
```

### Área de documento

```
padding: 28px 36px
max-width del contenido: 560px
margin: 0 auto
```

**Tipografía del doc:**
```css
.doc-h1 { font-size: 15px; font-weight: 500; color: var(--text); margin-bottom: 16px; }
.doc-h2 { font-size: 13px; font-weight: 500; color: var(--text);
          margin: 18px 0 8px; padding-left: 8px;
          border-left: 2px solid var(--accent); }
.doc-p  { font-size: 12px; color: var(--text2); line-height: 1.8; margin-bottom: 10px; }
```

**Highlights de feedback en el texto:**
```css
/* Organización */
.highlight-org  { background: rgba(91,156,246,.10); border-bottom: 1px solid var(--info); }
/* Coherencia */
.highlight-coh  { background: rgba(240,160,80,.12);  border-bottom: 1px solid var(--warn); }
/* Gramática */
.highlight-gram { background: rgba(224,85,85,.10);   border-bottom: 1px solid var(--danger); }

/* Shared */
[class^="highlight-"] {
  cursor: pointer;
  border-radius: 2px;
  padding: 0 1px;
}
```

### Panel derecho

```
width: 260px
background: var(--bg2)
border-left: 1px solid var(--border)
```

**Tabs:**
```css
.panel-tab {
  flex: 1;
  padding: 10px 0;
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--text3);
  border: none;
  background: none;
  border-bottom: 2px solid transparent;
}
.panel-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
```

**Filter pills (dentro del panel):**
```css
.tab-btn {
  padding: 5px 14px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: none;
  color: var(--text3);
  font-size: 10px;
  letter-spacing: 0.06em;
}
.tab-btn.active {
  background: rgba(200,240,122,.08);
  border-color: var(--accent);
  color: var(--accent);
}
```

**Feedback card:**
```css
.feedback-card {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--rad);
  padding: 10px 12px;
  margin-bottom: 8px;
  cursor: pointer;
}
/* Border-left semántico por dimensión */
.feedback-card.org  { border-left: 2px solid var(--info);   border-radius: 0 var(--rad) var(--rad) 0; }
.feedback-card.coh  { border-left: 2px solid var(--warn);   border-radius: 0 var(--rad) var(--rad) 0; }
.feedback-card.gram { border-left: 2px solid var(--danger);  border-radius: 0 var(--rad) var(--rad) 0; }
```

Anatomía interna de la card:
```
[dimensión label — 9px, color semántico, letter-spacing .08em]
[texto de observación — 11px, --text2, line-height 1.5]
[explicación de la regla — 10px, --text3, border-top, padding-top 6px]
[acción / pregunta — 10px, --accent, cursor pointer]
```

La explicación de la regla es la parte más importante — es donde vive el andamiaje cognitivo. Nunca omitirla.

### Chat

**Bubbles:**
```css
.bubble     { background: var(--bg3); border: 1px solid var(--border);
              border-radius: var(--rad); padding: 8px 10px;
              font-size: 11px; color: var(--text2); line-height: 1.5; }
.bubble.user { background: rgba(200,240,122,.06);
               border-color: rgba(200,240,122,.15); color: var(--text); }
```

**Input:**
```css
.chat-input {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--rad);
  padding: 7px 10px;
  font-family: var(--font);
  font-size: 11px;
  color: var(--text);
}
.chat-input:focus { border-color: var(--accent); outline: none; }
```

**Botón send:**
```css
background: var(--accent);
border: none;
color: #0f0f0f;
border-radius: var(--rad);
padding: 7px 10px;
```

### Botones globales

```css
/* Primario */
.btn-primary {
  background: var(--accent);
  border: none;
  color: #0f0f0f;
  padding: 8px 20px;
  border-radius: var(--rad);
  font-family: var(--font);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.btn-primary:hover { background: var(--accent2); }

/* Ghost */
.btn-ghost {
  background: none;
  border: 1px solid var(--border2);
  color: var(--text2);
  padding: 8px 16px;
  border-radius: var(--rad);
  font-family: var(--font);
  font-size: 12px;
  cursor: pointer;
}
.btn-ghost:hover { border-color: var(--text2); color: var(--text); }
```

### Wizard card

```css
.wizard-card {
  width: 100%;
  max-width: 480px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--rad-xl);
  overflow: hidden;
}
```

**Progress pips:**
```css
.step-pip        { height: 3px; flex: 1; border-radius: 2px; background: var(--bg4); }
.step-pip.active { background: var(--accent); opacity: 0.5; }
.step-pip.done   { background: var(--accent); }
```

### Chips / selección múltiple

```css
.chip {
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid var(--border2);
  background: var(--bg3);
  color: var(--text2);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}
.chip:hover    { border-color: var(--accent); color: var(--accent); }
.chip.selected { border-color: var(--accent); background: rgba(200,240,122,.08); color: var(--accent); }
```

### Upload zone

```css
.upload-zone {
  border: 1px dashed var(--border2);
  border-radius: var(--rad-lg);
  padding: 40px 24px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s;
}
.upload-zone:hover { border-color: var(--accent); }
```

### Bottom bar

```
height: 28px
background: var(--bg2)
border-top: 1px solid var(--border)
padding: 0 16px
font-size: 10px
color: var(--text3)
```

Ítems con icono Tabler `12px` + texto. El ítem "sin conexión a internet" va a la derecha con `margin-left: auto` — es el recordatorio constante de la ejecución local.

### Format pills

```css
.fmt-pill {
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid var(--border);
  font-size: 10px;
  color: var(--text3);
}
```

---

## Iconos

Librería: **Tabler Icons** (outline únicamente).

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">
```

| Contexto | Icono |
|----------|-------|
| Archivo de texto | `ti-file-text` |
| Carpeta / proyecto | `ti-folder` |
| Subir archivo | `ti-file-upload` |
| Analizar | `ti-scan` |
| Historial | `ti-history` |
| Descripción / project.md | `ti-file-description` |
| CPU / modelo | `ti-cpu` |
| Candado / local | `ti-lock` |
| Alerta / observación | `ti-alert-triangle` |
| Check | `ti-check` |
| Flecha arriba (send) | `ti-arrow-up` |
| Configuración | `ti-settings` |

Tamaño estándar: `14px` en sidebar, `12px` en bottom bar, `16px` en toolbar, `32px` decorativo en upload zone.

---

## Layout de la app

```
┌─────────────────────────────────────────────┐
│  Nav bar (40px)                             │
├───────────┬─────────────────────┬───────────┤
│           │   Toolbar (36px)    │           │
│  Sidebar  ├─────────────────────┤  Panel    │
│  (200px)  │                     │  derecho  │
│           │   Área del doc      │  (260px)  │
│           │   (flex: 1)         │           │
│           │                     │           │
├───────────┴─────────────────────┴───────────┤
│  Bottom bar (28px)                          │
└─────────────────────────────────────────────┘
```

- Ancho mínimo recomendado: **780px** (desktop app, no responsive)
- Alto mínimo: **560px**
- El área del documento tiene `max-width: 560px; margin: 0 auto` para legibilidad óptima

---

## Estados de la app

| Estado | Indicador visual |
|--------|-----------------|
| Modelo cargando | status dot gris, sin animación |
| Modelo activo | status dot `--teal` con animación pulse |
| Analizando | status dot `--accent` parpadeando + texto "analizando..." |
| Error de modelo | status dot `--danger` + mensaje en bottom bar |
| Sin documento | upload zone visible, toolbar en estado vacío |
| Observación seleccionada | feedback card con `border-color: var(--border2)` |

---

## Reglas de diseño

1. **La IA nunca tiene botón "aplicar cambio"** — solo "Ver ejemplo", "¿Cómo corrijo esto?", "Entendido". Esto es intencional: refleja el andamiaje cognitivo del marco teórico.
2. **El texto del documento es de solo lectura** en el área central — el estudiante edita en su propio editor (Word, Google Docs). La app es un lector anotador.
3. **Los highlights son el único elemento interactivo del documento** — al hacer clic abren o resaltan la feedback card correspondiente en el panel derecho.
4. **Toda la paleta es dark** — no hay modo claro. Reduce la distracción y refuerza el carácter de herramienta técnica.
5. **DM Mono en todo** — sin excepciones. Una sola familia tipográfica es más coherente y fácil de mantener.
6. **El acento lima (`#c8f07a`) aparece una sola vez por componente** — no decorativamente. Siempre señala algo accionable o seleccionado.
