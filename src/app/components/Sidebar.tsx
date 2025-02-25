"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../../firebase";
import { FiPlus, FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import { Modal } from "./Modal";
import { IconSelector } from "./IconSelector";
import * as FaIcons from "react-icons/fa6";
import { useRouter } from "next/navigation";
import { useProject } from "../context/ProjectContext";

type ProjectType = {
  id: string;
  name: string;
  owner: string;
  members: string[];
  icon?: string;
};

type IconProps = {
  className?: string;
};

export const Sidebar = ({
  onCollapsedChange,
  defaultCollapsed = false,
  isMobile = false,
  isOpen = false,
  onClose = () => {},
}: {
  onCollapsedChange: (collapsed: boolean) => void;
  defaultCollapsed?: boolean;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}) => {
  const { user, createProject } = useAuth();
  const { selectedProjectId, setSelectedProjectId } = useProject();
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [projectIcon, setProjectIcon] = useState("FaStar");
  const router = useRouter();

  useEffect(() => {
    if (!user?.email) return;

    const projectsRef = collection(db, "projects");
    const q = query(
      projectsRef,
      where("members", "array-contains", user.email)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const projectsData: ProjectType[] = [];
        snapshot.forEach((doc) => {
          projectsData.push({ id: doc.id, ...doc.data() } as ProjectType);
        });
        setProjects(projectsData);
      },
      (error) => {
        // Ignore permission-denied errors that might occur when a project is deleted
        if (error.code !== "permission-denied") {
          console.error("Error fetching projects:", error);
        }
      }
    );

    return () => unsubscribe();
  }, [user?.email]);

  useEffect(() => {
    onCollapsedChange(defaultCollapsed);
  }, [defaultCollapsed, onCollapsedChange]);

  const handleCreateProject = async () => {
    console.log("Creating project with name:", projectName); // Add logging
    await createProject(projectName, projectIcon);
    setProjectName("");
    setProjectIcon("FaStar");
    setIsModalOpen(false);
    console.log("Project created successfully"); // Add logging
  };

  const handleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapsedChange(newState);
  };

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    router.push(`/projects/${projectId}`);
    if (isMobile) {
      onClose(); // Close sidebar on mobile after selecting a project
    }
  };

  // Mobile sidebar with overlay
  if (isMobile) {
    return (
      <>
        {/* Backdrop overlay when sidebar is open */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
          />
        )}
        
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="text-[var(--text)] h-[calc(100vh-4rem)] flex flex-col fixed top-16 left-0 z-50 border-r border-white/10 bg-[var(--surface)] overflow-hidden w-[80%] max-w-xs"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
            >
              <div className="p-3 flex items-center justify-between h-[60px] border-b border-[var(--surface)]">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex text-nowrap items-center justify-center gap-2 p-2 btn-accent rounded flex-grow mr-2"
                >
                  <FiPlus />
                  <span className="text-xs font-medium">Create Project</span>
                </button>
                
                <motion.button
                  onClick={onClose}
                  className="grid h-10 w-10 place-content-center text-lg border-transparent hover:bg-neutral-800 border hover:border-neutral-600 rounded transition-colors text-neutral-400 hover:text-neutral-200"
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ backgroundColor: "rgba(75, 75, 75, 0.5)" }}
                  transition={{ duration: 0.2 }}
                >
                  <FiX />
                </motion.button>
              </div>

              <div className="flex-grow min-h-0 overflow-y-auto overflow-x-hidden">
                {projects.map((project) => (
                  // ...existing project list rendering code...
                  <div
                    key={project.id}
                    className="relative"
                  >
                    <div
                      className={`p-3 flex items-center cursor-pointer border-l-4 transition-colors
                        ${
                          selectedProjectId === project.id
                            ? "text-[var(--text)] border-[var(--accent)]"
                            : "text-[var(--text-secondary)] hover:text-[var(--text)] border-transparent"
                        }`}
                      onClick={() => handleProjectSelect(project.id)}
                    >
                      {/* Project Icon and Name */}
                      <div className="flex items-center gap-3 justify-start">
                        <div className="w-8 h-8 flex items-center justify-center">
                          {project.icon &&
                          (FaIcons as Record<string, React.ComponentType<IconProps>>)[
                            project.icon
                          ] ? (
                            <span className="flex items-center justify-center">
                              {React.createElement(
                                (FaIcons as Record<string, React.ComponentType<IconProps>>)[project.icon],
                                { className: "w-5 h-5" }
                              )}
                            </span>
                          ) : (
                            <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-base font-medium">
                              {project.name[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="text-md font-medium text-nowrap">
                          {project.name}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Create Project Modal */}
              <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-[var(--text)]">Create Project</h2>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Project Name"
                    className="w-full p-2 rounded bg-[var(--surface)] text-[var(--text)]"
                  />
                  <div>
                    <label className="block mb-2 text-sm text-[var(--text-secondary)]">
                      Project Icon
                    </label>
                    <IconSelector
                      selectedIcon={projectIcon}
                      setSelectedIcon={setProjectIcon}
                    />
                  </div>
                  <button
                    onClick={handleCreateProject}
                    className="w-full p-2 btn-accent rounded"
                  >
                    Create
                  </button>
                </div>
              </Modal>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Default desktop sidebar
  return (
    <motion.div
      className="text-[var(--text)] h-[calc(100vh-4rem)] flex flex-col fixed top-16 left-0 z-50 bg-gradient-to-b from-[var(--surface)] to-[var(--background)] overflow-hidden"
      initial={{ width: 256 }}
      animate={{ width: isCollapsed ? 64 : 256 }}
      layout
    >
      {/* Header Section with Create Project and Expand buttons */}
      <motion.div
      layout
      className="p-3 flex items-center justify-between h-[60px] border-b border-[var(--surface)]"
      >
      <AnimatePresence mode="popLayout">
        {!isCollapsed && (
        <motion.button
          layout
          onClick={() => setIsModalOpen(true)}
          className="flex text-nowrap items-center justify-center gap-2 p-2 btn-accent rounded flex-grow mr-2"
        >
          <FiPlus />
          <motion.span layout className="text-xs font-medium">
          Create Project
          </motion.span>
        </motion.button>
        )}
      </AnimatePresence>

      <motion.button
        layout="preserve-aspect"
        onClick={handleCollapse}
        className="grid h-10 w-10 place-content-center text-lg border-transparent hover:bg-neutral-800 border hover:border-neutral-600 rounded transition-colors text-neutral-400 hover:text-neutral-200"
      >
        {isCollapsed ? (
        <FiChevronRight className="transition-transform" />
        ) : (
        <FiChevronLeft className="transition-transform" />
        )}
      </motion.button>
      </motion.div>

      {/* Projects List */}
      <motion.div layout className="flex-grow min-h-0 overflow-y-auto overflow-x-hidden">
      {projects.map((project) => (
        <motion.div
        key={project.id}
        layout
        className="relative"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.125 }}
        >
        <motion.div
          layout
          className={`p-3 flex items-center cursor-pointer border-l-4 transition-colors
          ${
            selectedProjectId === project.id
            ? "text-[var(--text)] border-[var(--accent)]"
            : "text-[var(--text-secondary)] hover:text-[var(--text)] border-transparent"
          }`}
          onClick={() => handleProjectSelect(project.id)}
        >
          {/* Project Icon and Name */}
          <div className="flex items-center gap-3 justify-start">
          <motion.div
            layout="preserve-aspect"
            className="w-8 h-8 flex items-center justify-center"
          >
            {project.icon &&
            (FaIcons as Record<string, React.ComponentType<IconProps>>)[
            project.icon
            ] ? (
            <span className="flex items-center justify-center">
              {React.createElement(
              (
                FaIcons as Record<
                string,
                React.ComponentType<IconProps>
                >
              )[project.icon],
              {
                className: "w-5 h-5",
              }
              )}
            </span>
            ) : (
            <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-base font-medium">
              {project.name[0].toUpperCase()}
            </span>
            )}
          </motion.div>

          {!isCollapsed && (
            <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            layout
            className="text-md font-medium text-nowrap"
            >
            {project.name}
            </motion.span>
          )}
          </div>
        </motion.div>
        </motion.div>
      ))}
      </motion.div>

      {/* Create Project Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[var(--text)]">Create Project</h2>
        <input
        type="text"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        placeholder="Project Name"
        className="w-full p-2 rounded bg-[var(--surface)] text-[var(--text)]"
        />
        <div>
        <label className="block mb-2 text-sm text-[var(--text-secondary)]">
          Project Icon
        </label>
        <IconSelector
          selectedIcon={projectIcon}
          setSelectedIcon={setProjectIcon}
        />
        </div>
        <button
        onClick={handleCreateProject}
        className="w-full p-2 btn-accent rounded"
        >
        Create
        </button>
      </div>
      </Modal>
    </motion.div>
  );
};
