"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { FaBell, FaChevronDown, FaBrain, FaPlus } from "react-icons/fa6";
import { SignInModal } from "./SignInModal";
import { ProjectAI } from "./ProjectAI";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { UserAvatar } from "./UserAvatar";

export const Header = ({
  children,
  extraPadding = false,
  projectId,
}: {
  children?: React.ReactNode;
  extraPadding?: boolean;
  projectId?: string;
}) => {
  const { user, handleSignOut, invitations } = useAuth();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [userDisplayName, setUserDisplayName] = useState<string>("");

  // Only hide logo on specific pages
  const hideLogo = pathname === "/login" || pathname === "/register";

  // Check if we're on the main project board page (where Add Task should appear)
  const isMainBoardPage = projectId && pathname === `/projects/${projectId}`;

  // Detect if on mobile viewport
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.uid) return;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.firstName && data.lastName) {
          setUserDisplayName(`${data.firstName} ${data.lastName}`);
        } else {
          setUserDisplayName(user.email || "");
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  return (
    <header className="fixed w-screen top-0 left-0 z-[100] bg-[var(--surface)]">
      <div
        className={`flex justify-between items-center h-16 px-2 md:px-4 ${
          extraPadding ? "lg:px-12" : ""
        }`}
      >
        {/* Left section: Logo */}
        <div className="flex items-center">
          {/* Show logo except on login/register pages */}
          {!hideLogo && (
            <Link href={user ? "/projects" : "/"} className="shrink-0">
              <h1 className="text-lg md:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                cloudboard
              </h1>
            </Link>
          )}
        </div>

        {/* Middle section: Project navigation and toolbar */}
        <div className={`flex-1 overflow-hidden ${isMobile ? "px-2" : "ml-4"}`}>
          <div className="flex items-center gap-4 w-full max-w-fit mx-auto">
            {children}
            
            {/* Project toolbar buttons - only show on project pages */}
            {projectId && (
              <div className="flex items-center gap-2">
                {/* AI Assistant Button */}
                <button
                  onClick={() => setIsAIOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-sm text-sm"
                >
                  <FaBrain className="text-xs" />
                  {!isMobile && <span className="font-medium">AI</span>}
                </button>

                {/* Add Task Button - only show on main board page */}
                {isMainBoardPage && (
                  <button 
                    className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-all duration-200 font-medium text-sm"
                    onClick={() => {
                      // Trigger custom event that the CustomKanban can listen to
                      window.dispatchEvent(new CustomEvent('openAddTaskModal'));
                    }}
                  >
                    <FaPlus className="text-xs" />
                    {!isMobile && <span>Task</span>}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right section: Notifications and user menu */}
        {user ? (
          <div className="flex items-center gap-1 md:gap-4">
            {/* Notifications */}
            <button
              onClick={() => router.push("/notifications")}
              className="relative p-1 md:p-1.5 text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] rounded transition-colors"
            >
              <motion.div
              initial={{ rotate: 0 }}
              whileHover={{ rotate: [0, -5, 5, -5, 5, -5, 0] }}
              >
                <FaBell className="w-4 h-4 md:w-5 md:h-5" />
              </motion.div>

              {invitations.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-3 h-3 md:w-4 md:h-4 flex items-center justify-center">
                  {invitations.length}
                </span>
              )}
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1 md:gap-2 p-1 md:p-1.5 text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] rounded transition-colors"
              >
                <UserAvatar
                  email={user.email || ""}
                  displayName={userDisplayName}
                  size="sm"
                  className="w-7 h-7"
                />
                <span className="text-sm hidden lg:inline">
                  {userDisplayName}
                </span>
                {!isMobile && (
                  <FaChevronDown
                    className={`w-3 h-3 transition-transform ${
                      isUserMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                )}
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-[var(--surface)] rounded-lg shadow-lg overflow-hidden z-50"
                  >
                    <Link href="/settings">
                      <div className="px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-hover)] cursor-pointer">
                        Settings
                      </div>
                    </Link>
                    <div
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleSignOut();
                      }}
                      className="px-4 py-2 text-sm text-red-400 hover:bg-[var(--surface-hover)] cursor-pointer"
                    >
                      Log Out
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsSignInModalOpen(true)}
            className="rounded-lg bg-white/10 px-3 py-1.5 md:px-4 md:py-2 text-sm text-[var(--text)] backdrop-blur-sm transition hover:bg-[var(--surface-hover)]"
          >
            Log In
          </button>
        )}
      </div>

      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
      />
      
      {/* AI Assistant Modal */}
      {projectId && (
        <ProjectAI
          projectId={projectId}
          isOpen={isAIOpen}
          onClose={() => setIsAIOpen(false)}
        />
      )}
    </header>
  );
};
