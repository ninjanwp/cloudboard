"use client";

import React, { useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import { ProjectNav } from "../components/ProjectNav";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace('/');
    }
  }, [user, router]);

  if (!user) {
    return null; // Or loading spinner
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header>
        <div className="w-full max-w-md">
          <ProjectNav />
        </div>
      </Header>
      <div className="flex flex-1 pt-16 overflow-hidden">
        <Sidebar onCollapsedChange={setIsSidebarCollapsed} />
        <main
          className={`flex-1 transition-all duration-300 overflow-y-auto overflow-x-auto ${
            isSidebarCollapsed ? "ml-16" : "ml-64"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
