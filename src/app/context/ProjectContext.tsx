"use client";

import React, { createContext, useContext, useState } from "react";

type ProjectContextType = {
  selectedProjectId: string | null;
  selectedBoardId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  setSelectedBoardId: (id: string | null) => void;
  handleProjectSelect: (projectId: string, boardId: string) => void;
};

const ProjectContext = createContext<ProjectContextType>({
  selectedProjectId: null,
  selectedBoardId: null,
  setSelectedProjectId: () => {},
  setSelectedBoardId: () => {},
  handleProjectSelect: () => {},
});

export const ProjectProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  const handleProjectSelect = (projectId: string, boardId: string) => {
    setSelectedProjectId(projectId);
    setSelectedBoardId(boardId);
  };

  return (
    <ProjectContext.Provider
      value={{
        selectedProjectId,
        selectedBoardId,
        setSelectedProjectId,
        setSelectedBoardId,
        handleProjectSelect,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => useContext(ProjectContext);
