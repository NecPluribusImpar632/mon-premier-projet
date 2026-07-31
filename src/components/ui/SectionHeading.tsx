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
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-emerald">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-serif text-xl text-ink">{title}</h2>
          {subtitle && <p className="text-sm text-slate">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
