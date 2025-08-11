import React, { useState } from "react";
import * as FaIcons from "react-icons/fa6";

const iconOptions = Object.keys(FaIcons).map((key) => ({
  name: key,
  icon: (FaIcons as { [key: string]: React.ComponentType })[key],
}));

interface IconSelectorProps {
  selectedIcon: string;
  setSelectedIcon: (icon: string) => void;
}

export const IconSelector = ({
  selectedIcon,
  setSelectedIcon,
}: IconSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredIcons = iconOptions.filter((option) =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-[var(--surface)] p-1 rounded border border-[var(--border)]">
      <input
        type="text"
        placeholder="Search icons..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full mb-2 p-2 rounded bg-[var(--background)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
      />
      <div className="overflow-x-auto">
        <div className="grid grid-rows-5 auto-rows-[32px] grid-flow-col auto-cols-[32px] gap-0.5 pb-4">
          {filteredIcons.map((option) => {
            const IconComponent = option.icon;
            return (
              <button
                key={option.name}
                type="button"
                onClick={() => setSelectedIcon(option.name)}
                className={`flex p-2 items-center justify-center rounded border transition-colors ${
                  selectedIcon === option.name
                    ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] hover:border-[var(--border-hover)]"
                }`}
              >
                <IconComponent/>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
