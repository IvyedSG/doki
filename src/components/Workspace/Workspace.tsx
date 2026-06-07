import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { useProject } from "../../context/ProjectContext";
import { api } from "../../services/api";
import { renderDocx } from "../../services/docxView";
import { mapDocType } from "../../types/mapping";
import type { Sugerencia, MensajeChat as Mensaje, RevisionDocumento, SeccionInfo } from "../../types/api";
import {
  IconArrowUp,
  IconAlertTriangle,
  IconDatabaseOff,
  IconInfoCircle,
  IconMinus,
  IconPlus,
} from "@tabler/icons-react";

type WorkspaceStatus = "loading" | "success" | "error" | "partial";

function normSec(s: string): string {
  return s.replace(/\.(?=\s|$)/g, "").trim().toLowerCase();
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

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let inList = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) {
      if (inList) { inList = false; }
      out.push(<div key={i} className="h-3" />);
      continue;
    }
    if (t.startsWith("# ")) { inList = false; out.push(<h1 key={i} className="text-lg font-bold mt-5 mb-2">{renderInline(t.slice(2))}</h1>); continue; }
    if (t.startsWith("## ")) { inList = false; out.push(<h2 key={i} className="text-base font-bold mt-4 mb-1">{renderInline(t.slice(3))}</h2>); continue; }
    if (t.startsWith("### ")) { inList = false; out.push(<h3 key={i} className="text-sm font-bold mt-3 mb-1">{renderInline(t.slice(4))}</h3>); continue; }
    if (t.startsWith("- ") || t.startsWith("* ")) {
      inList = true;
      out.push(<li key={i} className="ml-5 text-[13px] mb-0.5 list-disc">{renderInline(t.slice(2))}</li>);
      continue;
    }
    inList = false;
    out.push(<p key={i} className="text-[13px] mb-1 leading-relaxed">{renderInline(t)}</p>);
  }
  return out;
}

function buildAnalisisDetallado(
  rev: RevisionDocumento,
  secciones: SeccionInfo[],
  meta: { tipo: string; carrera: string; fileName: string | null },
): string {
  const L: string[] = [];

  const TIPO_LABEL: Record<string, string> = {
    tesis: "Tesis", proyecto: "Proyecto de Investigación", informe: "Informe Académico",
    ensayo: "Ensayo", monografia: "Monografía",
  };
  const tipoLabel = TIPO_LABEL[meta.tipo] || meta.tipo;

  L.push(`@T|PR Review — ${tipoLabel}${meta.fileName ? ` — ${meta.fileName}` : ""}`);
  L.push(`@P|Revisado en: Coherencia argumentativa · Organización estructural · Gramática y estilo académico · ${meta.carrera}`);
  L.push("");
  L.push("@P|Resumen general");
  L.push("@R|" + rev.resumen.replace(/\n/g, " "));
  L.push("");

  const ORDEN_SEV = ["bloqueante", "corregir", "menor"];
  const ETIQ_SEV: Record<string, string> = { bloqueante: "Bloqueante", corregir: "A corregir", menor: "Menor" };
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
      const n = normSec(h.seccion);
      const match = n
        ? secciones.findIndex(s => normSec(s.titulo).includes(n) || n.includes(normSec(s.titulo)))
        : -1;
      L.push(`@L|${h.seccion}`);
      if (match >= 0) L.push(`@J|${match}|${h.seccion}`);
    }

    L.push(`@D|${h.descripcion}`);
    L.push("");
  }

  // Veredicto with severity count table like example-analysis.md
  L.push("@P|Veredicto");
  const tabla = [
    `Severidad | Cantidad`,
    `${ICON_SEV.bloqueante} Bloqueante | ${conteo.bloqueante}`,
    `${ICON_SEV.corregir} A corregir | ${conteo.corregir}`,
    `${ICON_SEV.menor} Menor | ${conteo.menor}`,
  ].join("\n");
  L.push(`@V|${conteo.bloqueante}|${conteo.corregir}|${conteo.menor}|${rev.hallazgos.length}|${tabla}`);

  if (rev.veredicto) {
    L.push("@N|" + rev.veredicto.replace(/\n/g, " "));
  }
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
    ["error", "red", "Bloqueante"],
    ["advertencia", "amber", "A corregir"],
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

export const Workspace: React.FC = () => {
  const { config, documentText, docxBuffer, showChat, fileName } = useProject();
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const docxRef = useRef<HTMLDivElement>(null);
  const docScrollRef = useRef<HTMLDivElement>(null);
  const [vista, setVista] = useState<"fiel" | "marcado">("marcado");
  const [zoom, setZoom] = useState(1);
  const [chatPct, setChatPct] = useState(50);
  const [dragging, setDragging] = useState(false);

  const [status, setStatus] = useState<WorkspaceStatus>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [motoresFallidos, setMotoresFallidos] = useState<string[]>([]);
  const [nota, setNota] = useState<string | null>(null);
  const [revision, setRevision] = useState<RevisionDocumento | null>(null);

  const [messages, setMessages] = useState<Mensaje[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [secciones, setSecciones] = useState<SeccionInfo[]>([]);

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
    const ctrl = new AbortController();
    const signal = ctrl.signal;
    let cancelado = false;

    const run = async () => {
      setStatus("loading");
      setThinkingText("Conectando con el backend");
      setMessages([]);
      setMotoresFallidos([]);
      setNota(null);
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

        // 1) Reglas (ortografía + gramática) sobre TODO el documento.
        setThinkingText("Revisando ortografía y gramática");
        const r1 = await api.analizar({ texto, tipo_doc: tipoDoc, dimensiones: ["gramatica"] }, signal);
        if (cancelado) return;
        sumarFallidos(r1.motores_fallidos);
        setStatus("partial");

        // 2) Secciones del documento (por el índice).
        const { secciones } = await api.secciones({ texto }, signal);
        if (cancelado) return;
        setSecciones(secciones);

        // 3) Pasada global: estructura, cohesión, conectores + revisión holística (todo el doc).
        setThinkingText("Analizando estructura y cohesión");
        const rg = await api.analizar({ texto, tipo_doc: tipoDoc, dimensiones: ["organizacion", "coherencia"], alcance: "global" }, signal);
        if (cancelado) return;
        sumarFallidos(rg.motores_fallidos);
        const revisionData = rg.revision;
        if (revisionData) setRevision(revisionData);
        if (rg.nota) setNota(rg.nota);

        // 4) Ideas + flujo POR SECCIÓN, progresivo (intro -> método -> …).
        if (!cancelado) setProgreso({ total: secciones.length, hechas: 0, actual: "" });
        for (const sec of secciones) {
          if (cancelado) return;
          if (!cancelado) setProgreso((p) => ({ ...p, actual: sec.titulo }));
          const sub = texto.slice(sec.inicio, sec.fin);
          try {
            const rs = await api.analizar(
              { texto: sub, tipo_doc: tipoDoc, dimensiones: ["organizacion", "coherencia"], alcance: "seccion", offset_base: sec.inicio },
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
        if (secciones.length > 1) {
          setNota(`Análisis por secciones (${secciones.length}): el modelo revisó el documento completo, parte por parte.`);
        }
        if (fallidos.size > 0 && !revisionData) {
          setStatus("error");
          setErrorMsg("La IA local no está disponible. El análisis se limitará a reglas básicas.");
        } else if (revisionData) {
          setStatus("success");
          setMessages([{ rol: "asistente", contenido: buildAnalisisDetallado(revisionData, secciones, {
            tipo: config.docType,
            carrera: config.carrera,
            fileName,
          }) }]);
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

  // Vista fiel solo si hay bytes del .docx (los .txt/.md/demo van siempre a "marcado").
  const fiel = vista === "fiel" && !!docxBuffer;

  const scrollToSection = (idx: number) => {
    setVista("marcado");
    requestAnimationFrame(() =>
      document.getElementById(`sec-${idx}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

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
                        if (line.startsWith("@R|"))
                          return <p key={li} className="text-text-main text-sm leading-relaxed mb-4 bg-bg3/50 -mx-2 px-4 py-3 rounded-sm border-l-2 border-accent/40">{line.slice(3)}</p>;
                        if (line.startsWith("@H|"))
                          return <p key={li} className="text-text-main text-sm font-bold mt-4 mb-1 leading-snug">{line.slice(3)}</p>;
                        if (line.startsWith("@P|"))
                          return <p key={li} className="text-text-muted text-sm leading-relaxed mb-2">{line.slice(3)}</p>;
                        if (line.startsWith("@V|")) {
                          const p = line.split("|");
                          const badges = [
                            { c: "red", v: p[1], l: "bloqueante" },
                            { c: "amber", v: p[2], l: "a corregir" },
                            { c: "green", v: p[3], l: "menor" },
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
                        if (line.startsWith("@L|"))
                          return (
                            <div key={li} className="pl-3 my-1">
                              <span className="text-xs text-text-muted font-mono bg-bg3 rounded px-2 py-0.5 inline-flex items-center gap-1">Sección: «{line.slice(3)}»</span>
                            </div>
                          );
                        if (line.startsWith("@D|"))
                          return <p key={li} className="text-sm text-text-muted leading-relaxed pl-3 mb-1">{line.slice(3)}</p>;
                        if (line.startsWith("@J|")) {
                          const p = line.split("|");
                          const idx = parseInt(p[1], 10);
                          const label = p[2] || "Ir a la sección";
                          return (
                            <button
                              key={li}
                              onClick={() => scrollToSection(idx)}
                              className="text-xs text-accent hover:text-accent-hover underline underline-offset-4 pl-3 mb-1 bg-transparent border-0 cursor-pointer font-mono text-left"
                            >
                              📍 Ir a «{label}»
                            </button>
                          );
                        }
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
                            <p key={li} className="text-text-main font-semibold text-sm mt-3 mb-1 ml-4 uppercase tracking-wider">
                              {t}
                            </p>
                          );
                        }
                        
                        // Bloque de ejemplo de error (ej: "  > Posible error...")
                        if (t.startsWith(">")) {
                          return (
                            <div key={li} className="bg-bg3 border-l-2 border-accent/40 py-1.5 px-3 my-1 ml-6 rounded-xs">
                              <span className="text-text-muted text-sm italic font-mono block whitespace-normal">
                                {t.replace(/^>\s*/, "")}
                              </span>
                            </div>
                          );
                        }
                        
                        // Lista de viñetas
                        if (t.startsWith("•")) {
                          return (
                            <p key={li} className="text-text-muted text-sm mb-1 ml-6 flex items-start gap-1.5">
                              <span>•</span>
                              <span>{t.replace(/^•\s*/, "")}</span>
                            </p>
                          );
                        }
                        
                        // Texto normal
                        return (
                          <p key={li} className="text-text-muted text-sm mb-1 ml-4">
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
              <div className="mb-10 doc-sheet select-text leading-relaxed">
                {(() => {
                  const rev = revision;
                  if (!rev || secciones.length === 0) {
                    // Simple markdown rendering when no highlights
                    const mdLines = documentText.split("\n");
                    return mdLines.map((line, i) => {
                      const t = line.trim();
                      if (!t) return <div key={i} className="h-4" />;
                      if (t.startsWith("# ")) return <h1 key={i} className="text-lg font-bold mt-6 mb-3">{t.slice(2)}</h1>;
                      if (t.startsWith("## ")) return <h2 key={i} className="text-base font-bold mt-5 mb-2">{t.slice(3)}</h2>;
                      if (t.startsWith("### ")) return <h3 key={i} className="text-sm font-bold mt-4 mb-1">{t.slice(4)}</h3>;
                      if (t.startsWith("- ") || t.startsWith("* ")) return <li key={i} className="ml-4 text-[13px] mb-0.5">{t.slice(2)}</li>;
                      return <p key={i} className="text-[13px] mb-1 leading-relaxed">{renderInline(t)}</p>;
                    });
                  }

                  // Build section segments with highlights
                  const hIdx = new Set(
                    rev.hallazgos
                      .map(h => {
                        if (!h.seccion) return -1;
                        const n = normSec(h.seccion);
                        return secciones.findIndex(s =>
                          normSec(s.titulo).includes(n) || n.includes(normSec(s.titulo))
                        );
                      })
                      .filter(i => i >= 0),
                  );

                  // Split text at section boundaries
                  const sorted = [...secciones].sort((a, b) => a.inicio - b.inicio);
                  const segments: { inicio: number; fin: number; highlight: boolean; idx: number }[] = [];
                  let cursor = 0;
                  for (const sec of sorted) {
                    if (sec.inicio > cursor) {
                      segments.push({ inicio: cursor, fin: sec.inicio, highlight: false, idx: -1 });
                    }
                    segments.push({ inicio: sec.inicio, fin: sec.fin, highlight: hIdx.has(sec.idx), idx: sec.idx });
                    cursor = sec.fin;
                  }
                  if (cursor < documentText.length) {
                    segments.push({ inicio: cursor, fin: documentText.length, highlight: false, idx: -1 });
                  }

                  return segments.map((seg, si) => {
                    const text = documentText.slice(seg.inicio, seg.fin);
                    if (seg.highlight) {
                      return (
                        <span
                          key={si}
                          id={`sec-${seg.idx}`}
                          className="bg-accent/5 block rounded-sm px-4 -mx-4 py-2 my-3 border-l-2 border-accent/40 scroll-mt-12"
                        >
                          {renderMarkdown(text)}
                        </span>
                      );
                    }
                    return <span key={si}>{renderMarkdown(text)}</span>;
                  });
                })()}
              </div>
            )}
          </div>
          )}
          </div>
        </div>
      </div>

    </div>
  );
};