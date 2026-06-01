import React, { useState } from "react";
import { useProject } from "../../context/ProjectContext";
import {
  IconHome,
  IconFolder,
  IconSettings,
  IconMenu2,
  IconFileText,
} from "@tabler/icons-react";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { inWorkspace, setInWorkspace, config, fileName } = useProject();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const SidebarItem: React.FC<{
    icon: React.ComponentType<{ size: number; className?: string }>;
    label: string;
    active?: boolean;
    onClick?: () => void;
  }> = ({ icon: Icon, label, active, onClick }) => (
    <button
      onClick={onClick}
      className={`sidebar-btn ${
        sidebarOpen ? "sidebar-btn-expanded" : "sidebar-btn-collapsed"
      } ${
        active
          ? "bg-accent/10 text-accent"
          : "text-text-hint hover:text-text-muted hover:bg-bg3"
      }`}
    >
      <Icon size={28} className="shrink-0" />
      <span className={`transition-all duration-200 leading-tight ${
        sidebarOpen ? "opacity-100 max-h-8" : "opacity-0 max-h-0 overflow-hidden"
      }`}>
        {label}
      </span>
    </button>
  );

  const navItems = [
    { icon: IconHome, label: "Inicio", onClick: () => setInWorkspace(false), active: !inWorkspace },
    { icon: IconFolder, label: "Proyectos", onClick: () => {}, active: false },
  ];

  return (
    <div className="flex h-screen flex-col bg-bg font-mono text-body text-text-main antialiased select-none overflow-hidden">

      {/* NAV */}
      <header className="flex h-14 items-center justify-between border-b border-border-main bg-bg2 px-6 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-text-hint hover:text-text-muted transition-colors"
          >
            <IconMenu2 size={28} />
          </button>
          <span className="text-body font-medium tracking-[0.1em] text-text-muted uppercase">
            Doki
          </span>
        </div>
        <div />
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* SIDEBAR */}
        <aside
          className={`flex flex-col border-r border-border-main bg-bg2 shrink-0 transition-all duration-200 ${
            sidebarOpen ? "w-56" : "w-16"
          }`}
          onMouseEnter={() => setSidebarOpen(true)}
          onMouseLeave={() => setSidebarOpen(false)}
        >
          <nav className="flex flex-col gap-3 p-3 mt-5">
            {navItems.map((item) => (
              <SidebarItem key={item.label} {...item} />
            ))}
          </nav>

          {/* Workspace context */}
          {inWorkspace && (
            <div className="flex-1 px-3 mt-8">
              {fileName && (
                <>
                  {sidebarOpen && (
                    <span className="label-section px-3 mb-4">
                      Documento
                    </span>
                  )}
                  <div className={`flex items-center gap-3 truncate ${
                    sidebarOpen
                      ? "px-3 py-2 text-body text-text-muted"
                      : "justify-center px-0 py-2"
                  }`}>
                    <IconFileText size={22} className="shrink-0 text-accent" />
                    {sidebarOpen && <span className="truncate">{fileName}</span>}
                  </div>
                </>
              )}

              {sidebarOpen && (
                <>
                  <span className="label-section px-3 mt-8 mb-4">
                    Normativa
                  </span>
                  <div className="px-3 py-2 text-body text-text-muted">
                    {config.norm === "apa7" ? "APA 7" : config.norm === "ieee" ? "IEEE" : "Vancouver"} · {config.carrera}
                  </div>

                  <span className="label-section px-3 mt-8 mb-4">
                    Métricas
                  </span>
                  {(["Organización", "Coherencia", "Gramática"] as const).map((label) => (
                    <div key={label} className="px-3 mb-4">
                      <div className="flex justify-between items-center text-body mb-2">
                        <span className="text-text-muted">{label}</span>
                        <span className="text-text-hint">0%</span>
                      </div>
                      <div className="h-2 w-full bg-bg4 rounded-sm overflow-hidden">
                        <div className="h-full w-0 rounded-sm"
                          style={{
                            background: label === "Organización" ? "var(--color-info)" : label === "Coherencia" ? "var(--color-warn)" : "var(--color-danger)"
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Empty state */}
          {!inWorkspace && sidebarOpen && (
            <div className="flex-1 px-3 mt-8">
              <span className="label-section px-3 mb-4">
                Proyectos
              </span>
              <div className="flex flex-col gap-px">
                <div className="px-3 py-2 text-body text-text-hint truncate">
                  Sin proyectos guardados
                </div>
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="p-3 border-t border-border-main mt-auto">
            <SidebarItem icon={IconSettings} label="Configuración" />
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 overflow-hidden bg-bg">
          {children}
        </main>

      </div>
    </div>
  );
};
