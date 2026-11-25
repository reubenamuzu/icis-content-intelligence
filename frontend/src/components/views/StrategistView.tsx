"use client";

import { motion } from "motion/react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  ContentStrategyResponse,
  EnrichedPost,
  PostType,
  RecommendationItem,
} from "@/lib/api";

interface StrategistViewProps {
  strategy: ContentStrategyResponse | null;
  isGenerating: boolean;
  postsAnalyzed: number;
  postsById: Map<string, EnrichedPost>;
  onGenerate: () => void;
  onSelectPost: (post: EnrichedPost) => void;
}

const formatStyles: Record<PostType, string> = {
  REEL: "border-violet-200 bg-violet-50 text-violet-700",
  CAROUSEL: "border-sky-200 bg-sky-50 text-sky-700",
  IMAGE: "border-amber-200 bg-amber-50 text-amber-700",
};

function categoryLabel(category: RecommendationItem["category"]): string {
  return category.replaceAll("_", " ");
}

function LoadingStrategy() {
  return (
    <div className="space-y-4" aria-label="Generating AI strategy" aria-busy="true">
      <Card className="overflow-hidden rounded-lg border border-[#E6E6E6] py-0 shadow-none">
        <div className="flex">
          <div className="w-0.5 shrink-0 bg-[#5E6AD2]" />
          <div className="flex-1 space-y-3 px-5 py-5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-full max-w-3xl" />
            <Skeleton className="h-3 w-4/5 max-w-2xl" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
        </div>
      </Card>
      <div className="grid gap-3 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Card
            key={index}
            className="space-y-4 rounded-lg border border-[#E6E6E6] p-4 shadow-none"
          >
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-20 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EmptyStrategy({
  postsAnalyzed,
  onGenerate,
}: {
  postsAnalyzed: number;
  onGenerate: () => void;
}) {
  return (
    <Card className="rounded-lg border border-[#E6E6E6] bg-white py-0 shadow-none">
      <CardContent className="flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
        <span className="mb-4 flex size-11 items-center justify-center rounded-xl border border-[#E4E5FB] bg-[#F5F6FE] text-[#5E6AD2]">
          <Sparkles size={18} strokeWidth={1.8} />
        </span>
        <h3 className="text-[15px] font-semibold tracking-[-0.025em] text-[#20232B]">
          Your next content strategy, grounded in performance
        </h3>
        <p className="mt-2 max-w-lg text-[12px] leading-5 text-[#777D87]">
          {postsAnalyzed > 0
            ? `${postsAnalyzed} posts have been analyzed deterministically across format, topic, timing, and caption performance.`
            : "Your posts are analyzed deterministically across format, topic, timing, and caption performance."}{" "}
          Generate an AI strategy to synthesize those findings into evidence-backed recommendations.
        </p>
        <Button
          onClick={onGenerate}
          className="mt-5 h-8 gap-2 bg-[#5E6AD2] px-3 text-[11px] font-medium text-white hover:bg-[#4F5BC4]"
        >
          <Sparkles size={13} />
          Generate AI Strategy
        </Button>
        <p className="mt-2 text-[9px] text-[#969BA3]">
          Generates recommendations from <span className="font-mono">POST /api/recommendations</span>
        </p>
      </CardContent>
    </Card>
  );
}

function RecommendationCard({
  recommendation,
  index,
  postsById,
  onSelectPost,
}: {
  recommendation: RecommendationItem;
  index: number;
  postsById: Map<string, EnrichedPost>;
  onSelectPost: (post: EnrichedPost) => void;
}) {
  const isHighImpact = recommendation.expectedImpact === "HIGH";

  return (
    <motion.div
      initial={{ opacity: 0, y: 7 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.045, 0.22), ease: "easeOut" }}
      className="h-full"
    >
      <Card className="h-full gap-0 rounded-lg border border-[#E6E6E6] py-0 shadow-none transition-colors duration-150 hover:border-zinc-300">
        <CardHeader className="px-4 pb-0 pt-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={`h-5 rounded-md px-1.5 text-[9px] font-medium ${
                isHighImpact
                  ? "border-[#DDEBE3] bg-[#F2F9F4] text-[#34784F]"
                  : "border-[#E6E6E6] bg-[#F7F8F8] text-[#68707C]"
              }`}
            >
              {recommendation.expectedImpact} impact
            </Badge>
            <Badge
              variant="outline"
              className="h-5 rounded-md border-[#E6E6E6] bg-white px-1.5 text-[8px] font-medium tracking-[0.025em] text-[#737985]"
            >
              {categoryLabel(recommendation.category)}
            </Badge>
            <Badge
              variant="outline"
              className={`h-5 rounded-md px-1.5 text-[9px] font-medium ${formatStyles[recommendation.recommendedFormat]}`}
            >
              {recommendation.recommendedFormat}
            </Badge>
          </div>
          <CardTitle className="pt-3 text-[15px] font-semibold leading-5 tracking-[-0.025em] text-[#111827]">
            {recommendation.title}
          </CardTitle>
          <p className="text-[10px] text-[#858B95]">{recommendation.suggestedTopic}</p>
        </CardHeader>
        <CardContent className="flex h-full flex-col px-4 pb-4 pt-3">
          <p className="text-[13.5px] leading-[1.65] text-[#374151]">
            {recommendation.actionableBrief}
          </p>
          <div className="mt-3 rounded-md border border-[#E6E6E6] bg-[#F7F8F8] p-3">
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.07em] text-[#858B95]">
              Data evidence
            </p>
            <p className="text-[10px] leading-[1.6] text-[#555B66]">
              {recommendation.dataEvidence}
            </p>
          </div>
          <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
            {recommendation.supportingPostIds.map((postId) => {
              const isAvailable = postsById.has(postId);
              return (
                <motion.button
                  key={postId}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => {
                    const citedPost = postsById.get(postId);
                    if (citedPost) onSelectPost(citedPost);
                  }}
                  whileHover={isAvailable ? { y: -1 } : undefined}
                  whileTap={isAvailable ? { scale: 0.98 } : undefined}
                  aria-label={
                    isAvailable ? `Inspect supporting post ${postId}` : `Post ${postId} is unavailable`
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-[#E6E6E6] bg-white px-2 py-1 font-mono text-[9px] text-[#626873] transition-colors hover:border-[#C8CCEF] hover:bg-[#F5F6FE] hover:text-[#535EB8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {postId}
                  {isAvailable && <ArrowUpRight size={10} />}
                </motion.button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function StrategistView({
  strategy,
  isGenerating,
  postsAnalyzed,
  postsById,
  onGenerate,
  onSelectPost,
}: StrategistViewProps) {
  if (isGenerating) return <LoadingStrategy />;
  if (!strategy) {
    return <EmptyStrategy postsAnalyzed={postsAnalyzed} onGenerate={onGenerate} />;
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-lg border border-[#E6E6E6] bg-white py-0 shadow-none">
        <div className="flex">
          <div className="w-[3px] shrink-0 bg-[#5E6AD2]" />
          <div className="min-w-0 flex-1">
            <CardHeader className="px-5 pb-0 pt-5">
              <Badge
                variant="outline"
                className="w-fit rounded-md border-[#E4E5FB] bg-[#F5F6FE] px-2 text-[9px] font-medium text-[#535EB8]"
              >
                Executive summary
              </Badge>
              <CardTitle className="pt-3 text-[14px] font-semibold leading-5 text-[#20232B]">
                {strategy.executiveSummary}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-3">
              {strategy.keyPatterns.length > 0 && (
                <ul className="space-y-2 border-t border-[#EFEFEF] pt-3">
                  {strategy.keyPatterns.map((pattern) => (
                    <li
                      key={pattern}
                      className="flex gap-2 text-[11px] leading-5 text-[#626873]"
                    >
                      <span className="mt-[7px] size-1 shrink-0 rounded-full bg-[#7B85D9]" />
                      <span>{pattern}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </div>
        </div>
      </Card>

      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-[12px] font-semibold text-[#20232B]">Recommended actions</h3>
          <p className="mt-1 text-[10px] text-[#858B95]">
            {strategy.recommendations.length} evidence-backed recommendations
          </p>
        </div>
      </div>
      {strategy.recommendations.length === 0 ? (
        <Card className="rounded-lg border border-[#E6E6E6] py-0 shadow-none">
          <CardContent className="py-8 text-center text-[11px] text-[#858B95]">
            No recommendations were returned.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {strategy.recommendations.map((recommendation, index) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              index={index}
              postsById={postsById}
              onSelectPost={onSelectPost}
            />
          ))}
        </div>
      )}
    </div>
  );
}
