import * as React from "react";
import { cn } from "../../utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string;
  }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-inner",
            error && "border-red-500/50 focus:ring-red-500 bg-red-500/5",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
