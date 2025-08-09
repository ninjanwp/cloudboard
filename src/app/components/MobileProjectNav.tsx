"use client";

import { useProject } from "../context/ProjectContext";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { FaClipboardList, FaGear, FaMessage, FaCalendar } from "react-icons/fa6";
import { motion } from "framer-motion";

export const MobileProjectNav = () => {
  const { currentProject } = useProject();
  const pathname = usePathname();

  // Hide the navigation if not on a project page or no project is selected
  if (!pathname.includes("/projects/") || !currentProject) return null;

  const projectId = currentProject.id;

  const routes = [
    {
      href: `/projects/${projectId}`,
      icon: <FaClipboardList size={20} />,
      label: "Board",
    },
    {
      href: `/projects/${projectId}/calendar`,
      icon: <FaCalendar size={20} />,
      label: "Calendar",
    },
    {
      href: `/projects/${projectId}/chat`,
      icon: <FaMessage size={20} />,
      label: "Chat",
    },
    {
      href: `/projects/${projectId}/manage`,
      icon: <FaGear size={20} />,
      label: "Manage",
    },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface)] border-t border-[var(--border)]">
      <div className="flex justify-around items-center">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={`flex flex-1 flex-col items-center py-2.5 relative ${
              isActive(route.href)
                ? "text-[var(--accent)]"
                : "text-[var(--text-secondary)]"
            }`}
          >
            {route.icon}
            <span className="text-xs mt-1">{route.label}</span>
            {isActive(route.href) && (
              <motion.div
                layoutId="bottom-nav-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};
