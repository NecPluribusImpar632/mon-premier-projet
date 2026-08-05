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
    <nav className="flex w-24 shrink-0 flex-col items-center gap-2 border-r border-line bg-surface py-6">
      {CLIENT_TABS.map((tab) => {
        const { icon: Icon, label } = TAB_CONFIG[tab];
        const isActive = tab === activeTab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            aria-current={isActive ? "page" : undefined}
            className={`flex w-20 flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center text-[11px] font-medium leading-tight transition-colors ${
              isActive
                ? "bg-emerald-tint text-emerald-strong"
                : "text-slate hover:bg-paper hover:text-ink"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
