import type { ComponentType, ReactNode } from "react";

interface ScenarioCardProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: ReactNode;
}

export function ScenarioCard({
  icon: Icon,
  title,
  description,
  children,
}: ScenarioCardProps) {
  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-emerald">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h3 className="font-serif text-lg text-ink">{title}</h3>
          <p className="text-sm text-slate">{description}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-4">{children}</div>
    </div>
  );
}
