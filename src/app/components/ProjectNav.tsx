"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProject } from "../context/ProjectContext";
import { FiSettings, FiGrid } from "react-icons/fi";
import { motion } from "framer-motion";

export const ProjectNav = () => {
  const pathname = usePathname();
  const { selectedProjectId } = useProject();
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect if on mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!selectedProjectId) return null;

  return (
    <div className={`flex h-16 items-center gap-1 md:gap-3 ${isMobile ? "justify-center" : ""}`}>
      <div className="flex gap-4">
        <NavLink
          href={`/projects/${selectedProjectId}`}
          isActive={pathname === `/projects/${selectedProjectId}`}
          icon={<FiGrid className={isMobile ? "w-4 h-4" : ""} />}
          label="Board"
          isMobile={isMobile}
        />
        
        <NavLink
          href={`/projects/${selectedProjectId}/manage`}
          isActive={pathname?.includes('/manage')}
          icon={<FiSettings className={isMobile ? "w-4 h-4" : ""} />}
          label="Settings"
          isMobile={isMobile}
        />
      </div>
    </div>
  );
};

// Helper component for nav links with consistent styling
type NavLinkProps = {
  href: string;
  isActive: boolean;
  icon: React.ReactNode;
  label: string;
  isMobile?: boolean;
};

const NavLink = ({ href, isActive, icon, label, isMobile }: NavLinkProps) => {
  return (
    <Link href={href}>
      <motion.div
        className={`relative flex items-center gap-1.5 ${
          isMobile ? "py-2 px-3" : "py-1.5 px-3"
        } rounded-md text-sm ${
          isActive 
            ? 'text-[var(--text)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
        }`}
        whileHover={{ scale: isActive ? 1 : 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="flex items-center justify-center">{icon}</span>
        {!isMobile && <span className="hidden sm:inline">{label}</span>}
        
        {isActive && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)] rounded-full mx-auto"
            layoutId="navIndicator"
            style={{ 
              width: '80%',
              marginLeft: 'auto', 
              marginRight: 'auto' 
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
      </motion.div>
    </Link>
  );
};
