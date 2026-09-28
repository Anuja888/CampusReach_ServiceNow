import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-lg border bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400",
        "transition-all duration-150 resize-none",
        "focus:outline-none focus:ring-2 focus:ring-offset-1",
        error
          ? "border-red-300 focus:ring-red-400 focus:border-red-400"
          : "border-stone-200 focus:ring-teal-500 focus:border-teal-500 hover:border-teal-300",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
