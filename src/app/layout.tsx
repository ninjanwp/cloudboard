"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { ProjectProvider } from "./context/ProjectContext";
import { LoadingProvider } from "./context/LoadingContext";
import { ThemeProvider } from './context/ThemeContext';

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
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <ProjectProvider>
            <LoadingProvider>
              <ThemeProvider>
                {children}
              </ThemeProvider>
            </LoadingProvider>
          </ProjectProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
