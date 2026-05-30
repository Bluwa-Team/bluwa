"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const VARIANT_STYLES: Record<string, { iconBg: string; iconColor: string; gradient: string }> = {
  default:     { iconBg: "bg-muted",                          iconColor: "text-muted-foreground",              gradient: ""                                                                         },
  destructive: { iconBg: "bg-red-100 dark:bg-red-900/40",    iconColor: "text-red-500 dark:text-red-400",    gradient: "bg-gradient-to-r from-red-50 to-white dark:from-red-950/30 dark:to-card"   },
  warning:     { iconBg: "bg-amber-100 dark:bg-amber-900/40", iconColor: "text-amber-500 dark:text-amber-400", gradient: "bg-gradient-to-r from-amber-50 to-white dark:from-amber-950/30 dark:to-card" },
  success:     { iconBg: "bg-green-100 dark:bg-green-900/40", iconColor: "text-green-500 dark:text-green-400", gradient: "bg-gradient-to-r from-green-50 to-white dark:from-green-950/30 dark:to-card" },
  info:        { iconBg: "bg-blue-100 dark:bg-blue-900/40",   iconColor: "text-blue-500 dark:text-blue-400",   gradient: "bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/30 dark:to-card"   },
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof VARIANT_STYLES;
  icon?: LucideIcon;
  title?: string;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", icon: Icon, title, children, ...props }, ref) => {
    const { iconBg, iconColor, gradient } = VARIANT_STYLES[variant] ?? VARIANT_STYLES.default;

    const {
      onDrag, onDragStart, onDragEnd,
      onAnimationStart, onAnimationEnd, onAnimationIteration,
      onTransitionEnd,
      ...motionProps
    } = props;

    return (
      <AnimatePresence>
        <motion.div
          ref={ref}
          role="alert"
          className={cn(
            "flex items-start gap-3 rounded-xl p-3 shadow-sm",
            gradient || "bg-card",
            className
          )}
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          whileHover={{ y: -2, scale: 1.015, boxShadow: "0 6px 20px -4px rgba(0,0,0,0.10)" }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          {...motionProps}
        >
          {Icon && (
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
              <Icon className={cn("size-[18px]", iconColor)} />
            </div>
          )}
          <div className="flex-1 min-w-0 pt-0.5">
            {title && <p className="text-sm font-semibold leading-snug">{title}</p>}
            {children && (
              <p className={cn("text-xs leading-snug text-muted-foreground", title && "mt-0.5")}>
                {children}
              </p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }
);

Alert.displayName = "Alert";

export { Alert };
