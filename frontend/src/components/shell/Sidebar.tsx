"use client";

import {
  ChartNoAxesColumnIncreasing,
  GalleryVerticalEnd,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";

export type AppView = "AI Strategist" | "Analytics" | "Post Feed";

interface SidebarProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
}

const navigation: { label: AppView; icon: typeof Sparkles }[] = [
  { label: "AI Strategist", icon: Sparkles },
  { label: "Analytics", icon: ChartNoAxesColumnIncreasing },
  { label: "Post Feed", icon: GalleryVerticalEnd },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="flex h-screen w-[232px] shrink-0 flex-col border-r border-[#E6E6E6] bg-[#F7F8F8] px-3">
      <button
        type="button"
        className="flex h-14 items-center gap-2.5 px-2 text-left"
        onClick={() => onViewChange("AI Strategist")}
        aria-label="ICIS Intelligence home"
      >
        <span className="flex size-7 items-center justify-center rounded-lg bg-[#5E6AD2] text-white shadow-sm">
          <Sparkles size={15} strokeWidth={2.2} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold tracking-[-0.02em] text-[#111827]">
            ICIS Intelligence
          </span>
          <span className="mt-0.5 block text-[10px] leading-none text-[#8A8F98]">Workspace</span>
        </span>
      </button>

      <div className="mb-2 mt-7 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#969BA3]">
        Workspace
      </div>
      <nav aria-label="Main navigation" className="space-y-1">
        {navigation.map(({ label, icon: Icon }) => {
          const isActive = activeView === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onViewChange(label)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors ${
                isActive
                  ? "font-medium text-[#111827]"
                  : "text-[#626873] hover:bg-black/[0.035] hover:text-[#111827]"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-md border border-black/[0.045] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  transition={{ type: "spring", stiffness: 440, damping: 34 }}
                />
              )}
              <Icon size={16} strokeWidth={1.8} className="relative z-10" />
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-8 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#969BA3]">
        Data providers
      </div>
      <div className="mt-3 space-y-3 px-2">
        <div className="flex items-start gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#39A876]" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-[#343943]">
              SimulatedInstagramProvider
            </p>
            <p className="mt-0.5 text-[10px] text-[#8A8F98]">Active</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#5E6AD2]" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-[#343943]">Meta Graph API</p>
            <p className="mt-0.5 text-[10px] text-[#8A8F98]">v2 Ready</p>
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-[#E6E6E6] px-2 py-4">
        <p className="text-[10px] text-[#8A8F98]">Instagram Content Intelligence</p>
        <p className="mt-1 font-mono text-[10px] text-[#A0A4AB]">ICIS · SPRINT 01</p>
      </div>
    </aside>
  );
}
