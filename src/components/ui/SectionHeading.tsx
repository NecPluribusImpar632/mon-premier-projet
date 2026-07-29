import type { ComponentType, ReactNode } from "react";

interface SectionHeadingProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionHeading({
  icon: Icon,
  title,
  subtitle,
  action,
}: SectionHeadingProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
