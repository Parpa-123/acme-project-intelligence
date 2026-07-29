import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";
import { FaSpinner } from "react-icons/fa";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-white text-black hover:bg-gray-200 shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all cursor-pointer font-bold",
        destructive: "bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/50 hover:text-white text-glow-sm shadow-[0_0_15px_rgba(239,68,68,0.2)] transition-all cursor-pointer font-bold",
        outline: "border border-white/20 bg-transparent hover:bg-white/10 text-white text-glow-sm transition-all cursor-pointer font-bold",
        secondary: "bg-white/10 text-white hover:bg-white/20 text-glow-sm transition-all cursor-pointer font-bold",
        ghost: "hover:bg-white/10 hover:text-white text-gray-400 transition-all cursor-pointer font-bold",
        link: "text-indigo-400 underline-offset-4 hover:underline text-glow-sm transition-all cursor-pointer font-bold",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading && <FaSpinner className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
