import React, { useEffect, useState } from "react";
import { useProject } from "../../context/ProjectContext";

interface Step3Props {
  isInitializing: boolean;
  onFinishInit: () => void;
}

export const Step3: React.FC<Step3Props> = ({ isInitializing, onFinishInit }) => {
  const { config } = useProject();
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (isInitializing) {
      const terminalLogs = [
        "Estableciendo canal IPC local nativo...",
        "Scaffolding de metadatos de usuario en caliente...",
        "Creando archivo de configuración 'project.md'...",
        "Vinculando perfil formativo académico de Vygotsky...",
        "Estableciendo pesos del instrumento didáctico...",
        "Cargando reglas y normas académicas locales offline...",
        "Instanciando Small Language Model local...",
        "Doki inicializado con éxito. Entorno de análisis listo."
      ];

      let currentLogIdx = 0;
      setLogs([terminalLogs[0]]);

      const interval = setInterval(() => {
        currentLogIdx++;
        if (currentLogIdx < terminalLogs.length) {
          setLogs((prev) => [...prev, terminalLogs[currentLogIdx]]);
        } else {
          clearInterval(interval);
          setTimeout(() => {
            onFinishInit();
          }, 800);
        }
      }, 400);

      return () => clearInterval(interval);
    }
  }, [isInitializing, onFinishInit]);

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent mb-6"></div>
        <h2 className="text-xs font-bold tracking-widest text-text-main mb-4 uppercase">Inicializando Entorno</h2>
        <div className="w-full bg-bg3 border border-border-main rounded-rad p-5 text-[11px] text-text-muted min-h-48 flex flex-col gap-2.5 overflow-y-auto leading-relaxed text-left font-mono">
          {logs.map((log, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <span className="text-accent shrink-0">$</span>
              <span>{log}</span>
              {idx === logs.length - 1 && <span className="animate-ping text-accent">|</span>}
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
        Al hacer clic en 'Inicializar', Doki creará el archivo 'project.md' en el sistema local para fijar la contextualización offline.
      </p>
    </div>
  );
};
