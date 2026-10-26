import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "mango" | "dark" | "accent";

const styles: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  secondary: "bg-brand-50 text-forest hover:bg-brand-100",
  ghost: "bg-transparent text-forest hover:bg-brand-50",
  mango: "bg-mango text-forest hover:bg-mango-deep",
  dark: "bg-forest-mid text-cream hover:bg-brand-600",
  accent: "bg-brand-500 text-white hover:bg-brand-600",
};

export function Button({ variant = "primary", className = "", children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      type="button"
      {...rest}
      className={`min-h-[48px] inline-flex items-center justify-center gap-2 px-5 rounded-full font-semibold transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export const linkButton = (variant: Variant = "primary", extra = "") =>
  `min-h-[48px] inline-flex items-center justify-center gap-2 px-5 rounded-full font-semibold transition-[background-color,transform] duration-150 active:scale-[0.98] ${styles[variant]} ${extra}`;
