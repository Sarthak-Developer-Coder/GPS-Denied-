import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

const variants = {
  primary: "bg-gradient-to-r from-accent-400 via-accent-500 to-accent-purple text-space-950 shadow-glow hover:brightness-110",
  secondary: "border border-white/15 bg-white/8 text-white hover:bg-white/12",
  ghost: "text-slate-300 hover:bg-white/6",
  danger: "border border-status-fail/30 bg-status-fail/10 text-status-fail hover:bg-status-fail/15",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
});
