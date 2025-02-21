"use client";

import React, { useState, FormEvent } from "react";
import { Modal } from "./Modal";
import { useAuth } from "../context/AuthContext";
import { FaGoogle } from "react-icons/fa6";
import { SignUpModal } from "./SignUpModal"; // Import SignUpModal

type SignInModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const SignInModal = ({ isOpen, onClose }: SignInModalProps) => {
  const { signInWithGoogle, signInWithEmailPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false); // State for sign-up modal

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
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="space-y-4 p-4 bg-neutral-800 rounded-lg w-full max-w-md">
          <h2 className="text-2xl font-bold text-neutral-100 w-full text-center">
            Sign In
          </h2>
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-neutral-400">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-neutral-700 bg-neutral-900 p-2 text-neutral-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-400">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-neutral-700 bg-neutral-900 p-2 text-neutral-100"
              />
            </div>
            <div className="flex flex-col gap-6">
              <button
                type="submit"
                className="rounded-lg bg-blue-500 p-2 text-white hover:bg-blue-600"
              >
                Sign In
              </button>

              <button
                type="button" // Change to type="button" to prevent form submission
                onClick={signInWithGoogle}
                className="w-full rounded-lg bg-neutral-900 p-4 text-white hover:bg-neutral-950 flex justify-center items-center gap-2"
              >
                <FaGoogle /> Sign in with Google
              </button>
              <hr />
              <button
                type="button" // Change to type="button" to prevent form submission
                onClick={() => {
                  setIsSignUpModalOpen(true); // Open sign-up modal
                  onClose(); // Close sign-in modal
                }}
                className="w-full rounded-lg text-neutral-400 p-2 hover:text-neutral-50"
              >
                Don't have an account? Sign Up
              </button>
            </div>
          </form>
        </div>
      </Modal>
      <SignUpModal
        isOpen={isSignUpModalOpen}
        onClose={() => setIsSignUpModalOpen(false)}
      />
    </>
  );
};
