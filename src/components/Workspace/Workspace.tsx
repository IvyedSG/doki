import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { useProject } from "../../context/ProjectContext";
import { api } from "../../services/api";
import { renderDocx } from "../../services/docxView";
import { mapDocType } from "../../types/mapping";
import { segmentText } from "../../types/highlights";
import type { Sugerencia, MensajeChat as Mensaje, Dimension } from "../../types/api";
import {
  IconArrowUp,
  IconAlertTriangle,
  IconCircleCheck,
  IconDatabaseOff,
  IconInfoCircle,
  IconHierarchy,
  IconLink,
  IconTypography,
  IconMinus,
  IconPlus,
} from "@tabler/icons-react";

type WorkspaceStatus = "loading" | "success" | "error" | "partial";
type DimensionFilter = "todas" | "organizacion" | "coherencia" | "gramatica";

const DIMENSION_META = {
  organizacion: { label: "Organización", color: "var(--info)", icon: IconHierarchy },
  coherencia: { label: "Coherencia", color: "var(--warn)", icon: IconLink },
  gramatica: { label: "Gramática", color: "var(--danger)", icon: IconTypography },
} as const;

const DIMENSION_TABS: { key: DimensionFilter; label: string; color: string }[] = [
  { key: "todas", label: "Todas", color: "var(--text-muted)" },
  { key: "organizacion", label: "Organización", color: "var(--info)" },
  { key: "coherencia", label: "Coherencia", color: "var(--warn)" },
  { key: "gramatica", label: "Gramática", color: "var(--danger)" },
];

const RF_LABELS: Record<string, string> = {
  "RF-01": "Falta de sección",
  "RF-02": "Ideas en párrafos",
  "RF-03": "Orden de secciones",
  "RF-04": "Cohesión léxica",
  "RF-05": "Conectores faltantes",
  "RF-06": "Flujo del discurso",
  "RF-07": "Error ortográfico",
  "RF-08": "Corrección ortográfica",
  "RF-09": "Uso no académico",
};

function contar(items: Sugerencia[], severidad: string) {
  return items.filter((s) => s.severidad === severidad).length;
}

// Resumen EJECUTIVO estilo "PR": síntesis + conteos por severidad/indicador + veredicto que
// DIRIGE al panel derecho. El detalle de cada hallazgo NO se vuelca acá (eso abruma); vive a la
// derecha. Emite un mini-protocolo `@TIPO|campos` que el render del chat formatea.
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

  const criticos = contar(sugerencias, "error");
  const graves = contar(sugerencias, "advertencia");
  const leves = contar(sugerencias, "sugerencia");
  const dn = (d: string) => sugerencias.filter((s) => s.dimension === d).length;

  L.push(
    `@P|Encontré ${total} puntos en 3 aspectos — organización (${dn("organizacion")}), ` +
      `coherencia (${dn("coherencia")}) y gramática (${dn("gramatica")}). El detalle de cada uno ` +
      "está marcado en tu texto y listado a la derecha 👉",
  );
  L.push(`@V|${criticos}|${graves}|${leves}|${total}`);

  const sevs: [string, string, string][] = [
    ["error", "red", "Bloqueante"],
    ["advertencia", "amber", "A corregir"],
    ["sugerencia", "green", "Sugerencias"],
  ];
  for (const [sev, color, label] of sevs) {
    const items = sugerencias.filter((s) => s.severidad === sev);
    if (!items.length) continue;
    L.push(`@S|${color}|${label}|${items.length}`);
    // Desglose por indicador — SOLO conteos (sin volcar los hallazgos, para no abrumar).
    const porRf: Record<string, number> = {};
    for (const s of items) porRf[s.rf] = (porRf[s.rf] || 0) + 1;
    const linea = Object.entries(porRf)
      .map(([rf, n]) => `${RF_LABELS[rf] || rf} (${n})`)
      .join(" · ");
    L.push(`@D|${linea}`);
  }

  L.push(
    "@N|" +
      (graves > 0
        ? `👉 Revisalos en el panel derecho — empezá por los ${graves} «a corregir».`
        : "👉 Revisá las sugerencias en el panel derecho cuando quieras."),
  );
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

export const Workspace: React.FC = () => {
  const { config, documentText, docxBuffer, showChat, showFeedback } = useProject();
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({}); // para scrollear a la tarjeta
  const docxRef = useRef<HTMLDivElement>(null); // contenedor del render fiel (docx-preview)
  const docScrollRef = useRef<HTMLDivElement>(null); // scroll del panel del documento
  // Vista del documento: "marcado" = texto con resaltados (es el valor del producto);
  // "fiel" = render real de Word (docx-preview), a un click. Default: marcado.
  const [vista, setVista] = useState<"fiel" | "marcado">("marcado");
  const [zoom, setZoom] = useState(1); // zoom SOLO del documento (no del resto de la UI)
  const [chatPct, setChatPct] = useState(32); // 3 columnas: chat | documento (flex) | feedback
  const [dragging, setDragging] = useState(false);

  const [status, setStatus] = useState<WorkspaceStatus>("loading");
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [motoresFallidos, setMotoresFallidos] = useState<string[]>([]);
  const [nota, setNota] = useState<string | null>(null);

  const [dimFilter, setDimFilter] = useState<DimensionFilter>("todas");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Mensaje[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [popoverId, setPopoverId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => {
      setPopoverId(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const [thinkingText, setThinkingText] = useState("");
  // Progreso del análisis por secciones (intro -> método -> …)
  const [progreso, setProgreso] = useState<{ total: number; hechas: number; actual: string }>({
    total: 0,
    hechas: 0,
    actual: "",
  });

  useEffect(() => {
    if (!documentText) return;
    const texto = documentText;
    const tipoDoc = mapDocType(config.docType);
    const dims: Dimension[] = ["organizacion", "coherencia"];
    const ctrl = new AbortController();
    const signal = ctrl.signal;
    let cancelado = false;

    const run = async () => {
      setStatus("loading");
      setThinkingText("Conectando con el backend");
      setSugerencias([]);
      setMessages([]); // limpia el resumen viejo: no mostrar un informe stale mientras re-analiza
      setMotoresFallidos([]);
      setNota(null);
      setProgreso({ total: 0, hechas: 0, actual: "" });

      // Acumulamos de TODAS las pasadas con ids únicos del front (los del back se repiten por pasada).
      const acumulado: Sugerencia[] = [];
      const fallidos = new Set<string>();
      let nid = 0;
      const agregar = (items: Sugerencia[]) => {
        for (const it of items) acumulado.push({ ...it, id: `s${nid++}` });
        if (!cancelado) setSugerencias([...acumulado]);
      };
      // Publica los motores fallidos a medida que se detectan (no solo al final).
      const sumarFallidos = (nombres: string[]) => {
        nombres.forEach((m) => fallidos.add(m));
        if (!cancelado) setMotoresFallidos([...fallidos]);
      };

      try {
        await api.salud(signal); // si el backend no responde, lanza y cae al catch
        if (cancelado) return;

        // 1) Reglas (ortografía + gramática) sobre TODO el documento.
        setThinkingText("Revisando ortografía y gramática");
        const r1 = await api.analizar({ texto, tipo_doc: tipoDoc, dimensiones: ["gramatica"] }, signal);
        if (cancelado) return;
        agregar(r1.sugerencias);
        sumarFallidos(r1.motores_fallidos);
        setStatus("partial");

        // 2) Secciones del documento (por el índice).
        const { secciones } = await api.secciones({ texto }, signal);
        if (cancelado) return;

        // 3) Pasada global: estructura, cohesión y conectores (todo el doc).
        setThinkingText("Analizando estructura y cohesión");
        const rg = await api.analizar({ texto, tipo_doc: tipoDoc, dimensiones: dims, alcance: "global" }, signal);
        if (cancelado) return;
        agregar(rg.sugerencias);
        sumarFallidos(rg.motores_fallidos);

        // 4) Ideas + flujo POR SECCIÓN, progresivo (intro -> método -> …).
        if (!cancelado) setProgreso({ total: secciones.length, hechas: 0, actual: "" });
        for (const sec of secciones) {
          if (cancelado) return;
          if (!cancelado) setProgreso((p) => ({ ...p, actual: sec.titulo }));
          const sub = texto.slice(sec.inicio, sec.fin);
          try {
            const rs = await api.analizar(
              { texto: sub, tipo_doc: tipoDoc, dimensiones: dims, alcance: "seccion", offset_base: sec.inicio },
              signal,
            );
            if (cancelado) return;
            agregar(rs.sugerencias);
            sumarFallidos(rs.motores_fallidos);
          } catch (e) {
            if (cancelado || (e instanceof DOMException && e.name === "AbortError")) return;
            // Una sección que falla no tumba el resto del análisis.
          }
          if (!cancelado) setProgreso((p) => ({ ...p, hechas: p.hechas + 1 }));
        }

        if (cancelado) return;
        if (secciones.length > 1) {
          setNota(`Análisis por secciones (${secciones.length}): el modelo revisó el documento completo, parte por parte.`);
        }
        if (acumulado.length === 0 && fallidos.size > 0) {
          setStatus("error");
          setErrorMsg("La IA local (llama-server) no está disponible. El análisis se limitará a reglas básicas de ortografía y normativa.");
        } else {
          setStatus("success");
          setMessages([{ rol: "asistente", contenido: buildResumen(acumulado) }]);
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

  // Render FIEL del .docx (docx-preview) cuando está en vista "fiel" y hay bytes del archivo.
  useEffect(() => {
    if (vista !== "fiel" || !docxBuffer || !docxRef.current) return;
    let cancel = false;
    const host = docxRef.current;
    host.innerHTML =
      '<p class="text-text-hint text-label px-2 py-10 text-center">Cargando vista fiel…</p>';
    renderDocx(host, docxBuffer).catch(() => {
      if (!cancel)
        host.innerHTML =
          '<p class="text-text-muted text-body px-2 py-10 text-center">No se pudo renderizar la vista fiel del documento.</p>';
    });
    return () => {
      cancel = true;
    };
  }, [docxBuffer, vista]);

  // Al alternar Fiel/Marcado, volver al inicio del documento (si no, queda scrolleado abajo
  // donde estabas en la otra vista y parece que "no cambió"). useLayoutEffect corre ANTES de
  // pintar -> el usuario nunca ve la posición vieja. El rAF reasegura cuando el render fiel
  // (docx-preview, asíncrono) crece después.
  useLayoutEffect(() => {
    const el = docScrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
    const id = requestAnimationFrame(() => {
      el.scrollTop = 0;
    });
    return () => cancelAnimationFrame(id);
  }, [vista]);

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
      pct = Math.max(22, Math.min(50, pct)); // deja sitio al documento + barra de feedback
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

  // Tarjetas en ORDEN DEL DOCUMENTO (por posición del rango). Las que no tienen rango
  // (RF-01/03/06: estructura y flujo) van al final, no intercaladas a mitad del texto.
  const filteredSugerencias = sugerencias
    .filter((s) => dimFilter === "todas" || s.dimension === dimFilter)
    .slice()
    .sort(
      (a, b) =>
        (a.rango?.inicio ?? Number.MAX_SAFE_INTEGER) -
        (b.rango?.inicio ?? Number.MAX_SAFE_INTEGER),
    );

  // Lleva la vista al resaltado dentro de la hoja (la primera ocurrencia tiene id `hl-<id>`).
  const scrollAlResaltado = (id: string) => {
    requestAnimationFrame(() =>
      document.getElementById(`hl-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  };
  // Lleva la vista a la tarjeta de retroalimentación correspondiente.
  const scrollALaTarjeta = (id: string) => {
    requestAnimationFrame(() =>
      cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  };

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

  const handleCardClick = (s: Sugerencia) => {
    const abriendo = expandedId !== s.id;
    setExpandedId(abriendo ? s.id : null);
    setHighlightedId(s.id);
    setDimFilter("todas");
    if (abriendo) scrollAlResaltado(s.id); // al abrir la tarjeta, ubico su marca en la hoja
  };

  const handleChatOnSugerencia = async (s: Sugerencia) => {
    if (sending) return;
    const meta = DIMENSION_META[s.dimension];
    const pregunta = `Decime más sobre el problema de ${meta.label.toLowerCase()}: "${s.mensaje}"`;
    const userMsg: Mensaje = { rol: "usuario", contenido: pregunta };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    try {
      const fragmento = s.rango ? (documentText ?? "").substring(s.rango.inicio, s.rango.fin) : undefined;
      const res = await api.chat({
        mensaje: pregunta,
        contexto: {
          documento: documentText ?? undefined,
          sugerencia_id: s.id,
          tipo_chat: "pedagogico",
          fragmento: fragmento || undefined,
          sugerencia_mensaje: s.mensaje,
          sugerencia_reemplazo: s.sugerencia ?? undefined,
        },
      });
      setMessages((prev) => [...prev, { rol: "asistente", contenido: res.respuesta }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { rol: "asistente", contenido: "Lo siento, no pude procesar tu mensaje." },
      ]);
    } finally {
      setSending(false);
    }
  };

  // Vista fiel solo si hay bytes del .docx (los .txt/.md/demo van siempre a "marcado").
  const fiel = vista === "fiel" && !!docxBuffer;

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
                    <div className="prose-custom leading-relaxed">
                      {msg.contenido.split("\n").map((line, li) => {
                        const raw = line;
                        const t = line.trim();
                        if (!t) return <div key={li} className="h-2" />;

                        // ── Informe estilo PR (protocolo @TIPO|campos que emite buildResumen) ──
                        const COLOR: Record<string, string> = { red: "#e05555", amber: "#f0a050", green: "#4ecba8" };
                        if (line.startsWith("@T|"))
                          return (
                            <h3 key={li} className="text-text-main font-bold text-sm mt-0 mb-2 pb-2 border-b border-border-main/60 flex items-center gap-2">
                              <span>🔎</span>{line.slice(3)}
                            </h3>
                          );
                        if (line.startsWith("@P|"))
                          return <p key={li} className="text-text-muted text-xs leading-relaxed mb-1">{line.slice(3)}</p>;
                        if (line.startsWith("@V|")) {
                          const p = line.split("|");
                          const badges = [
                            { c: "red", v: p[1], l: "críticos" },
                            { c: "amber", v: p[2], l: "a corregir" },
                            { c: "green", v: p[3], l: "sugerencias" },
                          ];
                          return (
                            <div key={li} className="flex items-center gap-1.5 my-2 flex-wrap">
                              {badges.map((b) => (
                                <span key={b.c} className="text-[10px] font-semibold px-2 py-1 rounded-full"
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
                            <div key={li} className="flex items-center gap-2 mt-4 mb-1">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLOR[p[1]] }} />
                              <span className="text-text-main font-bold text-[11px] uppercase tracking-wider">{p[2]}</span>
                              <span className="text-[10px] text-text-hint">— {p[3]}</span>
                            </div>
                          );
                        }
                        if (line.startsWith("@F|")) {
                          const p = line.split("|");
                          return (
                            <div key={li} className="mt-2 pl-2.5 border-l-2" style={{ borderColor: COLOR[p[1]] }}>
                              <span className="text-[11px] font-semibold text-text-main">{p[3]}</span>
                              <span className="text-[9px] text-text-hint ml-1.5">{p[2]} · {p[4]}</span>
                            </div>
                          );
                        }
                        if (line.startsWith("@L|"))
                          return (
                            <div key={li} className="pl-2.5 my-1">
                              <span className="text-[10px] text-text-muted font-mono bg-bg3 rounded px-1.5 py-0.5 inline-flex items-center gap-1">📍 «{line.slice(3)}»</span>
                            </div>
                          );
                        if (line.startsWith("@D|"))
                          return <p key={li} className="text-[11px] text-text-muted leading-snug pl-2.5 mb-1">{line.slice(3)}</p>;
                        if (line.startsWith("@M|"))
                          return <p key={li} className="text-[10px] text-text-hint italic pl-2.5 mb-1">… y {line.slice(3)} más → en el panel derecho</p>;
                        if (line.startsWith("@OK|"))
                          return (
                            <p key={li} className="text-[11px] text-text-muted pl-2.5 mb-0.5 flex items-center gap-1.5">
                              <span className="text-teal">✓</span>{line.slice(4)}
                            </p>
                          );
                        if (line.startsWith("@N|"))
                          return <div key={li} className="mt-3 pt-2.5 border-t border-border-main/60 text-[11px] text-text-main leading-relaxed">{line.slice(3)}</div>;

                        // Resumen del análisis
                        if (t.startsWith("📋")) {
                          return (
                            <h3 key={li} className="text-text-main font-bold text-base mb-4 mt-0 border-b border-border-main/50 pb-2">
                              {t.replace(/📋\s*/, "")}
                            </h3>
                          );
                        }
                        
                        // Encabezados de severidad (Críticos, A corregir, Sugerencias)
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
                        
                        // Aspectos correctos
                        if (t.startsWith("✅")) {
                          return (
                            <h4 key={li} className="text-text-main font-bold text-sm mt-5 mb-2 flex items-center gap-2">
                              {t}
                            </h4>
                          );
                        }
                        
                        // Veredicto
                        if (t.startsWith("**Veredicto") || t.match(/^\*\*.*\*\*/)) {
                          return (
                            <h4 key={li} className="text-text-main font-bold text-sm mt-5 mb-2">
                              {t.replace(/\*\*/g, "")}
                            </h4>
                          );
                        }
                        
                        // Subcategorías de error (ej: "  Error ortográfico · 40 casos")
                        // Identificado porque empieza con espacios pero no es un ejemplo (no empieza con > ni •)
                        if (raw.startsWith("  ") && !t.startsWith(">") && !t.startsWith("•")) {
                          return (
                            <p key={li} className="text-text-main font-semibold text-xs mt-3 mb-1 ml-4 uppercase tracking-wider">
                              {t}
                            </p>
                          );
                        }
                        
                        // Bloque de ejemplo de error (ej: "  > Posible error...")
                        if (t.startsWith(">")) {
                          return (
                            <div key={li} className="bg-bg3 border-l-2 border-accent/40 py-1.5 px-3 my-1 ml-6 rounded-xs">
                              <span className="text-text-muted text-xs italic font-mono block whitespace-normal">
                                {t.replace(/^>\s*/, "")}
                              </span>
                            </div>
                          );
                        }
                        
                        // Lista de viñetas
                        if (t.startsWith("•")) {
                          return (
                            <p key={li} className="text-text-muted text-xs mb-1 ml-6 flex items-start gap-1.5">
                              <span>•</span>
                              <span>{t.replace(/^•\s*/, "")}</span>
                            </p>
                          );
                        }
                        
                        // Texto normal
                        return (
                          <p key={li} className="text-text-muted text-xs mb-1 ml-4">
                            {t.replace(/\*\*/g, "")}
                          </p>
                        );
                      })}
                    </div>
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
            <span className="inline-block text-[10px] text-accent bg-accent/5 px-3 py-1.5 rounded-sm font-medium tracking-wider uppercase">
              {config.norm === "apa7" ? "APA 7" : config.norm}
            </span>
            <span className="inline-block text-[10px] text-text-hint bg-bg2 px-3 py-1.5 rounded-sm font-medium">
              {config.carrera}
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

              {docxBuffer && (
                <div className="flex items-center gap-0.5 bg-bg2 rounded-sm p-0.5">
                  <button
                    onClick={() => setVista("fiel")}
                    title="Ver el documento tal como se ve en Word"
                    className={`px-3 py-1 rounded-xs text-[11px] transition-colors ${
                      vista === "fiel" ? "bg-accent/15 text-accent" : "text-text-muted hover:text-text-main"
                    }`}
                  >
                    Fiel (Word)
                  </button>
                  <button
                    onClick={() => setVista("marcado")}
                    title="Ver el texto con los resaltados de cada indicador"
                    className={`px-3 py-1 rounded-xs text-[11px] transition-colors ${
                      vista === "marcado" ? "bg-accent/15 text-accent" : "text-text-muted hover:text-text-main"
                    }`}
                  >
                    Marcado
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Aviso de documento largo: el modelo solo vio el inicio; las reglas cubren todo el texto */}
          {nota && (status === "success" || status === "partial") && (
            <div className="mb-4 max-w-[980px] mx-auto px-5">
              <div className="bg-info/10 border border-info/20 rounded-sm px-5 py-4 text-body text-text-muted flex items-start gap-3">
                <IconInfoCircle size={18} className="text-info shrink-0 mt-0.5" />
                <span>{nota}</span>
              </div>
            </div>
          )}

          {/* `zoom` escala SOLO el documento (Fiel o Marcado); la barra y la UI no se tocan */}
          <div style={{ zoom }}>
          {fiel ? (
            /* ── VISTA FIEL: render real del .docx (docx-preview), solo lectura ── */
            <div ref={docxRef} className="docx-host px-5 pb-12" />
          ) : (
          <div className="pb-8 px-5 max-w-[860px] mx-auto">
            {documentText && (status === "success" || status === "partial") && (
              <div className="mb-10 doc-sheet whitespace-pre-wrap select-text">
                {(() => {
                // id solo en la 1ra ocurrencia de cada sugerencia (una marca de párrafo puede
                // partirse en varios tramos): evita ids y popovers duplicados.
                const renderedHl = new Set<string>();
                return segmentText(documentText, sugerencias).map((seg, i) => {
                  if (seg.type === "normal") {
                    return <span key={i}>{seg.text}</span>;
                  }
                  const s = sugerencias.find((x) => x.id === seg.sugerenciaId);
                  if (!s) return <span key={i}>{seg.text}</span>;
                  const firstOfId = !renderedHl.has(s.id);
                  renderedHl.add(s.id);

                  const meta = DIMENSION_META[s.dimension];
                  const Icon = meta.icon;
                  const sevIcon = s.severidad === "error" ? "🔴" : s.severidad === "advertencia" ? "🟡" : "🟢";
                  const sevColor =
                    s.severidad === "error" ? "var(--danger)" :
                    s.severidad === "advertencia" ? "var(--warn)" :
                    "var(--text-hint)";
                  const sevLabel =
                    s.severidad === "error" ? "Crítico" :
                    s.severidad === "advertencia" ? "A corregir" :
                    "Sugerencia";

                  return (
                    <span
                      key={i}
                      id={firstOfId ? `hl-${s.id}` : undefined}
                      className={`highlight-${seg.type} cursor-pointer relative ${
                        highlightedId === s.id ? "hl-active" : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPopoverId(popoverId === s.id ? null : s.id);
                        setExpandedId(s.id);
                        setHighlightedId(s.id);
                        setDimFilter("todas");
                        scrollALaTarjeta(s.id); // llevo la vista a su tarjeta de detalle
                      }}
                      title={
                        seg.type === "organizacion"
                          ? "Problema de organización - click para ver detalle"
                          : seg.type === "coherencia"
                            ? "Problema de coherencia - click para ver detalle"
                            : "Problema de gramática - click para ver detalle"
                      }
                    >
                      {seg.text}

                      {firstOfId && popoverId === s.id && (
                        <span
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 bg-bg2 border border-border-main rounded-md p-4 shadow-xl z-50 text-text-main normal-case cursor-default select-text inline-block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="flex items-center gap-2 mb-2 flex-wrap text-label">
                            <Icon size={14} style={{ color: meta.color }} />
                            <span className="font-semibold uppercase tracking-wider" style={{ color: meta.color }}>
                              {meta.label}
                            </span>
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded-sm font-medium"
                              style={{ backgroundColor: sevColor + "12", color: sevColor }}
                            >
                              {sevIcon} {sevLabel}
                            </span>
                            <span className="text-[9px] text-text-hint ml-auto">{s.rf}</span>
                          </span>
                          <span className="text-body text-text-main leading-relaxed mb-2 font-sans block whitespace-normal">
                            {s.mensaje}
                          </span>
                          {s.sugerencia && (
                            <span className="mt-2 pt-2 border-t border-border-main/50 text-text-muted text-body font-sans block whitespace-normal">
                              <span className="text-text-main font-medium">💡 Sugerencia:</span> {s.sugerencia}
                            </span>
                          )}
                          <span className="mt-3 flex justify-end gap-2 block">
                            <button
                              disabled={sending}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChatOnSugerencia(s);
                                setPopoverId(null);
                              }}
                              className="text-label text-accent hover:text-accent-hover transition-colors underline underline-offset-4 disabled:opacity-50 font-sans cursor-pointer bg-transparent border-0 p-0"
                            >
                              ¿Cómo corrijo esto?
                            </button>
                          </span>
                        </span>
                      )}
                    </span>
                  );
                });
                })()}
              </div>
            )}
          </div>
          )}
          </div>
        </div>
      </div>

      {/* ── FEEDBACK SIDEBAR (ocultable, barra lateral con scroll propio) ── */}
      {showFeedback && (
      <div className="flex flex-col bg-bg overflow-hidden w-[360px] shrink-0 border-l border-border-main">
        {/* Header FIJO: título + filtro por dimensión (no scrollea con las tarjetas) */}
        {sugerencias.length > 0 && (
          <div className="px-4 pt-5 pb-3 border-b border-border-main shrink-0">
            <span className="text-[10px] text-text-hint font-medium tracking-widest uppercase block mb-3">
              Retroalimentación
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {DIMENSION_TABS.map((tab) => {
                const count =
                  tab.key === "todas"
                    ? sugerencias.length
                    : sugerencias.filter((s) => s.dimension === tab.key).length;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setDimFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-full text-[11px] border transition-all ${
                      dimFilter === tab.key
                        ? "bg-accent/10 border-accent text-accent"
                        : "bg-transparent border-border-main text-text-muted hover:border-accent hover:text-accent"
                    }`}
                  >
                    {tab.label}
                    <span className="ml-1 opacity-60">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Cuerpo: las tarjetas con SU PROPIO scroll (ya no debajo del documento) */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {sugerencias.length === 0 && (
            <p className="text-label text-text-hint text-center px-2 py-16 leading-relaxed">
              {status === "loading" || status === "partial"
                ? "El análisis va apareciendo acá…"
                : status === "success"
                  ? "✓ Sin problemas detectados."
                  : "Sin retroalimentación."}
            </p>
          )}

          {filteredSugerencias.length > 0 && (
            <div className="flex flex-col gap-2">
                  {filteredSugerencias.map((s) => {
                    const meta = DIMENSION_META[s.dimension];
                    const Icon = meta.icon;
                    const isExpanded = expandedId === s.id;
                    const sevIcon = s.severidad === "error" ? "🔴" : s.severidad === "advertencia" ? "🟡" : "🟢";
                    const sevColor =
                      s.severidad === "error" ? "var(--danger)" :
                      s.severidad === "advertencia" ? "var(--warn)" :
                      "var(--text-hint)";
                    const sevLabel =
                      s.severidad === "error" ? "Crítico" :
                      s.severidad === "advertencia" ? "A corregir" :
                      "Sugerencia";
                    return (
                      <div
                        key={s.id}
                        ref={(el) => {
                          cardRefs.current[s.id] = el;
                        }}
                        onClick={() => handleCardClick(s)}
                        className={`bg-bg2 rounded-sm p-5 text-left border-l-2 cursor-pointer transition-all scroll-mt-6 ${
                          highlightedId === s.id ? "border-l-[3px] brightness-125 ring-1 ring-accent/40" : "hover:brightness-110"
                        }`}
                        style={{ borderLeftColor: meta.color }}
                      >
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Icon size={16} style={{ color: meta.color }} />
                          <span className="text-[10px] font-medium tracking-wider uppercase" style={{ color: meta.color }}>
                            {meta.label}
                          </span>
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded-sm font-medium"
                            style={{ backgroundColor: sevColor + "12", color: sevColor }}
                          >
                            {sevIcon} {sevLabel}
                          </span>
                          <span className="text-[9px] text-text-hint ml-auto">{s.rf}</span>
                        </div>
                        <p className="text-body text-text-main leading-relaxed">{s.mensaje}</p>
                        {isExpanded && s.sugerencia && (
                          <div className="mt-3 pt-3 border-t border-border-main/50">
                            <p className="text-body text-text-muted leading-relaxed">
                              <span className="text-text-main font-medium">💡 Sugerencia:</span> {s.sugerencia}
                            </p>
                          </div>
                        )}
                        {isExpanded && (
                          <button
                            disabled={sending}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChatOnSugerencia(s);
                            }}
                            className="mt-3 text-body text-accent hover:text-accent-hover transition-colors underline underline-offset-4 disabled:opacity-50"
                          >
                            ¿Cómo corrijo esto?
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
          )}

          {status === "success" && sugerencias.length > 0 && filteredSugerencias.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-20">
              <IconCircleCheck size={32} className="text-teal" />
              <p className="text-body text-text-muted text-center">
                No se encontraron problemas en esta dimensión.
              </p>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};