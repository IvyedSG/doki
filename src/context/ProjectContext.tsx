import React, { createContext, useContext, useState } from "react";

export type DocType = "tesis" | "informe" | "ensayo" | "monografia";
export type NormType = "apa7" | "ieee" | "vancouver" | "chicago";
export type DetailLevel = "basico" | "intermedio" | "profundo";

export interface ProjectConfig {
  docType: DocType;
  norm: NormType;
  carrera: string;
  detailLevel: DetailLevel;
}

interface ProjectContextType {
  config: ProjectConfig;
  updateConfig: (newConfig: Partial<ProjectConfig>) => void;
  showWizard: boolean;
  setShowWizard: (active: boolean) => void;
  inWorkspace: boolean;
  setInWorkspace: (active: boolean) => void;
  fileName: string | null;
  setFileName: (name: string | null) => void;
  documentText: string | null;
  setDocumentText: (text: string | null) => void;
  resetProject: () => void;
}

const defaultConfig: ProjectConfig = {
  docType: "tesis",
  norm: "apa7",
  carrera: "Ingeniería de Software",
  detailLevel: "profundo",
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<ProjectConfig>(defaultConfig);
  const [showWizard, setShowWizard] = useState(false);
  const [inWorkspace, setInWorkspace] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [documentText, setDocumentText] = useState<string | null>(null);

  const updateConfig = (newConfig: Partial<ProjectConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  };

  const resetProject = () => {
    setConfig(defaultConfig);
    setShowWizard(false);
    setInWorkspace(false);
    setFileName(null);
    setDocumentText(null);
  };

  return (
    <ProjectContext.Provider
      value={{
        config,
        updateConfig,
        showWizard,
        setShowWizard,
        inWorkspace,
        setInWorkspace,
        fileName,
        setFileName,
        documentText,
        setDocumentText,
        resetProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject debe ser utilizado dentro de un ProjectProvider");
  }
  return context;
};
