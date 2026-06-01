import React from "react";
import { useProject } from "../../context/ProjectContext";
import {
  IconHome,
  IconFolder,
  IconSettings,
  IconFileText,
} from "@tabler/icons-react";
import logoSource from "../../assets/doki_source_logo.png";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { inWorkspace, setInWorkspace, fileName } = useProject();

  return (
    <div className="flex h-screen bg-bg font-mono text-body text-text-main antialiased select-none overflow-hidden">

      {/* SIDEBAR - Fixed icons (Claude style) */}
      <aside className="w-14 bg-bg2 border-r border-border-main flex flex-col items-center py-4 shrink-0">
        {/* Logo */}
        <div className="mb-6">
          <img src={logoSource} alt="Doki" className="w-7 h-7" />
        </div>

        {/* Primary nav */}
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

        {/* Bottom section */}
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
          </header>
        )}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};
