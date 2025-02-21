"use client";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-neutral-100">Settings</h1>
      <p className="mt-4 text-neutral-300">User: {user?.email}</p>
    </div>
  );
}
