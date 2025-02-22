"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../../../firebase";

export type Project = {
  id: string;
  name: string;
  owner: string;
  ownerEmail: string;
  members: string[];
  icon?: string;
  createdAt: Timestamp;
};

type ProjectContextType = {
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
};

const ProjectContext = createContext<ProjectContextType>({
  currentProject: null,
  setCurrentProject: () => {},
  selectedProjectId: null,
  setSelectedProjectId: () => {},
});

export const ProjectProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProjectId) {
      setCurrentProject(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "projects", selectedProjectId),
      (doc) => {
        if (doc.exists()) {
          setCurrentProject({ id: doc.id, ...doc.data() } as Project);
        } else {
          // Project no longer exists
          setCurrentProject(null);
          setSelectedProjectId(null);
        }
      },
      (error) => {
        // Handle permission errors quietly
        if (error.code === 'permission-denied') {
          setCurrentProject(null);
          setSelectedProjectId(null);
        } else {
          console.error("Error fetching project:", error);
        }
      }
    );

    return () => unsubscribe();
  }, [selectedProjectId]);

  return (
    <ProjectContext.Provider 
      value={{ 
        currentProject, 
        setCurrentProject,
        selectedProjectId,
        setSelectedProjectId
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => useContext(ProjectContext);
