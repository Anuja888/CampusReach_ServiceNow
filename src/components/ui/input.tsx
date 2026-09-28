import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-lg border bg-white px-4 py-2 text-base text-stone-900 placeholder:text-stone-400",
        "transition-all duration-150",
        "focus:outline-none focus:ring-2 focus:ring-offset-1",
        error
          ? "border-red-300 focus:ring-red-400 focus:border-red-400"
          : "border-stone-200 focus:ring-teal-500 focus:border-teal-500 hover:border-teal-300",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
