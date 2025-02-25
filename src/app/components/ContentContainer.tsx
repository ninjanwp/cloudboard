"use client";

import React from "react";
import { motion } from "framer-motion";

interface ContentContainerProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  fullscreen?: boolean;
}

/**
 * A reusable container component that provides consistent rounded borders
 * and styling for the main content area across the application.
 */
export const ContentContainer: React.FC<ContentContainerProps> = ({
  children,
  className = "",
  animate = false,
  fullscreen = false
}) => {
  const Component = animate ? motion.div : "div";
  
  return (
    <Component 
      className={`rounded-none md:rounded-tl-3xl bg-[var(--background)] overflow-auto ${
        fullscreen ? "ml-0 md:ml-64" : ""
      } ${className}`}
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={animate ? { duration: 0.3 } : undefined}
    >
      {children}
    </Component>
  );
};
