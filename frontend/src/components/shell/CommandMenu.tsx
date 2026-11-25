"use client";

import { useEffect } from "react";
import { BarChart3, ImageIcon, Layers3, Search, Sparkles, Video } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { PostType } from "@/lib/api";
import type { AppView } from "./Sidebar";

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewChange: (view: AppView) => void;
  onFormatChange: (format: PostType) => void;
  onGenerateStrategy: () => void;
}

export function CommandMenu({
  open,
  onOpenChange,
  onViewChange,
  onFormatChange,
  onGenerateStrategy,
}: CommandMenuProps) {
  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [open, onOpenChange]);

  function chooseView(view: AppView) {
    onViewChange(view);
    onOpenChange(false);
  }

  function chooseFormat(format: PostType) {
    onFormatChange(format);
    onOpenChange(false);
  }

  function chooseStrategy() {
    onGenerateStrategy();
    onOpenChange(false);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="ICIS command menu"
      description="Switch workspace views, filter posts, or generate a strategy."
      className="max-w-[520px]"
    >
      <Command>
        <div className="flex items-center gap-2 border-b border-[#E6E6E6] px-4">
          <Search className="size-4 shrink-0 text-[#9298A2]" />
          <CommandInput
            placeholder="Search views, formats, and actions…"
            className="h-12 px-0"
          />
        </div>
        <CommandList className="max-h-[360px] p-2">
          <CommandEmpty>No matching commands.</CommandEmpty>
          <CommandGroup heading="Workspace">
            <CommandItem value="AI Strategist" onSelect={() => chooseView("AI Strategist")}>
              <Sparkles className="text-[#5E6AD2]" />
              <span>AI Strategist</span>
            </CommandItem>
            <CommandItem value="Analytics" onSelect={() => chooseView("Analytics")}>
              <BarChart3 />
              <span>Analytics</span>
            </CommandItem>
            <CommandItem value="Post Feed" onSelect={() => chooseView("Post Feed")}>
              <Layers3 />
              <span>Post Feed</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator className="my-1" />
          <CommandGroup heading="Filter post feed">
            <CommandItem value="Filter REEL" onSelect={() => chooseFormat("REEL")}>
              <Video />
              <span>Show Reels</span>
            </CommandItem>
            <CommandItem value="Filter CAROUSEL" onSelect={() => chooseFormat("CAROUSEL")}>
              <Layers3 />
              <span>Show Carousels</span>
            </CommandItem>
            <CommandItem value="Filter IMAGE" onSelect={() => chooseFormat("IMAGE")}>
              <ImageIcon />
              <span>Show Images</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator className="my-1" />
          <CommandGroup heading="Actions">
            <CommandItem value="Generate AI Strategy" onSelect={chooseStrategy}>
              <Sparkles className="text-[#5E6AD2]" />
              <span>Generate AI Strategy</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
        <div className="flex items-center justify-between border-t border-[#E6E6E6] px-4 py-2 text-[10px] text-[#8A8F98]">
          <span>Navigate your content workspace</span>
          <span className="font-mono">ESC to close</span>
        </div>
      </Command>
    </CommandDialog>
  );
}
