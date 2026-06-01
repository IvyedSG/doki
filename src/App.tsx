import React from "react";
import { ProjectProvider, useProject } from "./context/ProjectContext";
import { AppShell } from "./components/AppShell/AppShell";
import { Landing } from "./components/Landing/Landing";
import { Workspace } from "./components/Workspace/Workspace";

const AppContent: React.FC = () => {
  const { inWorkspace } = useProject();

  return (
    <AppShell>
      {inWorkspace ? <Workspace /> : <Landing />}
    </AppShell>
  );
};

function App() {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
}

export default App;
