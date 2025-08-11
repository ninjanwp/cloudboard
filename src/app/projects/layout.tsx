"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import { ProjectNav } from "../components/ProjectNav";
import { MobileProjectNav } from "../components/MobileProjectNav";
import { useAuth } from "../context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { FiMenu } from "react-icons/fi";
import { LoadingScreen } from "../components/LoadingScreen";
import { ContentContainer } from "../components/ContentContainer";

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [isMobile, setIsMobile] = useState(false);

  // Get projectId from params
  const projectId = params?.projectId as string;

  // Check if on mobile device
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileSidebarOpen(false);
      }
    };
    
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null; // Or loading spinner
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0">        
        <Header projectId={projectId}>
          {/* Only show ProjectNav in header on desktop */}
          {!isMobile && (
            <div className="w-full max-w-md">
              <ProjectNav />
            </div>
          )}
        </Header>
      </div>
      
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          onCollapsedChange={setIsSidebarCollapsed} 
          isMobile={isMobile}
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          defaultCollapsed={isSidebarCollapsed}
        />
        <ContentContainer
          className={`flex-1 mt-16 transition-all ${
            isMobile ? "" : (isSidebarCollapsed ? "ml-16" : "ml-64")
          } h-[calc(100vh-4rem)] ${isMobile ? "pb-14" : ""}`}
        >
          {children}
        </ContentContainer>
        
        {/* Repositioned Mobile hamburger menu button */}
        {isMobile && (
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="fixed right-4 bottom-20 z-50 bg-[var(--accent)] text-white p-3 rounded-full shadow-lg"
            aria-label="Toggle sidebar menu"
          >
            <FiMenu size={24} />
          </button>
        )}

        {/* Bottom navigation for mobile */}
        <MobileProjectNav />
      </div>
    </div>
  );
}
