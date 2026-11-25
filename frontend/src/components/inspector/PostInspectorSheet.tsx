"use client";

import { CalendarDays, Check, CircleHelp, Eye, Heart, MessageCircle, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { EnrichedPost, RecommendationItem } from "@/lib/api";

interface PostInspectorSheetProps {
  post: EnrichedPost | null;
  onOpenChange: (open: boolean) => void;
  recommendations?: RecommendationItem[];
}

const formatStyles: Record<EnrichedPost["postType"], string> = {
  REEL: "border-violet-200 bg-violet-50 text-violet-700",
  CAROUSEL: "border-sky-200 bg-sky-50 text-sky-700",
  IMAGE: "border-amber-200 bg-amber-50 text-amber-700",
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Target;
}) {
  return (
    <div className="min-w-0 rounded-md border border-[#E6E6E6] bg-white p-3.5">
      <div className="flex items-center gap-1.5 text-[10px] text-[#747B86]">
        <Icon size={12} />
        {label}
      </div>
      <p className="mt-2 truncate font-mono text-[18px] font-semibold tracking-[-0.04em] text-[#171A22] tabular-nums">
        {value}
      </p>
    </div>
  );
}

export function PostInspectorSheet({
  post,
  onOpenChange,
  recommendations = [],
}: PostInspectorSheetProps) {
  const isOpen = post !== null;
  const citingRecommendations = post
    ? recommendations.filter((recommendation) =>
        recommendation.supportingPostIds.includes(post.postId),
      )
    : [];
  const publishedAt = post
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(post.publishedAt))
    : "";

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[440px] max-w-[100vw] border-l border-[#E6E6E6] bg-white p-0 sm:w-[500px] sm:max-w-none"
      >
        {post && (
          <>
            <SheetHeader className="border-b border-[#E6E6E6] px-5 pb-4 pt-5">
              <div className="mb-2 flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-md border-[#E6E6E6] bg-[#FAFAFA] px-2 font-mono text-[10px] text-[#626873]"
                >
                  {post.postId}
                </Badge>
                <Badge
                  variant="outline"
                  className={`rounded-md px-2 text-[10px] ${formatStyles[post.postType]}`}
                >
                  {post.postType}
                </Badge>
                <Badge
                  variant="outline"
                  className="max-w-[160px] truncate rounded-md border-[#E6E6E6] px-2 text-[10px] text-[#626873]"
                >
                  {post.topic}
                </Badge>
              </div>
              <SheetTitle className="text-[16px] font-semibold tracking-[-0.03em]">
                Post inspector
              </SheetTitle>
              <SheetDescription className="flex items-center gap-1.5 text-[11px]">
                <CalendarDays size={12} />
                {publishedAt}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <section>
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858B95]">
                  Caption
                </h3>
                <div className="whitespace-pre-wrap break-words rounded-md border border-[#E6E6E6] bg-[#F7F8F8] p-3.5 text-[12px] leading-5 text-[#343943]">
                  {post.caption || "No caption"}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge
                    variant="outline"
                    className="gap-1 border-[#E6E6E6] bg-white text-[9px] font-medium text-[#686E79]"
                  >
                    {post.hasQuestionHook ? (
                      <CircleHelp size={11} />
                    ) : (
                      <Check size={11} />
                    )}
                    {post.hasQuestionHook ? "Question Hook" : "Statement"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-[#E6E6E6] bg-white text-[9px] font-medium text-[#686E79]"
                  >
                    {post.captionLengthBucket} caption
                  </Badge>
                </div>
              </section>

              <section>
                <h3 className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858B95]">
                  Performance
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <Metric
                    label="Weighted ER"
                    value={`${post.weightedEngagementRate.toFixed(2)}%`}
                    icon={Target}
                  />
                  <Metric label="Reach" value={formatNumber(post.reach)} icon={Eye} />
                  <Metric label="Likes" value={formatNumber(post.likes)} icon={Heart} />
                  <Metric
                    label="Comments"
                    value={formatNumber(post.comments)}
                    icon={MessageCircle}
                  />
                  {post.postType === "REEL" && (
                    <>
                      <Metric
                        label="Reel views"
                        value={formatNumber(post.views ?? 0)}
                        icon={Eye}
                      />
                      <Metric
                        label="Replay ratio"
                        value={
                          post.replayRatio === null
                            ? "—"
                            : `${post.replayRatio.toFixed(2)}×`
                        }
                        icon={CircleHelp}
                      />
                    </>
                  )}
                </div>
              </section>

              <section>
                <h3 className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858B95]">
                  Weighted engagement calculation
                </h3>
                <div className="rounded-md border border-[#E6E6E6] bg-[#FAFAFB] p-3.5">
                  <p className="font-mono text-[11px] text-[#606671]">
                    (({post.likes} + 3 * {post.comments}) / {post.reach}) * 100
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-[#E6E6E6] pt-2.5">
                    <span className="text-[10px] text-[#858B95]">Weighted engagement rate</span>
                    <span className="font-mono text-[12px] font-semibold text-[#4F5BC4] tabular-nums">
                      {post.weightedEngagementRate.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </section>

              {citingRecommendations.length > 0 && (
                <section>
                  <h3 className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858B95]">
                    Cited by AI strategy
                  </h3>
                  <div className="space-y-2">
                    {citingRecommendations.map((recommendation) => (
                      <div
                        key={recommendation.id}
                        className="flex w-full items-center justify-between gap-3 rounded-md border border-[#E6E6E6] bg-white px-3 py-2.5 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] font-medium text-[#383D47]">
                            {recommendation.title}
                          </span>
                          <span className="mt-0.5 block text-[9px] text-[#858B95]">
                            {recommendation.category.replaceAll("_", " ")}
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] text-[#969BA3]">›</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
