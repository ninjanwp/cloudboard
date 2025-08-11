"use client";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { FaUser } from "react-icons/fa";
import Link from "next/link";

export const Profile = () => {
  const { user, handleSignOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-200"
      >
        <FaUser className="text-xl" />
        <span>{user?.email}</span>
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
  );
};
