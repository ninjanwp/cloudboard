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
      <nav className="flex items-center h-full gap-1 px-1 max-w-full overflow-x-auto no-scrollbar">
        <Link
          href={`/projects/${selectedProjectId}`}
          className={`px-4 py-2 text-sm font-medium rounded-full ${
            pathname === `/projects/${selectedProjectId}`
              ? 'bg-blue-700 text-white'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Board
        </Link>
        <Link
          href={`/projects/${selectedProjectId}/manage`}
          className={`px-4 py-2 text-sm font-medium rounded-full ${
            pathname?.includes('/manage')
              ? 'bg-blue-600 text-white'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Settings
        </Link>
      </nav>
    </div>
  );
};
