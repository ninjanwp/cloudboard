"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { LoadingScreen } from "../components/LoadingScreen";
import { motion } from "framer-motion";
import { FiArrowLeft } from "react-icons/fi";
import { Modal } from "../components/Modal";
import { IconSelector } from "../components/IconSelector";
import { FaCloud } from "react-icons/fa6";

export default function ProjectsPage() {
  const router = useRouter();
  const { user, loading, createProject } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectIcon, setProjectIcon] = useState("FaStar");

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  const handleCreateProject = async () => {
    if (projectName.trim()) {
      await createProject(projectName, projectIcon);
      setProjectName("");
      setProjectIcon("FaStar");
      setIsModalOpen(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center justify-center h-full">
      <motion.div 
        className="text-center max-w-md px-6 py-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="mx-auto mb-8 bg-gradient-to-br from-blue-500/20 to-purple-500/20 w-24 h-24 rounded-full flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaCloud className="text-[var(--accent)] w-12 h-12" />
        </motion.div>
        
        <h1 className="text-3xl font-bold text-[var(--text)] mb-4">Welcome to CloudBoard</h1>
        
        <p className="text-[var(--text-secondary)] text-lg mb-8">
          Select an existing project or create a new one to get started with your boards.
        </p>
        
        <div className="flex flex-col space-y-4 items-center">
          <motion.div
            className="flex items-center gap-2 text-[var(--text-secondary)]"
            initial={{ x: -5, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <FiArrowLeft className="animate-pulse" />
            <span>Select a project from the sidebar</span>
          </motion.div>
          
          <motion.button
            className="px-6 py-3 btn-accent rounded-lg font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsModalOpen(true)}
          >
            Create New Project
          </motion.button>
        </div>
        
        <p className="mt-8 text-sm text-[var(--text-secondary)] opacity-70">
          Organize your tasks, notes, and ideas in one place
        </p>
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
            autoFocus
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
    </div>
  );
}
