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
    <div className="bg-neutral-900 p-1 rounded border border-neutral-700">
      <input
        type="text"
        placeholder="Search icons..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full mb-2 p-2 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 focus:outline-none focus:border-blue-500"
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
                    ? "border-blue-500 bg-blue-500/20"
                    : "border-neutral-700"
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
