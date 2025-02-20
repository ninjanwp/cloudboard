"use client";

import { FaClipboardList } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

export const Header = () => {
  const { user, handleSignOut, signInWithGoogle } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-900/80 backdrop-blur-sm">
      <div className="flex items-center justify-between p-4">
        <h1 className="text-2xl font-bold gap-1 flex justify-center items-center text-white/90">
          OpenBoard<FaClipboardList />
        </h1>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-neutral-200">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="text-sm text-neutral-400 hover:text-neutral-200"
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
