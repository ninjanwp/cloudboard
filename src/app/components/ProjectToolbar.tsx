"use client";

import React, { useState } from "react";
import { FaBrain, FaPlus } from "react-icons/fa6";
import { ProjectAI } from "./ProjectAI";
import { usePathname } from "next/navigation";

interface ProjectToolbarProps {
  projectId: string;
  className?: string;
}

export const ProjectToolbar: React.FC<ProjectToolbarProps> = ({ 
  projectId
}) => {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const pathname = usePathname();
  
  // Check if we're on the main project board page (where Add Task should appear)
  const isMainBoardPage = pathname === `/projects/${projectId}`;

  // Debug logging
  console.log('ProjectToolbar render:', { projectId, pathname, isMainBoardPage });

  return (
    <>
      <div className="bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between shadow-sm" style={{minHeight: '60px'}}>
        {/* Left side - Main actions */}
        <div className="flex items-center gap-3">
          {/* AI Assistant Button */}
          <button
            onClick={() => setIsAIOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-sm"
          >
            <FaBrain className="text-sm" />
            <span className="text-sm font-medium">AI Assistant</span>
          </button>

          {/* Add Task Button - only show on main board page */}
          {isMainBoardPage && (
            <button 
              className="flex items-center gap-2 px-3 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-all duration-200 font-medium"
              onClick={() => {
                // We'll trigger a custom event that the CustomKanban can listen to
                window.dispatchEvent(new CustomEvent('openAddTaskModal'));
              }}
            >
              <FaPlus className="text-sm" />
              <span className="text-sm font-medium">New Task</span>
            </button>
          )}
        </div>

        {/* Right side - Could add more actions here in the future */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-secondary)]">Project Toolbar</span>
        </div>
      </div>

      {/* AI Assistant Modal */}
      <ProjectAI
        projectId={projectId}
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
      />
    </>
  );
};
