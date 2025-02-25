"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProject } from "../context/ProjectContext";

export const ProjectNav = () => {
  const pathname = usePathname();
  const { selectedProjectId } = useProject();

  if (!selectedProjectId) return null;

  return (
    <div className="flex-1 flex justify-center">
      <nav className="flex items-center h-full gap-1 px-1 max-w-full overflow-x-auto no-scrollbar bg-[var(--surface)] border border-neutral-700 rounded-full p-1">
        <Link
          href={`/projects/${selectedProjectId}`}
          className={`px-4 py-2 text-sm font-medium rounded-full ${
            pathname === `/projects/${selectedProjectId}`
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
          }`}
        >
          Board
        </Link>
        <Link
          href={`/projects/${selectedProjectId}/manage`}
          className={`px-4 py-2 text-sm font-medium rounded-full ${
            pathname?.includes('/manage')
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
          }`}
        >
          Settings
        </Link>
      </nav>
    </div>
  );
};
