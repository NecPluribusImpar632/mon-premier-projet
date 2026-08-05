"use client";

import type { ComponentType } from "react";
import { Building2, FlaskConical, Home, PieChart, Target } from "lucide-react";
import { CLIENT_TABS, type ClientTab } from "@/lib/client/clientTabs";

const TAB_CONFIG: Record<
  ClientTab,
  { icon: ComponentType<{ className?: string }>; label: string }
> = {
  overview: { icon: Home, label: "Vue d'ensemble" },
  allocation: { icon: PieChart, label: "Allocation" },
  properties: { icon: Building2, label: "Biens immobiliers" },
  scenarios: { icon: FlaskConical, label: "Scénarios" },
  goal: { icon: Target, label: "Objectif patrimonial" },
};

interface ClientSidebarProps {
  activeTab: ClientTab;
  onTabChange: (tab: ClientTab) => void;
}

// Always icon + label, never collapses to icon-only — an explicit requirement, not
// just a default, since narrower viewports would otherwise be a natural place to
// shrink it.
export function ClientSidebar({ activeTab, onTabChange }: ClientSidebarProps) {
  return (
    <nav className="flex w-20 shrink-0 flex-col items-center justify-center gap-7 border-r border-line bg-surface">
      {CLIENT_TABS.map((tab) => {
        const { icon: Icon, label } = TAB_CONFIG[tab];
        const isActive = tab === activeTab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            aria-current={isActive ? "page" : undefined}
            className={`flex w-16 flex-col items-center gap-1 rounded-lg px-1.5 py-2 text-center text-[10.5px] leading-tight transition-colors ${
              isActive
                ? "bg-emerald-tint/70 font-medium text-emerald-strong"
                : "font-normal text-slate/80 hover:bg-paper hover:text-ink"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
