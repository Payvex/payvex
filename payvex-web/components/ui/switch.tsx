"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Switch — toggle boolean.
 * Implementação enxuta sem dependência extra de Radix Switch.
 * Usa um <input type="checkbox"> hidden + label visual.
 */
export type SwitchProps = React.InputHTMLAttributes<HTMLInputElement> & {
  onCheckedChange?: (checked: boolean) => void;
};

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, onCheckedChange, checked, ...props }, ref) => {
    return (
      <label
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          checked
            ? "bg-[#82d616]"
            : "bg-gray-400/50",
          className,
        )}
      >
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="sr-only"
          hidden
          {...props}
        />
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </label>
    );
  },
);
Switch.displayName = "Switch";

export { Switch };
