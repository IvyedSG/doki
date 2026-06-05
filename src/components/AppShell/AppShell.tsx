import React from "react";
import { useProject } from "../../context/ProjectContext";
import { useHealthCheck } from "../../services/health";
import {
  IconHome,
  IconFolder,
  IconSettings,
  IconFileText,
  IconCpu,
  IconLock,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconLayoutSidebarRightCollapse,
  IconLayoutSidebarRightExpand,
} from "@tabler/icons-react";
import logoSource from "../../assets/doki_source_logo.png";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { inWorkspace, setInWorkspace, fileName, showChat, setShowChat, showFeedback, setShowFeedback } =
    useProject();
  const health = useHealthCheck();

  const statusColor = health.ok ? health.color : "bg-danger";
  const statusText = health.ok ? health.mensaje : "Desconectado";

  return (
    <div className="flex h-screen bg-bg font-mono text-body text-text-main antialiased select-none overflow-hidden">

      {/* SIDEBAR */}
      <aside className="w-14 bg-bg2 border-r border-border-main flex flex-col items-center py-4 shrink-0">
        <div className="mb-6">
          <img src={logoSource} alt="Doki" className="w-7 h-7" />
        </div>

        <nav className="flex flex-col items-center gap-3 flex-1">
          <button
            onClick={() => setInWorkspace(false)}
            title="Inicio"
            className={`h-10 w-10 flex items-center justify-center rounded-rad transition-all duration-150 ${
              !inWorkspace
                ? "bg-accent/10 text-accent"
                : "text-text-hint hover:text-text-muted hover:bg-bg3"
            }`}
          >
            <IconHome size={22} />
          </button>

          <button
            title="Proyectos"
            className="h-10 w-10 flex items-center justify-center rounded-rad text-text-hint hover:text-text-muted hover:bg-bg3 transition-all duration-150"
          >
            <IconFolder size={22} />
          </button>
        </nav>

        <div className="flex flex-col items-center">
          <button
            title="Configuración"
            className="h-10 w-10 flex items-center justify-center rounded-rad text-text-hint hover:text-text-muted hover:bg-bg3 transition-all duration-150"
          >
            <IconSettings size={22} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden bg-bg">
        {inWorkspace && (
          <header className="flex h-12 items-center gap-3 bg-bg2 border-b border-border-main px-5 shrink-0">
            <IconFileText size={20} className="text-text-hint shrink-0" />
            <span className="text-body text-text-muted truncate">
              {fileName ?? "Sin documento"}
            </span>

            {/* Toggles de paneles (estilo VS Code): ocultar/mostrar chat y retroalimentación */}
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setShowChat(!showChat)}
                title={showChat ? "Ocultar chat" : "Mostrar chat"}
                className={`h-8 w-8 flex items-center justify-center rounded-rad transition-all duration-150 ${
                  showChat ? "text-accent hover:bg-bg3" : "text-text-hint hover:text-text-muted hover:bg-bg3"
                }`}
              >
                {showChat ? <IconLayoutSidebarLeftCollapse size={19} /> : <IconLayoutSidebarLeftExpand size={19} />}
              </button>
              <button
                onClick={() => setShowFeedback(!showFeedback)}
                title={showFeedback ? "Ocultar retroalimentación" : "Mostrar retroalimentación"}
                className={`h-8 w-8 flex items-center justify-center rounded-rad transition-all duration-150 ${
                  showFeedback ? "text-accent hover:bg-bg3" : "text-text-hint hover:text-text-muted hover:bg-bg3"
                }`}
              >
                {showFeedback ? <IconLayoutSidebarRightCollapse size={19} /> : <IconLayoutSidebarRightExpand size={19} />}
              </button>
            </div>
          </header>
        )}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>

        {/* Bottom bar — status */}
        <div className="h-7 bg-bg2 border-t border-border-main flex items-center gap-4 px-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${statusColor} ${!health.modeloListo && health.ok ? "animate-pulse" : ""}`} />
            <span className="text-[10px] text-text-hint">{statusText}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[10px] text-text-hint flex items-center gap-1">
              <IconCpu size={10} /> Local
            </span>
            <span className="text-[10px] text-text-hint flex items-center gap-1">
              <IconLock size={10} /> Offline
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
