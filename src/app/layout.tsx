"use client";

import React, { useState } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { ProjectProvider } from "./context/ProjectContext";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <ProjectProvider>
            <div className="min-h-screen flex flex-col">
              <Header />
              <div className="flex flex-1 pt-16">
                <Sidebar onCollapsedChange={setIsSidebarCollapsed} />
                <main
                  className={`flex-1 transition-all duration-300 ${
                    isSidebarCollapsed ? "ml-16" : "ml-64"
                  }`}
                >
                  {children}
                </main>
              </div>
            </div>
          </ProjectProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
