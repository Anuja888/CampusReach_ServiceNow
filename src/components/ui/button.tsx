import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 focus-visible:ring-teal-600",
        outline:
          "border-2 border-teal-600 text-teal-700 bg-transparent hover:bg-teal-50 focus-visible:ring-teal-600",
        ghost:
          "text-stone-500 hover:bg-stone-100 active:bg-stone-200 focus-visible:ring-teal-600",
        crisis:
          "bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 focus-visible:ring-amber-600",
        secondary:
          "bg-stone-100 text-stone-800 hover:bg-stone-200 active:bg-stone-200 focus-visible:ring-teal-600",
        link:
          "text-teal-700 underline-offset-4 hover:underline p-0 h-auto focus-visible:ring-teal-600",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-13 px-8 text-base",
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
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
