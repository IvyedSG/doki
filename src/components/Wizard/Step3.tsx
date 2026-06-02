import React, { useCallback, useEffect, useState } from "react";
import { useProject } from "../../context/ProjectContext";
import { api } from "../../services/api";

interface Step3Props {
  isInitializing: boolean;
  onFinishInit: () => void;
}

interface LogEntry {
  text: string;
  ok?: boolean;
}

const ALL_LOGOS: string[] = [
  "⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏",
];

export const Step3: React.FC<Step3Props> = ({ isInitializing, onFinishInit }) => {
  const { config, documentText } = useProject();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [done, setDone] = useState(false);
  const [spinner, setSpinner] = useState(0);

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setSpinner((s) => (s + 1) % ALL_LOGOS.length), 120);
    return () => clearInterval(t);
  }, [done]);

  const addLog = useCallback((text: string, ok?: boolean) => {
    setLogs((prev) => [...prev, { text, ok }]);
  }, []);

  useEffect(() => {
    if (!isInitializing) return;
    let cancelled = false;

    const run = async () => {
      addLog("Verificando conexión con el backend...");
      try {
        const salud = await api.salud();
        if (cancelled) return;
        if (salud.estado === "error") {
          addLog("Error: backend no disponible. Ejecutá ./dev.sh primero.", false);
          setTimeout(() => onFinishInit(), 2000);
          return;
        }
        addLog("Backend conectado. Reglas cargadas.");
      } catch {
        addLog("Error: no se pudo conectar con el backend.", false);
        setTimeout(() => onFinishInit(), 2000);
        return;
      }

      if (documentText) {
        addLog("Detectando tipo de documento, normativa y carrera...");
        try {
          const det = await api.detectarParametros({ texto: documentText.slice(0, 3000) });
          if (cancelled) return;

          if (det.tipo_doc && det.tipo_doc !== "no_claro") {
            addLog(`→ Tipo detectado: ${det.tipo_doc} (confianza: ${Math.round((det.confianza_tipo_doc ?? 0) * 100)}%)`);
            if (det.tipo_doc !== config.docType) {
              addLog("  ⚠ difiere de tu selección. Podés cambiarlo en el paso 1.");
            }
          }
          if (det.normativa && det.normativa !== "no_claro") {
            addLog(`→ Normativa detectada: ${det.normativa}`);
          }
          if (det.carrera && det.carrera !== "no_claro") {
            addLog(`→ Carrera detectada: ${det.carrera}`);
          }
        } catch {
          addLog("Detección automática no disponible (el modelo no responde).");
        }
      }

      addLog("Preparando entorno de análisis...");
      addLog("Doki listo. Entorno de análisis inicializado.", true);
      setDone(true);
      setTimeout(() => {
        if (!cancelled) onFinishInit();
      }, 600);
    };

    run();
    return () => { cancelled = true; };
  }, [isInitializing, documentText, addLog, onFinishInit, config.docType]);

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent mb-6"></div>
        <h2 className="text-xs font-bold tracking-widest text-text-main mb-4 uppercase">
          {done ? "Listo" : "Inicializando Entorno"}
        </h2>
        <div className="w-full bg-bg3 border border-border-main rounded-rad p-5 text-[11px] text-text-muted min-h-48 flex flex-col gap-2.5 overflow-y-auto leading-relaxed text-left font-mono">
          {logs.map((log, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <span className={`shrink-0 ${log.ok === false ? "text-danger" : log.ok === true ? "text-teal" : "text-accent"}`}>
                {log.ok === false ? "✗" : log.ok === true ? "✓" : ALL_LOGOS[spinner]}
              </span>
              <span>{log.text}</span>
              {idx === logs.length - 1 && !done && <span className="animate-ping text-accent">|</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 text-left bg-bg3 border border-border-main rounded-rad p-5">
      <span className="text-xs font-bold text-accent tracking-widest uppercase mb-1.5">Resumen del Entorno</span>
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-text-muted">Documento:</span>
          <span className="text-text-main font-bold capitalize">{config.docType}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-text-muted">Normativa:</span>
          <span className="text-text-main font-bold uppercase">{config.norm}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-text-muted">Escuela:</span>
          <span className="text-text-main font-bold truncate max-w-[200px]">{config.carrera}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-text-muted">Andamiaje:</span>
          <span className="text-accent font-bold capitalize">{config.detailLevel}</span>
        </div>
      </div>
      <p className="text-[10px] text-text-hint border-t border-border-main pt-3 mt-1.5 leading-relaxed italic">
        Al iniciar, Doki detectará automáticamente los parámetros de tu documento y preparará el entorno de análisis.
      </p>
    </div>
  );
};
