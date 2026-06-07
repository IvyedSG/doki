import React from "react";
import { ProjectProvider, useProject } from "./context/ProjectContext";
import { AppShell } from "./components/AppShell/AppShell";
import { Landing } from "./components/Landing/Landing";
import { Workspace } from "./components/Workspace/Workspace";

const AppContent: React.FC = () => {
  const { inWorkspace } = useProject();

  return (
    <AppShell>
      {inWorkspace ? (
        <Workspace />
      ) : (
        <div className="flex items-center justify-center h-full w-full">
          <Landing />
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
