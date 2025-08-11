"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import { usePathname } from "next/navigation";

export type ProjectRole = "owner" | "administrator" | "member";

export type ProjectMember = {
  email: string;
  role: ProjectRole;
  joinedAt: string;
};

export type NavigationPermissions = {
  manage: ProjectRole[]; // Who can access manage page
  chat: ProjectRole[]; // Who can access chat
  calendar: ProjectRole[]; // Who can access calendar
  [key: string]: ProjectRole[]; // Allow for future navigation items
};

export type Project = {
  id: string;
  name: string;
  owner: string;
  ownerEmail: string;
  members: string[];
  memberRoles?: ProjectMember[]; // New field for detailed member info with roles
  icon?: string;
  createdAt: Timestamp;
  openAIApiKey?: string; // Move API key to project level
  navigationPermissions?: NavigationPermissions; // Navigation access control
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
