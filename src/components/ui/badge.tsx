import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:    "bg-teal-100 text-teal-700",
        low:        "bg-emerald-50 text-emerald-700 border border-emerald-200",
        medium:     "bg-amber-50 text-amber-700 border border-amber-200",
        high:       "bg-red-50 text-red-700 border border-red-200",
        crisis:     "bg-amber-100 text-amber-900 border border-amber-300",
        secondary:  "bg-stone-100 text-stone-600",
        outline:    "border border-stone-200 text-stone-600 bg-transparent",
        restricted: "bg-amber-50 text-amber-700 border border-amber-200",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
