"use client";

import React, { useState, FormEvent } from "react";
import { Modal } from "./Modal";
import { useAuth } from "../context/AuthContext";
import { FaGoogle } from "react-icons/fa6";

type SignUpModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const SignUpModal = ({ isOpen, onClose }: SignUpModalProps) => {
  const { signUpWithEmailPassword, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailSignUp = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await signUpWithEmailPassword(email, password);
      onClose();
    } catch (error) {
      console.error("Error signing up with email/password", error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4 p-4 bg-neutral-800 rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-neutral-100 w-full text-center">
          Sign Up
        </h2>
        <form onSubmit={handleEmailSignUp} className="space-y-4">
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
              Sign Up
            </button>
            <hr />
            <button
              onClick={signInWithGoogle}
              className="w-full rounded-lg bg-neutral-900 p-4 text-white hover:bg-neutral-950 flex justify-center items-center gap-2"
            >
              <FaGoogle /> Sign up with Google
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
