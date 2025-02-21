"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { FaCloud, FaUser, FaBell } from "react-icons/fa6";
import { SignInModal } from "./SignInModal";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Add this import

export const Header = () => {
  const { user, handleSignOut, invitations } = useAuth();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter(); // Add this

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setIsDropdownOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNotificationsClick = () => {
    router.push("/notifications");
  };

  return (
    <header className="fixed w-full top-0 left-0 z-50 border-b border-white/10 bg-neutral-950">
      <div className="flex items-center justify-between p-4">
        <Link href="/">
          <h1 className="text-2xl font-bold gap-1 flex justify-center items-center text-white/90 hover:text-white">
            CloudBoard
            <FaCloud />
          </h1>
        </Link>
        <div className="flex items-center gap-4">
          {user && (
            <button onClick={handleNotificationsClick} className="relative">
              <FaBell className="text-xl text-neutral-400 hover:text-neutral-200" />
              {invitations.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {invitations.length}
                </span>
              )}
            </button>
          )}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={toggleDropdown}
                className="flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-200"
              >
                <FaUser className="text-xl" />
                <span>{user.email}</span>
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-neutral-800 rounded shadow-lg">
                  <Link href="/settings" legacyBehavior>
                    <a className="block px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700">
                      Settings
                    </a>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsSignInModalOpen(true)}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Log In
            </button>
          )}
        </div>
      </div>
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
      />
    </header>
  );
};
