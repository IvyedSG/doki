import React from "react";

interface ChipProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({ selected, onClick, children }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-mono text-label px-5 py-2.5 rounded-full border cursor-pointer transition-all duration-150 ${
        selected
          ? "border-accent bg-accent/5 text-accent font-semibold"
          : "border-border-active bg-bg3 text-text-muted hover:border-accent hover:text-accent"
      }`}
    >
      {children}
    </button>
  );
};
