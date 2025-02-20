"use client";

import React, { useState, FormEvent } from "react";
import { Modal } from "./Modal";
import { useAuth } from "../context/AuthContext";

type SignInModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const SignInModal = ({ isOpen, onClose }: SignInModalProps) => {
  const { signInWithGoogle, signInWithEmailPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailSignIn = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailPassword(email, password);
      onClose();
    } catch (error) {
      console.error("Error signing in with email/password", error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4 p-4">
        <h2 className="text-2xl font-bold text-neutral-100">Sign In</h2>
        <button
          onClick={signInWithGoogle}
          className="w-full rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Sign in with Google
        </button>
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-neutral-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-neutral-700 bg-neutral-900 p-2 text-neutral-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-neutral-700 bg-neutral-900 p-2 text-neutral-100"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-blue-500 px-3 py-1.5 text-xs text-white hover:bg-blue-600"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
