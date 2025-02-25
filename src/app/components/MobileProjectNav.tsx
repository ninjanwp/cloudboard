"use client";

import { useProject } from "../context/ProjectContext";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiGrid, FiSettings } from "react-icons/fi";

export const MobileProjectNav = () => {
  const { selectedProjectId } = useProject();
  const pathname = usePathname();

  if (!selectedProjectId) return null;

  const isActive = (path: string) => {
    if (path === `/projects/${selectedProjectId}`) {
      return pathname === path;
    }
    return pathname?.includes(path);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-[var(--surface)] border-t border-white/10 z-40">
      <div className="flex h-full items-center justify-around px-2">
        <NavLink
          href={`/projects/${selectedProjectId}`}
          isActive={isActive(`/projects/${selectedProjectId}`)}
          icon={<FiGrid />}
          label="Board"
        />
        
        <NavLink
          href={`/projects/${selectedProjectId}/manage`}
          isActive={isActive(`/projects/${selectedProjectId}/manage`)}
          icon={<FiSettings />}
          label="Settings"
        />
      </div>
    </div>
  );
};

type NavLinkProps = {
  href: string;
  isActive: boolean;
  icon: React.ReactNode;
  label: string;
};

const NavLink = ({ href, isActive, icon, label }: NavLinkProps) => {
  return (
    <Link href={href} className="w-1/2">
      <motion.div
        className={`flex flex-col items-center justify-center py-1 ${
          isActive 
            ? 'text-[var(--accent)]' 
            : 'text-[var(--text-secondary)]'
        }`}
        whileTap={{ scale: 0.95 }}
      >
        <div className="text-xl mb-0.5">{icon}</div>
        <span className="text-xs">{label}</span>
        
        {isActive && (
          <motion.div
            className="absolute top-0 h-0.5 bg-[var(--accent)] rounded-full w-12"
            layoutId="mobileNavIndicator"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
      </motion.div>
    </Link>
  );
};
