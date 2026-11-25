"use client";

import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AnalyticsReport,
  DayOfWeekTrend,
  EnrichedPost,
  FormatPerformance,
  PostType,
  TopicPerformance,
} from "@/lib/api";

interface AnalyticsViewProps {
  report: AnalyticsReport;
  onSelectPost: (post: EnrichedPost) => void;
}

const formatOrder: PostType[] = ["REEL", "CAROUSEL", "IMAGE"];
const formatBadgeStyles: Record<PostType, string> = {
  REEL: "border-violet-200 bg-violet-50 text-violet-700",
  CAROUSEL: "border-sky-200 bg-sky-50 text-sky-700",
  IMAGE: "border-amber-200 bg-amber-50 text-amber-700",
};
const topicOrder = [
  "Case Study",
  "Industry Myth",
  "Tutorial",
  "Product Launch",
  "Behind the Scenes",
];
const hourOrder = [
  "Morning (06–11)",
  "Afternoon (12–17)",
  "Evening (18–23)",
  "Night (00–05)",
] as const;
const dayOrder: DayOfWeekTrend["day"][] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatRate(value: number): string {
  return `${value.toFixed(2)}%`;
}

function CardHeading({ title, detail }: { title: string; detail: string }) {
  return (
    <CardHeader className="gap-1 px-4 pb-0 pt-4">
      <CardTitle className="text-[12px] font-semibold tracking-[-0.015em] text-[#20232B]">
        {title}
      </CardTitle>
      <p className="text-[10px] text-[#858B95]">{detail}</p>
    </CardHeader>
  );
}

function EngagementBar({
  value,
  maximum,
  highlighted = false,
  className = "",
}: {
  value: number;
  maximum: number;
  highlighted?: boolean;
  className?: string;
}) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-[#F0F1F3] ${className}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{
          width: `${maximum > 0 ? Math.max((value / maximum) * 100, value > 0 ? 2 : 0) : 0}%`,
        }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={`h-full rounded-full ${highlighted ? "bg-[#5E6AD2]" : "bg-[#94A3B8]"}`}
      />
    </div>
  );
}

function FormatComparison({
  formats,
}: {
  formats: Record<PostType, FormatPerformance>;
}) {
  const maximum = Math.max(...formatOrder.map((format) => formats[format].avgWeightedEngagementRate));
  const best = formatOrder.reduce((top, format) =>
    formats[format].avgWeightedEngagementRate > formats[top].avgWeightedEngagementRate
      ? format
      : top,
  );
  const imageRate = formats.IMAGE.avgWeightedEngagementRate;
  const multiplier =
    imageRate > 0 ? formats[best].avgWeightedEngagementRate / imageRate : null;

  return (
    <Card className="gap-0 rounded-lg border border-[#E6E6E6] bg-white py-0 shadow-none">
      <CardHeading
        title="Format performance"
        detail="Average weighted engagement compared across formats"
      />
      <CardContent className="pt-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[9px] font-medium uppercase tracking-[0.07em] text-[#9298A2]">
            Avg weighted engagement rate
          </span>
          {multiplier !== null && best !== "IMAGE" && (
            <Badge
              variant="outline"
              className="h-5 rounded-md border-[#E6E6E6] bg-[#FAFAFB] px-1.5 font-mono text-[9px] font-medium text-[#5D6470]"
            >
              {multiplier.toFixed(2)}x higher WER than Images
            </Badge>
          )}
        </div>
        <div className="space-y-4 pb-4">
          {formatOrder.map((format) => {
            const metrics = formats[format];
            const highlighted = metrics.postCount > 0 && format === best;
            return (
              <motion.div
                key={format}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: formatOrder.indexOf(format) * 0.035 }}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`h-5 rounded-md px-1.5 text-[9px] font-medium ${formatBadgeStyles[format]}`}
                    >
                      {format}
                    </Badge>
                    <span className="text-[10px] text-[#777D87]">
                      {metrics.postCount} {metrics.postCount === 1 ? "post" : "posts"}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-[#343943] tabular-nums">
                    {formatRate(metrics.avgWeightedEngagementRate)}
                  </span>
                </div>
                <EngagementBar
                  value={metrics.avgWeightedEngagementRate}
                  maximum={maximum}
                  highlighted={highlighted}
                />
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-[#858B95]">
                  <span>Avg reach {formatNumber(metrics.avgReach)}</span>
                  <span>Likes {formatNumber(metrics.avgLikes)}</span>
                  <span>Comments {formatNumber(metrics.avgComments)}</span>
                  {format === "REEL" && (
                    <span className="text-[#6873C8]">
                      Replay {metrics.avgReplayRatio === null ? "—" : `${metrics.avgReplayRatio.toFixed(2)}×`}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function TopicLeaderboard({ topics }: { topics: TopicPerformance[] }) {
  const byTopic = new Map(topics.map((topic) => [topic.topic, topic]));
  const rankedTopics = topicOrder
    .map((topic) => byTopic.get(topic))
    .filter((topic): topic is TopicPerformance => topic !== undefined)
    .sort((a, b) => b.avgWeightedEngagementRate - a.avgWeightedEngagementRate);
  const maxRate = Math.max(...rankedTopics.map((topic) => topic.avgWeightedEngagementRate), 0);

  return (
    <Card className="gap-0 rounded-lg border border-[#E6E6E6] bg-white py-0 shadow-none">
      <CardHeading title="Topic leaderboard" detail="Ranked by average weighted engagement" />
      <CardContent className="pt-4">
        {rankedTopics.length === 0 ? (
          <p className="pb-4 text-[10px] text-[#858B95]">No topic performance data available.</p>
        ) : (
          <div className="space-y-3 pb-4">
            {rankedTopics.map((topic, index) => (
              <motion.div
                key={topic.topic}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, delay: Math.min(index * 0.025, 0.1) }}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-4 shrink-0 font-mono text-[9px] text-[#A0A5AD]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate text-[10px] font-medium text-[#414651]">
                      {topic.topic}
                    </span>
                    <span className="shrink-0 text-[9px] text-[#969BA3]">
                      {topic.postCount} posts · {formatNumber(topic.avgComments)} avg comments
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] font-medium text-[#454B56] tabular-nums">
                    {formatRate(topic.avgWeightedEngagementRate)}
                  </span>
                </div>
                <EngagementBar
                  value={topic.avgWeightedEngagementRate}
                  maximum={maxRate}
                  highlighted={index === 0}
                />
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CaptionSignals({ report }: { report: AnalyticsReport }) {
  const questions = report.captionPatterns.questionHooks;
  const statements = report.captionPatterns.nonQuestionHooks;
  const hookLift =
    statements.avgWeightedEngagementRate > 0
      ? ((questions.avgWeightedEngagementRate - statements.avgWeightedEngagementRate) /
          statements.avgWeightedEngagementRate) *
        100
      : null;
  const lengths = [
    { key: "SHORT", label: "Short", range: "<80 chars" },
    { key: "MEDIUM", label: "Medium", range: "80–200 chars" },
    { key: "LONG", label: "Long", range: ">200 chars" },
  ] as const;
  const maxLengthRate = Math.max(
    ...lengths.map((length) => report.captionPatterns.byLength[length.key].avgWeightedEngagementRate),
  );

  return (
    <Card className="gap-0 rounded-lg border border-[#E6E6E6] bg-white py-0 shadow-none">
      <CardHeading title="Caption & hook signals" detail="Compare openings and caption length" />
      <CardContent className="space-y-4 pt-4">
        <div className="rounded-md border border-[#ECECEC] bg-[#FCFCFC] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium text-[#414651]">Question hooks</span>
            {hookLift !== null && (
              <Badge
                variant="outline"
                className={`h-5 rounded-md px-1.5 font-mono text-[9px] ${
                  hookLift >= 0
                    ? "border-[#DDEBE3] bg-[#F4FAF6] text-[#40815C]"
                    : "border-[#EFE2D8] bg-[#FFFAF5] text-[#A86C35]"
                }`}
              >
                {hookLift >= 0 ? "+" : ""}
                {hookLift.toFixed(2)}% vs statements
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border border-[#E6E6E6] bg-white px-2.5 py-2">
              <p className="text-[9px] text-[#858B95]">Question hook</p>
              <p className="mt-1 font-mono text-[14px] font-semibold text-[#353B45] tabular-nums">
                {formatRate(questions.avgWeightedEngagementRate)}
              </p>
              <p className="mt-0.5 text-[9px] text-[#969BA3]">{questions.count} posts</p>
            </div>
            <div className="rounded border border-[#E6E6E6] bg-white px-2.5 py-2">
              <p className="text-[9px] text-[#858B95]">Non-question</p>
              <p className="mt-1 font-mono text-[14px] font-semibold text-[#353B45] tabular-nums">
                {formatRate(statements.avgWeightedEngagementRate)}
              </p>
              <p className="mt-0.5 text-[9px] text-[#969BA3]">{statements.count} posts</p>
            </div>
          </div>
        </div>
        <div className="border-t border-[#EFEFEF] pt-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-medium text-[#414651]">Caption length</span>
            <span className="text-[9px] text-[#969BA3]">Average weighted ER</span>
          </div>
          <div className="space-y-3 pb-1">
            {lengths.map((length, index) => {
              const performance = report.captionPatterns.byLength[length.key];
              return (
                <div key={length.key}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[9px] text-[#666C76]">
                      {length.label} <span className="text-[#9A9FA7]">{length.range}</span>
                    </span>
                    <span className="font-mono text-[9px] text-[#565C67] tabular-nums">
                      {formatRate(performance.avgWeightedEngagementRate)} · {performance.count}
                    </span>
                  </div>
                  <EngagementBar
                    value={performance.avgWeightedEngagementRate}
                    maximum={maxLengthRate}
                    highlighted={index === 0}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TemporalWindows({ report }: { report: AnalyticsReport }) {
  const hoursByBucket = new Map(
    report.temporalTrends.byHourBucket.map((bucket) => [bucket.bucket, bucket]),
  );
  const hours = hourOrder
    .map((bucket) => hoursByBucket.get(bucket))
    .filter((bucket): bucket is NonNullable<typeof bucket> => bucket !== undefined);
  const daysByName = new Map(
    report.temporalTrends.byDayOfWeek.map((day) => [day.day, day]),
  );
  const days = dayOrder
    .map((day) => daysByName.get(day))
    .filter((day): day is NonNullable<typeof day> => day !== undefined);
  const maxHourRate = Math.max(...hours.map((bucket) => bucket.avgWeightedEngagementRate), 0);
  const maxDayRate = Math.max(...days.map((day) => day.avgWeightedEngagementRate), 0);
  const peakHour = hours.reduce<typeof hours[number] | null>(
    (best, bucket) =>
      bucket.postCount > 0 &&
      (!best || bucket.avgWeightedEngagementRate > best.avgWeightedEngagementRate)
        ? bucket
        : best,
    null,
  );
  const peakDay = days.reduce<typeof days[number] | null>(
    (best, day) =>
      day.postCount > 0 &&
      (!best || day.avgWeightedEngagementRate > best.avgWeightedEngagementRate)
        ? day
        : best,
    null,
  );

  return (
    <Card className="gap-0 rounded-lg border border-[#E6E6E6] bg-white py-0 shadow-none">
      <CardHeading
        title="Temporal posting windows"
        detail="Average weighted engagement by posting time"
      />
      <CardContent className="grid gap-5 pt-4 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[10px] font-medium text-[#555B66]">Hour buckets</h3>
            {peakHour && (
              <span className="text-[9px] text-[#6873C8]">
                Peak · {peakHour.bucket.split(" (")[0]}
              </span>
            )}
          </div>
          <div className="space-y-3 pb-1">
            {hours.map((bucket) => {
              const isPeak = peakHour?.bucket === bucket.bucket;
              return (
                <div key={bucket.bucket}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[9px] text-[#666C76]">
                      {bucket.bucket.replace(" (", " · ").replace(")", "")}
                    </span>
                    <span className="font-mono text-[9px] text-[#555B66] tabular-nums">
                      {formatRate(bucket.avgWeightedEngagementRate)}
                    </span>
                  </div>
                  <EngagementBar
                    value={bucket.avgWeightedEngagementRate}
                    maximum={maxHourRate}
                    highlighted={isPeak}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="border-t border-[#EFEFEF] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[10px] font-medium text-[#555B66]">Day of week</h3>
            {peakDay && <span className="text-[9px] text-[#6873C8]">Peak · {peakDay.day}</span>}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day) => {
              const isPeak = peakDay?.day === day.day;
              return (
                <div
                  key={day.day}
                  className={`rounded-md border px-1 py-2 text-center ${
                    isPeak
                      ? "border-[#D8DBF4] bg-[#F5F6FE]"
                      : "border-[#ECECEC] bg-white"
                  }`}
                  title={`${day.day}: ${formatRate(day.avgWeightedEngagementRate)}, ${day.postCount} posts`}
                >
                  <p
                    className={`text-[9px] ${
                      isPeak ? "font-semibold text-[#5965C7]" : "text-[#777D87]"
                    }`}
                  >
                    {day.day.slice(0, 3)}
                  </p>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{
                      height: `${maxDayRate > 0 ? Math.max((day.avgWeightedEngagementRate / maxDayRate) * 24, 2) : 2}px`,
                    }}
                    transition={{ duration: 0.35, delay: day.dayIndex * 0.025 }}
                    className={`mx-auto mt-2 w-1.5 rounded-full ${
                      isPeak ? "bg-[#5E6AD2]" : "bg-[#CBD5E1]"
                    }`}
                  />
                  <p className="mt-1.5 font-mono text-[8px] text-[#626873] tabular-nums">
                    {formatRate(day.avgWeightedEngagementRate)}
                  </p>
                  <p className="mt-0.5 text-[8px] text-[#A0A5AD]">{day.postCount} posts</p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RankedPosts({
  title,
  posts,
  kind,
  onSelectPost,
}: {
  title: string;
  posts: EnrichedPost[];
  kind: "best" | "worst";
  onSelectPost: (post: EnrichedPost) => void;
}) {
  const isBest = kind === "best";
  const accent = isBest ? "bg-emerald-500" : "bg-rose-400";

  return (
    <Card className="gap-0 overflow-hidden rounded-lg border border-[#E6E6E6] bg-white py-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-[#ECECEC] px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-[11px] font-semibold text-[#343943]">
          <span className={`size-1.5 rounded-full ${accent}`} />
          {title}
        </CardTitle>
        <span className="text-[9px] text-[#969BA3]">Top 5</span>
      </CardHeader>
      <div>
        {posts.length === 0 ? (
          <p className="px-4 py-5 text-[10px] text-[#858B95]">No post performance data available.</p>
        ) : (
          posts.slice(0, 5).map((post, index) => (
            <motion.button
              key={post.postId}
              type="button"
              onClick={() => onSelectPost(post)}
              initial={{ opacity: 0, x: isBest ? -4 : 4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.16, delay: Math.min(index * 0.025, 0.1) }}
              className="flex min-h-[58px] w-full items-center gap-2.5 border-b border-[#ECECEC] px-3 text-left transition-colors duration-[120ms] last:border-b-0 hover:bg-zinc-50/90 focus-visible:bg-zinc-50/90 focus-visible:outline-none"
            >
              <span className="w-4 shrink-0 font-mono text-[9px] text-[#9A9FA7]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={`h-6 w-0.5 shrink-0 rounded-full ${accent}`} />
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="shrink-0 font-mono text-[9px] text-[#6B7280]">
                    {post.postId}
                  </span>
                  <Badge
                    variant="outline"
                    className={`h-4 shrink-0 rounded px-1 text-[8px] font-medium ${formatBadgeStyles[post.postType]}`}
                  >
                    {post.postType}
                  </Badge>
                  <span className="truncate text-[9px] text-[#777D87]">{post.topic}</span>
                </span>
                <span className="mt-1 block truncate text-[9px] text-[#969BA3]">
                  {post.caption || "No caption"}
                </span>
              </span>
              <span
                className={`shrink-0 font-mono text-[10px] font-semibold tabular-nums ${
                  isBest ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {formatRate(post.weightedEngagementRate)}
              </span>
            </motion.button>
          ))
        )}
      </div>
    </Card>
  );
}

export function AnalyticsView({ report, onSelectPost }: AnalyticsViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="space-y-4"
    >
      <FormatComparison formats={report.formatBreakdown} />
      <div className="grid gap-4 xl:grid-cols-2">
        <TopicLeaderboard topics={report.topicBreakdown} />
        <CaptionSignals report={report} />
      </div>
      <TemporalWindows report={report} />
      <div className="grid gap-4 xl:grid-cols-2">
        <RankedPosts
          title="Top 5 performers"
          posts={report.topPosts}
          kind="best"
          onSelectPost={onSelectPost}
        />
        <RankedPosts
          title="Bottom 5 underperformers"
          posts={report.worstPosts}
          kind="worst"
          onSelectPost={onSelectPost}
        />
      </div>
    </motion.div>
  );
}
