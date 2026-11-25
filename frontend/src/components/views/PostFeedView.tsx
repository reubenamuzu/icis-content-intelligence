"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, CircleHelp, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EnrichedPost, PostType } from "@/lib/api";

type FormatFilter = "ALL" | PostType;

interface PostFeedViewProps {
  posts: EnrichedPost[];
  loading: boolean;
  selectedFormat: PostType | null;
  onFormatChange: (format: PostType | null) => void;
  onSelectPost: (post: EnrichedPost) => void;
}

const filters: { value: FormatFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "REEL", label: "Reels" },
  { value: "CAROUSEL", label: "Carousels" },
  { value: "IMAGE", label: "Images" },
];

const formatStyles: Record<PostType, string> = {
  REEL: "border-violet-200 bg-violet-50 text-violet-700",
  CAROUSEL: "border-sky-200 bg-sky-50 text-sky-700",
  IMAGE: "border-amber-200 bg-amber-50 text-amber-700",
};

function number(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function PostRow({
  post,
  index,
  onSelect,
}: {
  post: EnrichedPost;
  index: number;
  onSelect: (post: EnrichedPost) => void;
}) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.12,
        delay: Math.min(index * 0.012, 0.12),
        ease: "easeOut",
      }}
      onClick={() => onSelect(post)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(post);
        }
      }}
      tabIndex={0}
      aria-label={`Open ${post.postId}, ${post.postType}, ${post.topic}`}
      className="group h-[42px] cursor-pointer border-b border-[#ECECEC] text-[11px] text-[#414651] outline-none transition-colors duration-[120ms] hover:bg-zinc-50/90 focus-visible:bg-zinc-50/90"
    >
      <td className="whitespace-nowrap px-3 font-mono text-[10px] text-[#6B7280]">
        {post.postId}
      </td>
      <td className="whitespace-nowrap px-2">
        <Badge
          variant="outline"
          className={`h-5 rounded-md px-1.5 text-[9px] font-medium ${formatStyles[post.postType]}`}
        >
          {post.postType}
        </Badge>
      </td>
      <td className="max-w-[140px] px-2">
        <Badge
          variant="outline"
          className="max-w-full truncate rounded-md border-[#E6E6E6] bg-white px-1.5 text-[9px] font-normal text-[#626873]"
        >
          {post.topic}
        </Badge>
      </td>
      <td className="max-w-[260px] px-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[#4D535E]">{post.caption || "No caption"}</span>
          {post.hasQuestionHook && (
            <span
              title="Question hook"
              className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#F0F1FC] text-[9px] font-semibold text-[#5E6AD2]"
            >
              ?
            </span>
          )}
        </span>
      </td>
      <td className="whitespace-nowrap px-2 text-right font-mono text-[10px] tabular-nums">
        {number(post.reach)}
      </td>
      <td className="whitespace-nowrap px-2 text-right font-mono text-[10px] tabular-nums">
        {number(post.likes)}
      </td>
      <td className="whitespace-nowrap px-2 text-right font-mono text-[10px] tabular-nums">
        {number(post.comments)}
      </td>
      <td className="whitespace-nowrap px-2 text-right font-mono text-[10px] text-[#818792] tabular-nums">
        {post.views === null ? "—" : number(post.views)}
      </td>
      <td className="whitespace-nowrap px-3 text-right">
        <span className="inline-flex items-center justify-end gap-1.5 font-mono text-[10px] font-semibold text-[#363B45] tabular-nums">
          {post.weightedEngagementRate.toFixed(2)}%
          <ChevronRight
            size={13}
            className="text-[#A0A5AD] opacity-0 transition-opacity group-hover:opacity-100"
          />
        </span>
      </td>
    </motion.tr>
  );
}

export function PostFeedView({
  posts,
  loading,
  selectedFormat,
  onFormatChange,
  onSelectPost,
}: PostFeedViewProps) {
  const [topic, setTopic] = useState("ALL");
  const [search, setSearch] = useState("");

  const topics = useMemo(
    () => [...new Set(posts.map((post) => post.topic))].sort((a, b) => a.localeCompare(b)),
    [posts],
  );
  const visiblePosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...posts]
      .filter((post) => !selectedFormat || post.postType === selectedFormat)
      .filter((post) => topic === "ALL" || post.topic === topic)
      .filter(
        (post) =>
          query.length === 0 ||
          post.caption.toLowerCase().includes(query) ||
          post.postId.toLowerCase().includes(query),
      )
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  }, [posts, search, selectedFormat, topic]);

  return (
    <div className="overflow-hidden rounded-lg border border-[#E6E6E6] bg-white">
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-2 border-b border-[#ECECEC] px-3 py-1.5">
        <div
          role="group"
          aria-label="Filter by post format"
          className="flex items-center gap-0.5 rounded-md bg-[#F7F8F8] p-0.5"
        >
          {filters.map((filter) => {
            const active = (selectedFormat ?? "ALL") === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() =>
                  onFormatChange(filter.value === "ALL" ? null : filter.value)
                }
                aria-pressed={active}
                className={`relative rounded px-2.5 py-1 text-[10px] transition-colors ${
                  active ? "font-medium text-[#252A33]" : "text-[#777D87] hover:text-[#353A44]"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="format-filter-pill"
                    className="absolute inset-0 rounded border border-black/[0.045] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                    transition={{ type: "spring", stiffness: 440, damping: 34 }}
                  />
                )}
                <span className="relative z-10">{filter.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          <Select value={topic} onValueChange={(value) => setTopic(value ?? "ALL")}>
            <SelectTrigger
              aria-label="Filter by topic"
              className="h-7 w-[128px] rounded-md border-[#E6E6E6] bg-white px-2 text-[10px] shadow-none"
            >
              <SelectValue placeholder="All topics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All topics</SelectItem>
              {topics.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex h-7 w-[min(220px,40vw)] items-center gap-1.5 rounded-md border border-[#E6E6E6] px-2 text-[#9298A2] focus-within:border-[#A9AFE8]">
            <Search size={12} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search posts"
              aria-label="Search captions or post IDs"
              className="min-w-0 flex-1 bg-transparent text-[10px] text-[#353A44] outline-none placeholder:text-[#9A9FA7]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-[10px] text-[#9298A2] hover:text-[#424751]"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1060px] table-fixed border-collapse">
          <colgroup>
            <col className="w-[95px]" />
            <col className="w-[92px]" />
            <col className="w-[132px]" />
            <col />
            <col className="w-[82px]" />
            <col className="w-[72px]" />
            <col className="w-[82px]" />
            <col className="w-[80px]" />
            <col className="w-[112px]" />
          </colgroup>
          <thead>
            <tr className="h-8 border-b border-[#ECECEC] bg-[#FCFCFC] text-[9px] font-medium text-[#838994]">
              <th className="px-3 text-left">ID</th>
              <th className="px-2 text-left">Format</th>
              <th className="px-2 text-left">Topic</th>
              <th className="px-2 text-left">Caption</th>
              <th className="px-2 text-right">Reach</th>
              <th className="px-2 text-right">Likes</th>
              <th className="px-2 text-right">Comments</th>
              <th className="px-2 text-right">Views</th>
              <th className="px-3 text-right">Weighted ER</th>
            </tr>
          </thead>
          <AnimatePresence mode="wait" initial={false}>
            {loading ? (
              <tbody key="loading">
                {Array.from({ length: 8 }, (_, index) => (
                  <tr key={index} className="h-[42px] border-b border-[#ECECEC]">
                    <td colSpan={9} className="px-3">
                      <Skeleton className="h-3 w-full" />
                    </td>
                  </tr>
                ))}
              </tbody>
            ) : (
              <motion.tbody key="posts">
                {visiblePosts.map((post, index) => (
                  <PostRow
                    key={post.postId}
                    post={post}
                    index={index}
                    onSelect={onSelectPost}
                  />
                ))}
              </motion.tbody>
            )}
          </AnimatePresence>
        </table>
      </div>
      {!loading && visiblePosts.length === 0 && (
        <div className="flex min-h-28 flex-col items-center justify-center gap-2 text-center">
          <div className="flex size-7 items-center justify-center rounded-full bg-[#F7F8F8] text-[#9298A2]">
            {search ? <CircleHelp size={14} /> : <Check size={14} />}
          </div>
          <p className="text-[11px] text-[#777D87]">No posts match these filters.</p>
        </div>
      )}
      <div className="flex h-8 items-center justify-between border-t border-[#ECECEC] px-3 text-[9px] text-[#898F99]">
        <span>{loading ? "Loading posts…" : `${visiblePosts.length} posts`}</span>
        <span className="flex items-center gap-1.5">
          Topic: {topic === "ALL" ? "All" : topic}
          <ChevronDown size={10} />
        </span>
      </div>
    </div>
  );
}
