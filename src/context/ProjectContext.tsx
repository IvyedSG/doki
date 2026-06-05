import React, { createContext, useContext, useState } from "react";

export type DocType = "tesis" | "proyecto" | "informe" | "ensayo" | "monografia";
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
  // Bytes crudos del .docx (para el render fiel con docx-preview). null si es .txt/.md/demo.
  docxBuffer: ArrayBuffer | null;
  setDocxBuffer: (buf: ArrayBuffer | null) => void;
  // Paneles ocultables (estilo VS Code): chat (izq) y retroalimentación (der).
  showChat: boolean;
  setShowChat: (v: boolean) => void;
  showFeedback: boolean;
  setShowFeedback: (v: boolean) => void;
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
  const [docxBuffer, setDocxBuffer] = useState<ArrayBuffer | null>(null);
  const [showChat, setShowChat] = useState(true);
  const [showFeedback, setShowFeedback] = useState(true);

  const updateConfig = (newConfig: Partial<ProjectConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  };

  const resetProject = () => {
    setConfig(defaultConfig);
    setShowWizard(false);
    setInWorkspace(false);
    setFileName(null);
    setDocumentText(null);
    setDocxBuffer(null);
    setShowChat(true);
    setShowFeedback(true);
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
        docxBuffer,
        setDocxBuffer,
        showChat,
        setShowChat,
        showFeedback,
        setShowFeedback,
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
