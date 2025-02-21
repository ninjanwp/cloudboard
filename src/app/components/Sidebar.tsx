"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../firebase";
import {
  FiPlus,
  FiMoreVertical,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { Modal } from "./Modal";
import { IconSelector } from "./IconSelector";
import * as FaIcons from "react-icons/fa6";
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
}: {
  onCollapsedChange: (collapsed: boolean) => void;
}) => {
  const {
    user,
    createProject,
    inviteUserToProject,
    deleteProject,
    leaveProject,
    removeUserFromProject,
  } = useAuth();
  const { selectedProjectId, handleProjectSelect } = useProject();
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteProjectId, setInviteProjectId] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [projectIcon, setProjectIcon] = useState("FaStar");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configProject, setConfigProject] = useState<ProjectType | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectIcon, setEditProjectIcon] = useState("");

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

  const handleCreateProject = async () => {
    console.log("Creating project with name:", projectName); // Add logging
    await createProject(projectName, projectIcon);
    setProjectName("");
    setProjectIcon("FaStar");
    setIsModalOpen(false);
    console.log("Project created successfully"); // Add logging
  };

  const handleInviteUser = async () => {
    console.log(
      "Inviting user with email:",
      inviteEmail,
      "to project:",
      inviteProjectId
    );
    await inviteUserToProject(inviteProjectId, inviteEmail);
    setInviteEmail("");
    console.log("User invited successfully");
  };

  const handleDeleteProject = async (
    e: React.MouseEvent,
    projectId: string
  ) => {
    e.stopPropagation();
    if (
      confirm(
        "Are you sure you want to delete this project? This action cannot be undone."
      )
    ) {
      try {
        await deleteProject(projectId);
        setActiveMenu(null);
      } catch (error) {
        console.error("Error deleting project:", error);
      }
    }
  };

  const handleLeaveProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to leave this project?")) {
      try {
        await leaveProject(projectId);
        setActiveMenu(null);
        // Optionally, clear the selected project if it's the one being left
        if (selectedProjectId === projectId) {
          handleProjectSelect("", "");
        }
      } catch (error) {
        console.error("Error leaving project:", error);
        alert("Failed to leave project. Please try again.");
      }
    }
  };

  const handleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapsedChange(newState);
  };

  const handleProjectMenu = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === projectId ? null : projectId);
  };

  const handleUpdateProject = async () => {
    if (!configProject) return;

    const projectRef = doc(db, "projects", configProject.id);
    await updateDoc(projectRef, {
      name: editProjectName,
      icon: editProjectIcon,
    });

    setIsConfigModalOpen(false);
    setConfigProject(null);
  };

  const handleRemoveMember = async (projectId: string, email: string) => {
    if (confirm(`Are you sure you want to remove ${email} from the project?`)) {
      try {
        await removeUserFromProject(projectId, email);
      } catch (error) {
        console.error("Error removing member:", error);
        alert("Failed to remove member. Please try again.");
      }
    }
  };

  return (
    <motion.div
      className="bg-neutral-950 text-white h-[calc(100vh-4rem)] flex flex-col fixed left-0 z-40"
      initial={{ width: 256 }}
      animate={{ width: isCollapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="p-3 flex items-center justify-between h-[60px] border-b border-neutral-700">
        <AnimatePresence mode="popLayout">
          {!isCollapsed ? (
            <motion.button
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              onClick={() => setIsModalOpen(true)}
              className="flex text-nowrap items-center justify-center gap-2 p-2 bg-blue-500 rounded text-white flex-grow mr-2"
            >
              <FiPlus />
              <span>New Project</span>
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="flex-grow"
            />
          )}
        </AnimatePresence>
        <motion.button
          layout
          onClick={handleCollapse}
          className="p-2 hover:bg-neutral-800 rounded text-2xl shrink-0"
        >
          {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </motion.button>
      </div>
      <motion.div layout className="flex-grow overflow-auto">
        {projects.map((project) => (
          <div key={project.id} className="relative">
            <div
              className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${
                selectedProjectId === project.id
                  ? "bg-blue-950 border-blue-500 font-medium"
                  : "hover:bg-neutral-800 border-b-neutral-700"
              }`}
              onClick={() => handleProjectSelect(project.id, "default-board-id")}
            >
              {isCollapsed ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full h-full flex items-center justify-center"
                >
                  {project.icon && (FaIcons as Record<string, React.ComponentType<IconProps>>)[project.icon] ? (
                    <span className="w-8 h-8 flex items-center justify-center">
                      {React.createElement((FaIcons as Record<string, React.ComponentType<IconProps>>)[project.icon], {
                        className: "w-8 h-8"
                      })}
                    </span>
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-base font-medium">
                      {project.name[0].toUpperCase()}
                    </span>
                  )}
                </motion.span>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-between items-center w-full min-w-0"
                >
                  <div className="flex items-center gap-3 truncate">
                    {project.icon && (FaIcons as Record<string, React.ComponentType<IconProps>>)[project.icon] ? (
                      <span className="w-8 h-8 flex items-center justify-center">
                        {React.createElement((FaIcons as Record<string, React.ComponentType<IconProps>>)[project.icon], {
                          className: "w-8 h-8",
                        })}
                      </span>
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-base font-medium">
                        {project.name[0].toUpperCase()}
                      </span>
                    )}
                    <span className="truncate">{project.name}</span>
                  </div>
                  <button
                    onClick={(e) => handleProjectMenu(e, project.id)}
                    className="text-neutral-400 hover:text-neutral-200 shrink-0"
                  >
                    <FiMoreVertical />
                  </button>
                </motion.div>
              )}
            </div>
            {!isCollapsed && activeMenu === project.id && (
              <div className="absolute right-0 mt-2 w-48 bg-neutral-800 rounded shadow-lg z-50">
                {project.owner === user?.uid && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfigProject(project);
                      setEditProjectName(project.name);
                      setEditProjectIcon(project.icon || "");
                      setIsConfigModalOpen(true);
                      setActiveMenu(null);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
                  >
                    Configure Project
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setInviteProjectId(project.id);
                    setActiveMenu(null);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
                >
                  Invite User
                </button>
                {project.owner === user?.uid ? (
                  <button
                    onClick={(e) => handleDeleteProject(e, project.id)}
                    className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-neutral-700"
                  >
                    Delete Project
                  </button>
                ) : (
                  <button
                    onClick={(e) => handleLeaveProject(e, project.id)}
                    className="block w-full text-left px-4 py-2 text-sm text-yellow-400 hover:bg-neutral-700"
                  >
                    Leave Project
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </motion.div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-neutral-100">Create Project</h2>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project Name"
            className="w-full p-2 rounded bg-neutral-800 text-neutral-100"
          />
          <div>
            <label className="block mb-2 text-sm text-neutral-400">
              Project Icon
            </label>
            <IconSelector
              selectedIcon={projectIcon}
              setSelectedIcon={setProjectIcon}
            />
          </div>
          <button
            onClick={handleCreateProject}
            className="w-full p-2 bg-blue-500 rounded text-white"
          >
            Create
          </button>
        </div>
      </Modal>
      {inviteProjectId && (
        <Modal
          isOpen={!!inviteProjectId}
          onClose={() => setInviteProjectId("")}
        >
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-100">
              Invite User to Project
            </h2>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="User Email"
              className="w-full p-2 rounded bg-neutral-800 text-neutral-100"
            />
            <button
              onClick={handleInviteUser}
              className="w-full p-2 bg-blue-500 rounded text-white"
            >
              Invite
            </button>
          </div>
        </Modal>
      )}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      >
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-neutral-100">
            Configure Project
          </h2>
          <div className="space-y-4">
            <input
              type="text"
              value={editProjectName}
              onChange={(e) => setEditProjectName(e.target.value)}
              placeholder="Project Name"
              className="w-full p-2 rounded bg-neutral-800 text-neutral-100"
            />
            <div>
              <label className="block mb-2 text-sm text-neutral-400">
                Project Icon
              </label>
              <IconSelector
                selectedIcon={editProjectIcon}
                setSelectedIcon={setEditProjectIcon}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-neutral-100">Members</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {configProject?.members.map((member) => (
                <div
                  key={member}
                  className="flex items-center justify-between p-2 bg-neutral-800 rounded"
                >
                  <span className="text-neutral-200">{member}</span>
                  {configProject.owner === user?.uid &&
                    member !== user?.email && (
                      <button
                        onClick={() =>
                          handleRemoveMember(configProject.id, member)
                        }
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                </div>
              ))}
            </div>

            {configProject?.owner === user?.uid && (
              <div className="pt-4 border-t border-neutral-700">
                <button
                  onClick={() => {
                    if (configProject) {
                      setInviteProjectId(configProject.id);
                    }
                    setIsConfigModalOpen(false);
                  }}
                  className="w-full p-2 bg-blue-500 rounded text-white"
                >
                  Invite New Member
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleUpdateProject}
            className="w-full p-2 bg-green-600 rounded text-white"
          >
            Update Project
          </button>
        </div>
      </Modal>
    </motion.div>
  );
};
