"use client";

import React, { useState } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import Home from "./page"; // Import the Home component
import { usePathname } from "next/navigation"; // Add this import

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname(); // Add this

  const handleProjectSelect = (projectId: string, boardId: string) => {
    setSelectedProjectId(projectId);
    setSelectedBoardId(boardId);
  };

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <div className="flex flex-1 pt-16">
              <Sidebar
                onProjectSelect={handleProjectSelect}
                activeProjectId={selectedProjectId}
                onCollapsedChange={setIsSidebarCollapsed}
              />
              <main
                className={`flex-1 transition-all duration-300 ${
                  isSidebarCollapsed ? "ml-16" : "ml-64"
                }`}
              >
                {pathname === "/" ? (
                  <Home
                    selectedProjectId={selectedProjectId}
                    selectedBoardId={selectedBoardId}
                  />
                ) : (
                  children
                )}
              </main>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
