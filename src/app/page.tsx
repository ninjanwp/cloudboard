"use client";

import { CustomKanban } from "./components/CustomKanban";
import { useProject } from "./context/ProjectContext";

export default function Home() {
  const { selectedProjectId, selectedBoardId } = useProject();

  return (
    <div className="text-white h-screen flex flex-col">
      <div className="flex-grow overflow-auto">
        {selectedProjectId && selectedBoardId ? (
          <CustomKanban
            projectId={selectedProjectId}
            boardId={selectedBoardId}
          />
        ) : (
          <p className="text-neutral-400 p-4 mt-16">
            Select a project from the sidebar to get started.
          </p>
        )}
      </div>
    </div>
  );
}
