import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-white/10 text-white text-glow-sm shadow-[0_0_10px_rgba(255,255,255,0.1)]",
        secondary:
          "border-transparent bg-indigo-500/20 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.2)]",
        destructive:
          "border-transparent bg-red-500/20 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]",
        outline: "text-gray-300 border-white/20 bg-transparent",
        success: "border-transparent bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
        warning: "border-transparent bg-amber-500/20 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
