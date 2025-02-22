"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { LoadingScreen } from "../components/LoadingScreen";

export default function ProjectsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h1 className="text-2xl text-neutral-400 mb-4">Select a Project</h1>
        <p className="text-neutral-500">Choose a project from the sidebar to get started</p>
      </div>
    </div>
  );
}
