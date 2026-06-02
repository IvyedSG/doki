import React from "react";
import { ProjectProvider, useProject } from "./context/ProjectContext";
import { AppShell } from "./components/AppShell/AppShell";
import { Landing } from "./components/Landing/Landing";
import { Wizard } from "./components/Wizard/Wizard";
import { Workspace } from "./components/Workspace/Workspace";

const AppContent: React.FC = () => {
  const { inWorkspace, showWizard } = useProject();

  return (
    <AppShell>
      {inWorkspace ? (
        <Workspace />
      ) : (
        <div className="flex items-center justify-center h-full w-full">
          {showWizard ? <Wizard /> : <Landing />}
        </div>
      )}
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
