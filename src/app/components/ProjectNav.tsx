"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProject } from "../context/ProjectContext";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import { FaClipboardList, FaGear, FaMessage, FaCalendar } from "react-icons/fa6";
import { canAccessNavigation } from "../utils/projectUtils";

export const ProjectNav = () => {
  const { currentProject } = useProject();
  const { user } = useAuth();
  const pathname = usePathname();

  if (!currentProject) return null;

  const projectId = currentProject.id;
  const isCurrentRoute = (route: string) => pathname === route;

  const allRoutes = [
    {
      href: `/projects/${projectId}`,
      label: "Board",
      icon: <FaClipboardList className="w-4 h-4" />,
      permission: "board", // Board access is always available to members
    },
    {
      href: `/projects/${projectId}/calendar`,
      label: "Calendar",
      icon: <FaCalendar className="w-4 h-4" />,
      permission: "calendar",
    },
    {
      href: `/projects/${projectId}/chat`,
      label: "Chat",
      icon: <FaMessage className="w-4 h-4" />,
      permission: "chat",
    },
    {
      href: `/projects/${projectId}/manage`,
      label: "Manage",
      icon: <FaGear className="w-4 h-4" />,
      permission: "manage",
    },
  ];

  // Filter routes based on user permissions
  const routes = allRoutes.filter(route => {
    if (route.permission === "board") return true; // Board is always accessible
    return canAccessNavigation(currentProject, user?.email || "", route.permission);
  });

  return (
    <nav className="flex">
      <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={`relative px-4 py-2 flex items-center gap-2 ${
              isCurrentRoute(route.href)
                ? "text-[var(--accent)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text)]"
            }`}
          >
            {route.icon}
            <span>{route.label}</span>
            {isCurrentRoute(route.href) && (
              <motion.div
                layoutId="projectNavIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
};
