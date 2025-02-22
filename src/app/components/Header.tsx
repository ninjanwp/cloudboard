"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { FaBell, FaUser, FaChevronDown } from "react-icons/fa6";
import { SignInModal } from "./SignInModal";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";

export const Header = ({ 
  children,
  extraPadding = false 
}: { 
  children?: React.ReactNode;
  extraPadding?: boolean;
}) => {
  const { user, handleSignOut, invitations } = useAuth();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const router = useRouter();
  const [userDisplayName, setUserDisplayName] = useState<string>("");

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
    <header className="fixed w-screen top-0 left-0 z-[100] border-b border-white/10 bg-neutral-950">
      <div className={`flex justify-between items-center h-16 px-3 md:px-4 ${extraPadding ? 'lg:px-12' : ''}`}>
        <Link href="/" className="shrink-0">
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            cloudboard
          </h1>
        </Link>

        <div className="flex-1 flex justify-center mx-2 overflow-hidden">
          <div className="w-full max-w-fit">
            {children}
          </div>
        </div>

        {user ? (
          <div className="flex items-center gap-2 md:gap-4">
            {/* Notifications */}
            <button
              onClick={() => router.push('/notifications')}
              className="relative p-1.5 md:p-2 text-neutral-400 hover:text-neutral-200"
            >
              <FaBell className="w-4 h-4 md:w-5 md:h-5" />
              {invitations.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {invitations.length}
                </span>
              )}
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1 md:gap-2 p-1.5 md:p-2 text-neutral-400 hover:text-neutral-200"
              >
                <FaUser className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm hidden lg:inline">{userDisplayName}</span>
                <FaChevronDown className={`w-3 h-3 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-neutral-800 rounded-lg shadow-lg overflow-hidden z-50"
                  >
                    <Link href="/settings">
                      <div className="px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700 cursor-pointer">
                        Settings
                      </div>
                    </Link>
                    <div
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleSignOut();
                      }}
                      className="px-4 py-2 text-sm text-red-400 hover:bg-neutral-700 cursor-pointer"
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
            className="rounded-lg bg-white/10 px-3 py-1.5 md:px-4 md:py-2 text-sm text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            Log In
          </button>
        )}
      </div>

      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
      />
    </header>
  );
};
