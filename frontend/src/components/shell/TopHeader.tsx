"use client";

import { Search, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import type { AppView } from "./Sidebar";

interface TopHeaderProps {
  activeView: AppView;
  onOpenCommandMenu: () => void;
  onGenerateStrategy: () => void;
  isGenerating: boolean;
}

export function TopHeader({
  activeView,
  onOpenCommandMenu,
  onGenerateStrategy,
  isGenerating,
}: TopHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between border-b border-[#E6E6E6] bg-white/90 px-6 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-2 text-[12px]">
        <span className="font-medium text-[#7C818A]">ICIS</span>
        <span className="text-[#C4C7CC]">/</span>
        <span className="truncate font-medium text-[#242832]">{activeView}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenCommandMenu}
          className="h-7 gap-2 border-[#E6E6E6] bg-white px-2.5 text-[11px] font-normal text-[#777D87] shadow-none hover:bg-[#F7F8F8]"
          aria-label="Open search and command menu"
        >
          <Search size={13} />
          <span className="hidden sm:inline">Search anything</span>
          <kbd className="ml-1 rounded border border-[#E6E6E6] bg-[#FAFAFA] px-1 py-0.5 font-mono text-[9px] text-[#777D87]">
            ⌘K
          </kbd>
        </Button>
        <motion.div whileTap={{ scale: 0.985 }}>
          <Button
            size="sm"
            onClick={onGenerateStrategy}
            disabled={isGenerating}
            className="h-7 gap-1.5 rounded-md bg-[#5E6AD2] px-2.5 text-[11px] font-medium text-white shadow-none hover:bg-[#4F5BC4]"
          >
            <Sparkles size={13} />
            <span>{isGenerating ? "Generating…" : "Generate AI Strategy"}</span>
          </Button>
        </motion.div>
      </div>
    </header>
  );
}
