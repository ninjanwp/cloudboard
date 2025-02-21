"use client";

import { useState } from "react";
import { CustomKanban } from "./components/CustomKanban";
import { useAuth } from "./context/AuthContext";

export default function Home({
  selectedProjectId,
  selectedBoardId,
}: {
  selectedProjectId: string | null;
  selectedBoardId: string | null;
}) {
  const { user } = useAuth();

  return (
    <div className="text-white h-screen flex flex-col">
      <div className="flex-grow overflow-auto">
        {selectedProjectId && selectedBoardId ? (
          <CustomKanban
            projectId={selectedProjectId}
            boardId={selectedBoardId}
          />
        ) : (
          <p className="text-neutral-400 p-4 mt-16">
            Select a project from the sidebar to get started.
          </p>
        )}
      </div>
    </div>
  );
}
