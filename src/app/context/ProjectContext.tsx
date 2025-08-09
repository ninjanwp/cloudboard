"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();

  // Auto-detect project ID from URL on mount and route changes
  useEffect(() => {
    const pathSegments = pathname.split('/');
    if (pathSegments[1] === 'projects' && pathSegments[2] && pathSegments[2] !== selectedProjectId) {
      setSelectedProjectId(pathSegments[2]);
    }
  }, [pathname, selectedProjectId]);

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
