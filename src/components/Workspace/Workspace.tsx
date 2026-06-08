import React, { useState, useRef, useEffect, useCallback } from "react";
import { useProject } from "../../context/ProjectContext";
import { api } from "../../services/api";
import { mapDocType } from "../../types/mapping";
import type { Sugerencia, MensajeChat as Mensaje, RevisionDocumento, SeccionInfo } from "../../types/api";
import {
  IconArrowUp,
  IconAlertTriangle,
  IconDatabaseOff,
  IconMinus,
  IconPlus,
} from "@tabler/icons-react";

type WorkspaceStatus = "loading" | "success" | "error" | "partial";

function normSec(s: string): string {
  return s.replace(/\./g, "").trim().toLowerCase().replace(/\s+/g, " ");
}

function matchSeccion(seccionName: string, secciones: SeccionInfo[], documentText?: string): number {
  const n = normSec(seccionName);
  if (!n || secciones.length === 0) return -1;

  // 1) Bidirectional include on title
  let idx = secciones.findIndex(s =>
    normSec(s.titulo).includes(n) || n.includes(normSec(s.titulo))
  );
  if (idx >= 0) return idx;

  // 2) Text-search: find the section name in the raw document, then check which
  //    detected section's byte range contains it. Catches table-captions etc.
  if (documentText) {
    const rawPos = findTextInDoc(documentText, seccionName);
    if (rawPos >= 0) {
      const found = secciones.find(s => s.inicio <= rawPos && rawPos < s.fin);
      if (found) return found.idx;
    }
  }

  // 3) Word overlap on title
  const words = n.split(/[\s,/;:()]+/).filter(w => w.length > 3);
  if (words.length > 0) {
    let bestScore = 0;
    let bestIdx = -1;
    for (const [i, s] of secciones.entries()) {
      const st = normSec(s.titulo);
      const score = words.filter(w => st.includes(w)).length;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestScore >= Math.min(2, words.length)) return bestIdx;
  }

  return -1;
}

function findTextInDoc(doc: string, search: string): number {
  if (!search) return -1;
  const lo = (s: string) => s.replace(/\./g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const nd = lo(doc);
  const ns = lo(search);
  // Try direct, lowercase, then aggressive normalization (strip ALL dots)
  let pos = doc.indexOf(search);
  if (pos >= 0) return pos;
  pos = doc.toLowerCase().indexOf(search.toLowerCase());
  if (pos >= 0) return pos;
  // Aggressive: strip ALL dots from both, find in normalized, approximate position
  pos = nd.indexOf(ns);
  if (pos >= 0) {
    const before = doc.lastIndexOf("\n", pos);
    return before >= 0 ? before + 1 : 0;
  }
  // If comma-separated list (e.g. "P17, P23, P24"), try first few items individually
  if (search.includes(",")) {
    const items = search.split(",").map(s => s.trim()).filter(Boolean);
    for (const item of items.slice(0, 3)) {
      pos = findTextInDoc(doc, item);
      if (pos >= 0) return pos;
    }
  }
  // First 2 significant words as last resort
  const words = search.split(/[\s]+/).filter(w => w.replace(/[^a-záéíóúñA-ZÁÉÍÓÚÑ0-9]/g, "").length > 2);
  if (words.length >= 2) {
    const two = words.slice(0, 2).join(" ");
    pos = doc.toLowerCase().indexOf(two.toLowerCase());
    if (pos >= 0) return pos;
  }
  return -1;
}

function renderInline(text: string) {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  const re = /(\*\*.*?\*\*|`.*?`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(remaining)) !== null) {
    if (m.index > last) parts.push(<span key={key++}>{remaining.slice(last, m.index)}</span>);
    const inner = m[0];
    if (inner.startsWith("**")) parts.push(<strong key={key++}>{inner.slice(2, -2)}</strong>);
    else parts.push(<code key={key++} className="bg-bg3 px-1 rounded text-[12px]">{inner.slice(1, -1)}</code>);
    last = re.lastIndex;
  }
  if (last < remaining.length) parts.push(<span key={key++}>{remaining.slice(last)}</span>);
  return parts.length > 0 ? parts : text;
}

// Limpia el "ruido" del Markdown de pandoc para mostrarlo legible:
//  - imágenes  ![alt](media/..){width=..}  -> se quitan (no se renderizan en la vista de texto)
//  - links     [texto](url)                 -> solo el texto
//  - atributos {#ancla} {width=..}          -> se quitan
//  - blockquote "> " del índice             -> se quita el prefijo
function limpiarLineaPandoc(t: string): string {
  let s = t.replace(/^>\s?/, "");                                  // blockquote
  s = s.replace(/!\[[^\]]*\]\([^)]*\)\s*(\{[^}]*\})?/g, "");        // imágenes
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");                    // links -> texto
  s = s.replace(/\{[^}]*\}/g, "");                                  // {#ancla} {width=..}
  return s.trim();
}

const COLOR_SEV_HL: Record<string, string> = { bloqueante: "#e05555", corregir: "#f0a050", menor: "#4ecba8" };

function renderMarkdown(
  text: string,
  highlightLines?: Map<number, string>,
  _unused?: undefined,
  secIdxToLine?: [number, number][],
  fiel?: boolean,
): React.ReactNode {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  // Build a set of line indices that are the FIRST highlight for each section
  const firstHlLine = new Set<number>();
  const hlToSecIdx = new Map<number, number>();
  if (secIdxToLine) {
    for (const [secIdx, line] of secIdxToLine) {
      if (!firstHlLine.has(line)) {
        firstHlLine.add(line);
        hlToSecIdx.set(line, secIdx);
      }
    }
  }
  const hl = (i: number, node: React.ReactNode) => {
    if (!highlightLines?.has(i)) return node;
    const color = highlightLines.get(i)!;
    const extraId = hlToSecIdx.has(i) ? { id: `sec-${hlToSecIdx.get(i)}` } : {};
    return (
      <span key={i} className="block -mx-2 px-2 rounded-sm scroll-mt-12" style={{ backgroundColor: color + "22" }} {...extraId}>
        {node}
      </span>
    );
  };
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    const heading = /^(#{1,3})\s+/.exec(raw);
    const bullet = /^[-*+]\s+/.test(raw) || /^\d+[.)]\s+/.test(raw);
    const t = fiel ? raw : limpiarLineaPandoc(raw);
    if (!t) { out.push(hl(i, <div key={i} className="h-3" />)); continue; }
    if (heading) {
      const lvl = heading[1].length;
      const txt = t.replace(/^#{1,3}\s+/, "");
      if (lvl === 1) out.push(hl(i, <h1 key={i} className="text-lg font-bold mt-5 mb-2">{renderInline(txt)}</h1>));
      else if (lvl === 2) out.push(hl(i, <h2 key={i} className="text-base font-bold mt-4 mb-1">{renderInline(txt)}</h2>));
      else out.push(hl(i, <h3 key={i} className="text-sm font-bold mt-3 mb-1">{renderInline(txt)}</h3>));
      continue;
    }
    if (bullet) {
      out.push(hl(i, <li key={i} className="ml-5 text-[13px] mb-0.5 list-disc">{renderInline(t.replace(/^([-*+]|\d+[.)])\s+/, ""))}</li>));
      continue;
    }
    out.push(hl(i, <p key={i} className="text-[13px] mb-1 leading-relaxed">{renderInline(t)}</p>));
  }
  return out;
}

function _capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildAnalisisDetallado(
  rev: RevisionDocumento,
  secciones: SeccionInfo[],
  meta: { tipo: string; carrera: string; fileName: string | null },
  documentText?: string,
): string {
  const L: string[] = [];

  const TIPO_LABEL: Record<string, string> = {
    tesis: "Tesis", proyecto: "Proyecto de Investigación", informe: "Informe Académico",
    ensayo: "Ensayo", monografia: "Monografía",
  };
  const tipoLabel = TIPO_LABEL[meta.tipo] || meta.tipo;

  L.push(`@T|${tipoLabel}${meta.fileName ? ` — ${meta.fileName}` : ""}`);
  L.push(`@P|Revisado en: Coherencia argumentativa · Organización estructural · Gramática y estilo académico · ${_capitalizar(meta.carrera)}`);
  L.push("");
  L.push("@P|Resumen general");
  L.push("@R|" + rev.resumen.replace(/\n/g, " "));
  L.push("");

  const ORDEN_SEV = ["bloqueante", "corregir", "menor"];
  const ETIQ_SEV: Record<string, string> = { bloqueante: "Crítico", corregir: "A mejorar", menor: "Sugerencia" };
  const ICON_SEV: Record<string, string> = { bloqueante: "🔴", corregir: "🟡", menor: "🟢" };
  const COLOR_SEV: Record<string, string> = { bloqueante: "red", corregir: "amber", menor: "green" };

  const ordenados = [...rev.hallazgos].sort(
    (a, b) => ORDEN_SEV.indexOf(a.severidad) - ORDEN_SEV.indexOf(b.severidad),
  );

  const conteo: Record<string, number> = { bloqueante: 0, corregir: 0, menor: 0 };

  for (const h of ordenados) {
    conteo[h.severidad] = (conteo[h.severidad] || 0) + 1;

    // Severity emoji + label + title on one line, like example-analysis.md
    L.push(`@F|${COLOR_SEV[h.severidad]}|${ICON_SEV[h.severidad]} ${ETIQ_SEV[h.severidad]}|${h.titulo}`);

    if (h.seccion) {
      const match = h.seccion ? matchSeccion(h.seccion, secciones, documentText) : -1;
      L.push(`@L|${match}|${h.seccion}`);
    }

    L.push(`@D|${h.descripcion}`);
    L.push("");
  }

  // Veredicto with severity count table like example-analysis.md
  L.push("@P|Veredicto");
  const tabla = [
    `Severidad | Cantidad`,
    `${ICON_SEV.bloqueante} Crítico | ${conteo.bloqueante}`,
    `${ICON_SEV.corregir} A mejorar | ${conteo.corregir}`,
    `${ICON_SEV.menor} Sugerencia | ${conteo.menor}`,
  ].join("\n");
  L.push(`@V|${conteo.bloqueante}|${conteo.corregir}|${conteo.menor}|${rev.hallazgos.length}|${tabla}`);

  return L.join("\n");
}

function buildResumen(sugerencias: Sugerencia[]): string {
  const L: string[] = [];
  L.push("@T|Revisión del documento");
  const total = sugerencias.length;
  if (total === 0) {
    L.push("@P|Tu documento cumple con los tres aspectos revisados: organización, coherencia y gramática.");
    L.push("@V|0|0|0|0");
    L.push("@N|¡Buen trabajo! No hay nada que corregir.");
    return L.join("\n");
  }

  const criticos = sugerencias.filter((s) => s.severidad === "error").length;
  const graves = sugerencias.filter((s) => s.severidad === "advertencia").length;
  const leves = sugerencias.filter((s) => s.severidad === "sugerencia").length;
  const dn = (d: string) => sugerencias.filter((s) => s.dimension === d).length;

  L.push(
    `@P|Encontré ${total} puntos — organización (${dn("organizacion")}), ` +
      `coherencia (${dn("coherencia")}) y gramática (${dn("gramatica")}).`,
  );
  L.push(`@V|${criticos}|${graves}|${leves}|${total}`);

  const RF_LABELS: Record<string, string> = {
    "RF-01": "Falta de sección", "RF-02": "Ideas en párrafos", "RF-03": "Orden de secciones",
    "RF-04": "Cohesión léxica", "RF-05": "Conectores faltantes", "RF-06": "Flujo del discurso",
    "RF-07": "Error ortográfico", "RF-08": "Corrección ortográfica", "RF-09": "Uso no académico",
  };

  const sevs: [string, string, string][] = [
    ["error", "red", "Crítico"],
    ["advertencia", "amber", "A mejorar"],
    ["sugerencia", "green", "Sugerencias"],
  ];
  for (const [sev, color, label] of sevs) {
    const items = sugerencias.filter((s) => s.severidad === sev);
    if (!items.length) continue;
    L.push(`@S|${color}|${label}|${items.length}`);
    const porRf: Record<string, number> = {};
    for (const s of items) porRf[s.rf] = (porRf[s.rf] || 0) + 1;
    const linea = Object.entries(porRf)
      .map(([rf, n]) => `${RF_LABELS[rf] || rf} (${n})`)
      .join(" · ");
    L.push(`@D|${linea}`);
  }
  return L.join("\n");
}

function ThinkingDots() {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const t = setInterval(() => setDots((p) => (p.length >= 3 ? "" : p + ".")), 400);
    return () => clearInterval(t);
  }, []);
  return <>{dots}</>;
}

function useLineReveal(text: string, msPerLine: number = 20) {
  const [count, setCount] = useState(0);
  const lines = React.useMemo(() => text.split("\n"), [text]);

  useEffect(() => {
    setCount(0);
    if (!text) return;
    if (lines.length <= 1) { setCount(1); return; }
    const id = setInterval(() => {
      setCount((prev) => {
        if (prev >= lines.length) { clearInterval(id); return lines.length; }
        return prev + 1;
      });
    }, msPerLine);
    return () => clearInterval(id);
  }, [text, msPerLine, lines.length]);

  return { revealed: lines.slice(0, count).join("\n"), done: count >= lines.length };
}

function LinesRenderer({ content, onScrollToSection }: { content: string; onScrollToSection?: (idx: number) => void }) {
  return (
    <div className="prose-custom leading-relaxed">
      {content.split("\n").map((line, li) => {
        const raw = line;
        const t = line.trim();
        if (!t) return <div key={li} className="h-2" />;
        const COLOR: Record<string, string> = { red: "#e05555", amber: "#f0a050", green: "#4ecba8" };

        if (line.startsWith("@T|"))
          return (
            <h3 key={li} className="text-text-main font-bold text-sm mt-0 mb-2 pb-2 border-b border-border-main/60 flex items-center gap-2">
              <span>🔎</span>{line.slice(3)}
            </h3>
          );
        if (line.startsWith("@R|"))
          return <p key={li} className="text-text-main text-sm leading-relaxed mb-4 bg-bg3/50 -mx-2 px-4 py-3 rounded-sm border-l-2 border-accent/40">{line.slice(3)}</p>;
        if (line.startsWith("@H|"))
          return <p key={li} className="text-text-main text-sm font-bold mt-4 mb-1 leading-snug">{line.slice(3)}</p>;
        if (line.startsWith("@P|"))
          return <p key={li} className="text-text-muted text-sm leading-relaxed mb-2">{line.slice(3)}</p>;
        if (line.startsWith("@V|")) {
          const p = line.split("|");
          const badges = [
            { c: "red", v: p[1], l: "Crítico" },
            { c: "amber", v: p[2], l: "A mejorar" },
            { c: "green", v: p[3], l: "Sugerencia" },
          ].filter(b => b.v !== "0");
          if (badges.length === 0) return null;
          return (
            <div key={li} className="flex items-center gap-2 flex-wrap my-2">
              {badges.map((b) => (
                <span key={b.c} className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ backgroundColor: COLOR[b.c] + "22", color: COLOR[b.c] }}>
                  {b.v} {b.l}
                </span>
              ))}
            </div>
          );
        }
        if (line.startsWith("@S|")) {
          const p = line.split("|");
          return (
            <div key={li} className="flex items-center gap-2 mt-5 mb-1">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLOR[p[1]] }} />
              <span className="text-text-main font-bold text-xs uppercase tracking-wider">{p[2]}</span>
              <span className="text-xs text-text-hint">— {p[3]}</span>
            </div>
          );
        }
        if (line.startsWith("@F|")) {
          const p = line.split("|");
          return (
            <div key={li} className="flex items-center gap-2 mt-6 mb-2 pt-3 border-t border-border-main/30">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLOR[p[1]] }} />
              <span className="text-text-main font-bold text-xs uppercase tracking-wider">{p[2]}</span>
              <span className="text-text-main text-sm">—</span>
              <span className="text-text-main text-sm font-semibold">{p.slice(3).join("|")}</span>
            </div>
          );
        }
        if (line.startsWith("@L|")) {
          const parts = line.split("|");
          const idx = parts[1] === "" || parts[1] === undefined ? -1 : parseInt(parts[1], 10);
          const label = parts.slice(2).join("|") || "Sección";
          if (idx >= 0) {
            return (
              <div key={li} className="pl-3 my-1">
                <button onClick={() => onScrollToSection?.(idx)}
                  className="text-xs text-accent hover:text-accent-hover font-mono bg-bg3 hover:bg-bg4 rounded px-2 py-0.5 border-0 cursor-pointer inline-flex items-center gap-1"
                >
                  📍 «{label}»
                </button>
              </div>
            );
          }
          return (
            <div key={li} className="pl-3 my-1">
              <span className="text-xs text-text-muted font-mono bg-bg3 rounded px-2 py-0.5 inline-flex items-center gap-1">Sección: «{label}»</span>
            </div>
          );
        }
        if (line.startsWith("@D|"))
          return <p key={li} className="text-sm text-text-muted leading-relaxed pl-3 mb-1">{line.slice(3)}</p>;
        if (line.startsWith("@M|"))
          return <p key={li} className="text-xs text-text-hint italic pl-3 mb-1">… y {line.slice(3)} más</p>;
        if (line.startsWith("@OK|"))
          return (
            <p key={li} className="text-sm text-text-muted pl-3 mb-0.5 flex items-center gap-1.5">
              <span className="text-teal">✓</span>{line.slice(4)}
            </p>
          );
        if (line.startsWith("@N|"))
          return <div key={li} className="mt-4 pt-3 border-t border-border-main/60 text-sm text-text-main leading-relaxed">{line.slice(3)}</div>;

        if (t.startsWith("📋"))
          return (
            <h3 key={li} className="text-text-main font-bold text-base mb-4 mt-0 border-b border-border-main/50 pb-2">
              {t.replace(/📋\s*/, "")}
            </h3>
          );
        if (t.startsWith("🔴") || t.startsWith("🟡") || t.startsWith("🟢")) {
          const isHeader = t.includes("—") || t.includes("·");
          if (isHeader) {
            return (
              <h4 key={li} className="text-text-main font-bold text-sm mt-5 mb-2 flex items-center gap-2">
                {t.replace(/\*\*/g, "")}
              </h4>
            );
          }
        }
        if (t.startsWith("✅"))
          return (
            <h4 key={li} className="text-text-main font-bold text-sm mt-5 mb-2 flex items-center gap-2">{t}</h4>
          );
        if (t.startsWith("**Veredicto") || t.match(/^\*\*.*\*\*/))
          return (
            <h4 key={li} className="text-text-main font-bold text-sm mt-5 mb-2">{t.replace(/\*\*/g, "")}</h4>
          );
        if (raw.startsWith("  ") && !t.startsWith(">") && !t.startsWith("•"))
          return (
            <p key={li} className="text-text-main font-semibold text-sm mt-3 mb-1 ml-4 uppercase tracking-wider">{t}</p>
          );
        if (t.startsWith(">"))
          return (
            <div key={li} className="bg-bg3 border-l-2 border-accent/40 py-1.5 px-3 my-1 ml-6 rounded-xs">
              <span className="text-text-muted text-sm italic font-mono block whitespace-normal">{t.replace(/^>\s*/, "")}</span>
            </div>
          );
        if (t.startsWith("•"))
          return (
            <p key={li} className="text-text-muted text-sm mb-1 ml-6 flex items-start gap-1.5">
              <span>•</span>
              <span>{t.replace(/^•\s*/, "")}</span>
            </p>
          );
        return <p key={li} className="text-text-muted text-sm mb-1 ml-4">{t.replace(/\*\*/g, "")}</p>;
      })}
    </div>
  );
}

export const Workspace: React.FC = () => {
  const {
    config, updateConfig,
    documentText, showChat, fileName,
    detectedNorm, setDetectedNorm,
    setDetectedTipo,
    detectedCarrera, setDetectedCarrera,
  } = useProject();
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const docScrollRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [chatPct, setChatPct] = useState(50);
  const [dragging, setDragging] = useState(false);

  const [status, setStatus] = useState<WorkspaceStatus>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [motoresFallidos, setMotoresFallidos] = useState<string[]>([]);
  const [revision, setRevision] = useState<RevisionDocumento | null>(null);

  const [messages, setMessages] = useState<Mensaje[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [secciones, setSecciones] = useState<SeccionInfo[]>([]);

  const [thinkingText, setThinkingText] = useState("");
  const [normEvidencia, setNormEvidencia] = useState("");  // evidencia del estilo de cita (tooltip)
  // Progreso del análisis por secciones (intro -> método -> …)
  const [progreso, setProgreso] = useState<{ total: number; hechas: number; actual: string }>({
    total: 0,
    hechas: 0,
    actual: "",
  });

  useEffect(() => {
    if (!documentText) return;
    const texto = documentText;
    const ctrl = new AbortController();
    const signal = ctrl.signal;
    let cancelado = false;

    // Normativa: detección determinista por patrón de cita (regla en el back). Fire-and-forget,
    // no bloquea el análisis. Hasta que responda, el chip muestra "Detectando…".
    setDetectedNorm("");
    setNormEvidencia("");
    api.detectarNormativa(texto, signal)
      .then((d) => {
        if (cancelado || !d.normativa) return;
        setDetectedNorm(d.normativa);
        setNormEvidencia(`${d.ieee} citas numéricas [N] vs ${d.apa} autor-año`);
      })
      .catch(() => { /* sin red: el chip queda en "Detectando…" */ });

    const run = async () => {
      setStatus("loading");
      setThinkingText("Conectando con el backend");
      setMessages([]);
      setMotoresFallidos([]);
      setRevision(null);
      setProgreso({ total: 0, hechas: 0, actual: "" });

      const fallidos = new Set<string>();
      const sumarFallidos = (nombres: string[]) => {
        nombres.forEach((m) => fallidos.add(m));
        if (!cancelado) setMotoresFallidos([...fallidos]);
      };

      try {
        await api.salud(signal); // si el backend no responde, lanza y cae al catch
        if (cancelado) return;

        // Detectar tipo, carrera, normativa desde el contenido (modelo + reglas).
        setThinkingText("Identificando tipo de documento y formato académico");
        try {
          const params = await api.detectarParametros({ texto: texto.slice(0, 5000) });
          if (!cancelado && params) {
            const VALID_DOC_TYPES = ["tesis", "proyecto", "informe", "ensayo", "monografia"];
            const CARRERA_INVALID = new Set(["texto", "no_claro", "general", "", null]);
            if (params.carrera && !CARRERA_INVALID.has(params.carrera)) {
              setDetectedCarrera(params.carrera);
            }
            if (params.tipo_doc) setDetectedTipo(params.tipo_doc);
            if (params.confianza_tipo_doc && params.confianza_tipo_doc >= 0.4 && params.tipo_doc
                && VALID_DOC_TYPES.includes(params.tipo_doc)) {
              updateConfig({ docType: params.tipo_doc as any });
            }
            if (params.confianza_carrera && params.confianza_carrera >= 0.4 && params.carrera
                && !CARRERA_INVALID.has(params.carrera)) {
              updateConfig({ carrera: params.carrera });
            }
            if (params.confianza_normativa && params.confianza_normativa >= 0.4 && params.normativa) {
              const VALID_NORMS = ["apa7", "ieee", "vancouver", "chicago"];
              if (VALID_NORMS.includes(params.normativa)) {
                updateConfig({ norm: params.normativa as any });
                setDetectedNorm(params.normativa);
              }
            }
          }
        } catch { /* fallback a defaults */ }

        // 1) Reglas (ortografía + gramática) sobre TODO el documento.
        setThinkingText("Revisando ortografía y gramática");
        const r1 = await api.analizar({ texto, tipo_doc: mapDocType(config.docType), dimensiones: ["gramatica"] }, signal);
        if (cancelado) return;
        sumarFallidos(r1.motores_fallidos);
        setStatus("partial");

        // 2) Secciones del documento (por el índice).
        setThinkingText("Detectando secciones del documento");
        const { secciones } = await api.secciones({ texto }, signal);
        if (cancelado) return;
        setSecciones(secciones);

        // 3) Pasada global: estructura, cohesión, conectores + revisión holística (todo el doc).
        setThinkingText("Evaluando normativa y estructura");
        const rg = await api.analizar({ texto, tipo_doc: mapDocType(config.docType), dimensiones: ["organizacion", "coherencia"], alcance: "global" }, signal);
        if (cancelado) return;
        sumarFallidos(rg.motores_fallidos);
        const revisionData = rg.revision;
        if (revisionData) setRevision(revisionData);
        // 4) Ideas + flujo POR SECCIÓN, progresivo (intro -> método -> …).
        if (!cancelado) setProgreso({ total: secciones.length, hechas: 0, actual: "" });
        for (const [i, sec] of secciones.entries()) {
          if (cancelado) return;
          setThinkingText(`Analizando sección ${i + 1}/${secciones.length}: ${sec.titulo}`);
          if (!cancelado) setProgreso((p) => ({ ...p, actual: sec.titulo }));
          const sub = texto.slice(sec.inicio, sec.fin);
          try {
            const rs = await api.analizar(
              { texto: sub, tipo_doc: mapDocType(config.docType), dimensiones: ["organizacion", "coherencia"], alcance: "seccion", offset_base: sec.inicio },
              signal,
            );
            if (cancelado) return;
            sumarFallidos(rs.motores_fallidos);
          } catch (e) {
            if (cancelado || (e instanceof DOMException && e.name === "AbortError")) return;
            // Una sección que falla no tumba el resto del análisis.
          }
          if (!cancelado) setProgreso((p) => ({ ...p, hechas: p.hechas + 1 }));
        }

        if (cancelado) return;
        if (fallidos.size > 0 && !revisionData) {
          setStatus("error");
          setErrorMsg("La IA local no está disponible. El análisis se limitará a reglas básicas.");
        } else if (revisionData) {
          setStatus("success");
          setMessages([{ rol: "asistente", contenido: buildAnalisisDetallado(revisionData, secciones, {
            tipo: config.docType,
            carrera: config.carrera,
            fileName,
          }, documentText) }]);
        } else {
          setStatus("success");
          setMessages([{ rol: "asistente", contenido: buildResumen([]) }]);
        }
        setThinkingText("");
      } catch (err) {
        // Cancelación (cambio de documento / desmontaje): no es un error para el usuario.
        if (cancelado || (err instanceof DOMException && err.name === "AbortError")) return;
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Error al analizar el documento");
        setThinkingText("");
      }
    };

    run();
    return () => {
      cancelado = true;
      ctrl.abort(); // aborta de verdad las pasadas en vuelo (evita doble análisis en StrictMode)
    };
  }, [documentText, config.docType]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // (docx-preview eliminado — siempre se renderiza el texto convertido)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const container = containerRef.current;
    if (!container) return;
    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      let pct = ((e.clientX - rect.left) / rect.width) * 100;
      pct = Math.max(22, Math.min(75, pct));
      setChatPct(pct);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const handleSend = async () => {
    const text = chatInput.trim();
    if (!text || sending) return;
    setChatInput("");
    setSending(true);

    const userMsg: Mensaje = { rol: "usuario", contenido: text };
    const updated = [...messages, userMsg];
    setMessages(updated);

    try {
      const res = await api.chat({
        mensaje: text,
        historial: messages.map((m) => ({ rol: m.rol, contenido: m.contenido })),
        contexto: {
          documento: documentText ?? undefined,
          tipo_chat: "general",
        },
      });
      setMessages((prev) => [...prev, { rol: "asistente", contenido: res.respuesta }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { rol: "asistente", contenido: "Lo siento, no pude procesar tu mensaje. Intentalo de nuevo." },
      ]);
    } finally {
      setSending(false);
    }
  };

  const scrollToSection = (idx: number) => {
    const el = document.getElementById(`sec-${idx}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-accent/40", "rounded-sm");
      setTimeout(() => el.classList.remove("ring-2", "ring-accent/40", "rounded-sm"), 2000);
    }
  };

  function AssistantMessageContent({ content, animate }: { content: string; animate: boolean }) {
    const { revealed, done } = useLineReveal(animate ? content : "", 15);
    const display = animate && !done ? revealed : content;
    return <LinesRenderer content={display} onScrollToSection={scrollToSection} />;
  }

  return (
    <div ref={containerRef} className="flex h-full">
      {/* ── CHAT PANEL (ocultable, estilo VS Code) ── */}
      {showChat && (
      <div
        className="flex flex-col bg-bg overflow-hidden"
        style={{ width: `${chatPct}%` }}
      >
          <div className="flex-1 overflow-y-auto px-3 py-6">
          <div className="max-w-[700px] mx-auto flex flex-col gap-6">

            {/* Estado de carga inicial */}
            {messages.length === 0 && status === "loading" && (
              <div className="flex flex-col gap-6 py-16">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="text-accent text-sm">✦</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-body text-text-main font-medium">
                      Analizando tu documento
                    </span>
                    <span className="text-label text-text-hint">
                      {thinkingText}<ThinkingDots />
                    </span>
                  </div>
                </div>
                <div className="ml-12 space-y-2">
                  <div className="h-2 bg-bg3 rounded-full w-3/4 animate-pulse" />
                  <div className="h-2 bg-bg3 rounded-full w-1/2 animate-pulse" />
                  <div className="h-2 bg-bg3 rounded-full w-5/6 animate-pulse" />
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col gap-4 py-16">
                <div className="flex items-center gap-3 text-danger">
                  <IconDatabaseOff size={24} />
                  <span className="text-body font-medium">Error</span>
                </div>
                <p className="text-body text-text-muted whitespace-pre-wrap">{errorMsg}</p>
              </div>
            )}

            {/* Progreso: el modelo va analizando sección por sección (no es un error) */}
            {status === "partial" && (
              <div className="bg-accent/5 border border-accent/15 rounded-sm px-5 py-4 text-body text-text-muted flex items-center gap-3">
                <span className="w-2 h-2 bg-accent rounded-full animate-pulse shrink-0" />
                <span>
                  {progreso.total > 0 ? (
                    <>
                      Analizando por secciones — {progreso.hechas}/{progreso.total}
                      {progreso.actual ? `: ${progreso.actual}` : ""}<ThinkingDots />
                    </>
                  ) : (
                    <>{thinkingText || "Analizando el documento"}<ThinkingDots /></>
                  )}
                </span>
              </div>
            )}

            {/* Degradación real: solo si algún motor no respondió (nunca paréntesis vacíos) */}
            {motoresFallidos.length > 0 && status !== "loading" && (
              <div className="bg-warn/10 border border-warn/20 rounded-sm px-5 py-4 text-body text-text-muted flex items-start gap-3">
                <IconAlertTriangle size={18} className="text-warn shrink-0 mt-0.5" />
                <span>
                  Algunos análisis no se completaron ({motoresFallidos.join(", ")}).
                  Mostrando resultados parciales.
                </span>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.rol === "usuario" ? "justify-end" : ""}`}
              >
                <div
                  className={`rounded-xl px-6 py-5 text-body leading-relaxed whitespace-pre-wrap select-text ${
                    msg.rol === "usuario"
                      ? "bg-accent/10 text-text-main max-w-[70%]"
                      : "bg-bg2 text-text-muted w-full"
                  }`}
                >
                  {msg.rol === "asistente" ? (
                    <AssistantMessageContent content={msg.contenido} animate={i === messages.length - 1} />
                  ) : (
                    msg.contenido
                  )}
                </div>
              </div>
            ))}

            {/* Thinking indicator while sending */}
            {sending && (
              <div className="flex items-center gap-2 text-label text-text-hint">
                <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                Pensando<ThinkingDots />
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Chat input */}
        <div className="px-4 py-4 shrink-0 border-t border-border-main">
          <div className="max-w-[700px] mx-auto flex gap-2 items-stretch">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Preguntale al asistente..."
              disabled={sending || status === "error"}
              className="flex-1 bg-bg3 rounded-sm px-4 py-3 text-body text-text-main font-mono outline-none focus:bg-bg4 transition-all placeholder:text-text-hint disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={sending || !chatInput.trim() || status === "error"}
              className="bg-accent hover:bg-accent-hover text-bg rounded-sm flex items-center justify-center shrink-0 transition-colors w-12 disabled:opacity-50"
            >
              <IconArrowUp size={22} />
            </button>
          </div>
        </div>
      </div>
      )}

      {/* DRAG HANDLE (solo cuando el chat está visible) */}
      {showChat && (
      <div
        className={`w-1 shrink-0 cursor-col-resize relative transition-colors ${
          dragging ? "bg-accent/30" : "bg-border-main hover:bg-accent/20"
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>
      )}

      {/* ── DOCUMENT PANEL (centro, ocupa el espacio restante) ── */}
      <div className="flex flex-col bg-bg3 overflow-hidden flex-1 min-w-0">
        <div ref={docScrollRef} className="flex-1 overflow-y-auto">
          {/* Barra: metadatos + alternar vista (Fiel = render Word / Marcado = texto con marcas) */}
          <div className="px-5 pt-7 pb-3 max-w-[980px] mx-auto flex items-center gap-3 flex-wrap">
            {/* Normativa DETECTADA por patrón de cita en el back (regla determinista y AUDITABLE:
                [N]=IEEE, (Autor, año)=APA). El tooltip muestra la evidencia (conteos), no es caja
                negra. "Detectando…" mientras llega; nunca un default inventado. */}
            <span
              title={normEvidencia ? `Detectado por el patrón de cita: ${normEvidencia}` : "Detectando la normativa por el patrón de cita…"}
              className="inline-flex items-center gap-1.5 text-[10px] text-accent bg-accent/5 px-3 py-1.5 rounded-sm font-medium tracking-wider uppercase cursor-help"
            >
              {detectedNorm
                ? ({ apa7: "APA 7", ieee: "IEEE", vancouver: "Vancouver", chicago: "Chicago" }[detectedNorm] ?? detectedNorm.toUpperCase())
                : "Detectando…"}
              {normEvidencia && <span className="text-text-hint normal-case font-normal tracking-normal">· {normEvidencia.split(" · ")[1]}</span>}
            </span>
            <span className="inline-block text-[10px] text-text-hint bg-bg2 px-3 py-1.5 rounded-sm font-medium">
              {detectedCarrera || config.carrera}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {/* Zoom: agranda/achica SOLO el documento (sin tocar el resto de la app) */}
              <div className="flex items-center gap-0.5 bg-bg2 rounded-sm p-0.5">
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
                  title="Achicar"
                  className="px-2 py-1 rounded-xs text-text-muted hover:text-text-main hover:bg-bg3 transition-colors"
                >
                  <IconMinus size={14} />
                </button>
                <button
                  onClick={() => setZoom(1)}
                  title="Restablecer (100%)"
                  className="px-1 py-1 rounded-xs text-[11px] text-text-muted hover:text-text-main tabular-nums min-w-[42px] text-center"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}
                  title="Agrandar"
                  className="px-2 py-1 rounded-xs text-text-muted hover:text-text-main hover:bg-bg3 transition-colors"
                >
                  <IconPlus size={14} />
                </button>
              </div>

              {revision && revision.hallazgos.length > 0 && (
                <div className="flex items-center gap-0.5 bg-bg2 rounded-sm p-0.5">
                  <span className="px-3 py-1 rounded-xs text-[11px] text-accent inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent/50" />
                    {revision.hallazgos.length} hallazgo{revision.hallazgos.length > 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* `zoom` escala SOLO el documento (Fiel o Marcado); la barra y la UI no se tocan */}
          <div style={{ zoom }}>
          <div className="pb-8 px-5 max-w-[860px] mx-auto">
            {documentText && (status === "success" || status === "partial") && (
              <div className="mb-10 doc-sheet select-text leading-relaxed">
                {(() => {
                  const rev = revision;
                  if (!rev || rev.hallazgos.length === 0) {
                    return renderMarkdown(documentText, undefined, undefined, undefined, true);
                  }

                  // Build map of line → color per hallazgo severity
                  const lines = documentText.split("\n");
                  const hlLines = new Map<number, string>();
                  const secIdxToLine: [number, number][] = [];

                  for (const h of rev.hallazgos) {
                    if (!h.seccion) continue;
                    const secIdx = matchSeccion(h.seccion, secciones, documentText);
                    const pos = findTextInDoc(documentText, h.seccion);
                    if (pos < 0) continue;
                    let lineIdx = 0;
                    let acc = 0;
                    for (let li = 0; li < lines.length; li++) {
                      if (pos >= acc && pos < acc + lines[li].length + 1) {
                        lineIdx = li;
                        break;
                      }
                      acc += lines[li].length + 1;
                    }
                    const color = COLOR_SEV_HL[h.severidad] || "#e05555";
                    const start = Math.max(0, lineIdx - 1);
                    const end = Math.min(lines.length, lineIdx + 3);
                    for (let li = start; li < end; li++) hlLines.set(li, color);
                    if (secIdx >= 0) secIdxToLine.push([secIdx, lineIdx]);
                  }

                  return (
                    <div>
                      {renderMarkdown(documentText, hlLines, undefined, secIdxToLine, true)}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

    </div>
  );
};