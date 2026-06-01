import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  children,
  className = "",
  ...props
}) => {
  const baseStyle = "inline-flex items-center justify-center font-mono text-label font-medium rounded-rad transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-accent hover:bg-accent-hover text-bg px-6 py-3 shadow-md shadow-accent/5",
    ghost: "bg-transparent border border-border-active hover:border-text-muted text-text-muted hover:text-text-main px-5 py-3",
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
