"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarClock,
  ChartNoAxesColumnIncreasing,
  Heart,
  MessageCircle,
  Target,
  Video,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CommandMenu } from "@/components/shell/CommandMenu";
import { Sidebar, type AppView } from "@/components/shell/Sidebar";
import { TopHeader } from "@/components/shell/TopHeader";
import { PostInspectorSheet } from "@/components/inspector/PostInspectorSheet";
import { AnalyticsView } from "@/components/views/AnalyticsView";
import { PostFeedView } from "@/components/views/PostFeedView";
import { StrategistView } from "@/components/views/StrategistView";
import {
  enrichPost,
  generateRecommendations,
  getAnalytics,
  getPosts,
  type AnalyticsReport,
  type ContentStrategyResponse,
  type EnrichedPost,
  type InstagramPost,
  type PostType,
} from "@/lib/api";

const numberFormatter = new Intl.NumberFormat("en-US");

const viewCopy: Record<AppView, { eyebrow: string; title: string; description: string }> = {
  "AI Strategist": {
    eyebrow: "Content intelligence",
    title: "Your next move, backed by data.",
    description: "Turn Instagram performance into a focused content strategy.",
  },
  Analytics: {
    eyebrow: "Performance overview",
    title: "Understand what’s working.",
    description: "Explore engagement, content formats, and audience timing.",
  },
  "Post Feed": {
    eyebrow: "Published content",
    title: "Every post, in context.",
    description: "Review your Instagram content alongside its performance.",
  },
};

function getBestFormat(report: AnalyticsReport | null): string {
  if (!report) return "—";
  const formats = Object.values(report.formatBreakdown).filter((format) => format.postCount > 0);
  if (formats.length === 0) return "—";
  return formats.reduce((best, format) =>
    format.avgWeightedEngagementRate > best.avgWeightedEngagementRate ? format : best,
  ).format;
}

function getBestWindow(report: AnalyticsReport | null): string {
  const buckets = report?.temporalTrends.byHourBucket ?? [];
  const populated = buckets.filter((bucket) => bucket.postCount > 0);
  if (populated.length === 0) return "—";
  return populated.reduce((best, bucket) =>
    bucket.avgWeightedEngagementRate > best.avgWeightedEngagementRate ? bucket : best,
  ).bucket.split(" (")[0];
}

function formatRate(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Target;
  loading: boolean;
}) {
  return (
    <Card className="gap-0 rounded-lg border border-[#E6E6E6] py-0 shadow-none">
      <CardHeader className="flex flex-row items-start justify-between px-4 pb-0 pt-4">
        <CardTitle className="text-[11px] font-medium text-[#737985]">{label}</CardTitle>
        <Icon size={15} strokeWidth={1.8} className="text-[#9BA0A8]" />
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-2">
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <div className="truncate text-[22px] font-semibold leading-7 tracking-[-0.045em] text-[#111827]">
            {value}
          </div>
        )}
        <p className="mt-1 text-[10px] text-[#9298A2]">{detail}</p>
      </CardContent>
    </Card>
  );
}

function SectionHeading({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[13px] font-semibold tracking-[-0.02em] text-[#20232B]">{title}</h2>
        <p className="mt-1 text-[11px] text-[#858B95]">{detail}</p>
      </div>
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <Card className="rounded-lg border border-dashed border-[#DADDE2] bg-white py-0 shadow-none">
      <CardContent className="flex min-h-40 items-center justify-center px-6 text-center text-[11px] text-[#858B95]">
        {message}
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [activeView, setActiveView] = useState<AppView>("AI Strategist");
  const [commandOpen, setCommandOpen] = useState(false);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [strategy, setStrategy] = useState<ContentStrategyResponse | null>(null);
  const [selectedPost, setSelectedPost] = useState<EnrichedPost | null>(null);
  const [postFilter, setPostFilter] = useState<PostType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strategyError, setStrategyError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getPosts(), getAnalytics()])
      .then(([loadedPosts, loadedReport]) => {
        if (!active) return;
        setPosts(loadedPosts);
        setReport(loadedReport);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Unable to load ICIS data.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const postsById = useMemo(() => {
    const enrichedPosts = new Map(posts.map((post) => [post.postId, enrichPost(post)]));
    for (const post of [...(report?.topPosts ?? []), ...(report?.worstPosts ?? [])]) {
      enrichedPosts.set(post.postId, post);
    }
    return enrichedPosts;
  }, [posts, report]);

  const handleFormatChange = useCallback((format: PostType | null) => {
    setPostFilter(format);
    setActiveView("Post Feed");
  }, []);

  const handleGenerateStrategy = useCallback(async () => {
    setActiveView("AI Strategist");
    setIsGenerating(true);
    setStrategyError(null);
    try {
      const generatedStrategy = await generateRecommendations();
      setStrategy(generatedStrategy);
      setError(null);
    } catch (cause: unknown) {
      setStrategyError(
        cause instanceof Error ? cause.message : "Unable to generate an AI strategy.",
      );
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const copy = viewCopy[activeView];
  const kpis = [
    {
      label: "Total posts",
      value: report ? numberFormatter.format(report.overview.totalPosts) : "—",
      detail: "In your analyzed dataset",
      icon: ChartNoAxesColumnIncreasing,
    },
    {
      label: "Avg. weighted ER",
      value: report ? formatRate(report.overview.avgWeightedEngagementRate) : "—",
      detail: "Weighted by reach",
      icon: Target,
    },
    {
      label: "Top format",
      value: getBestFormat(report),
      detail: "By weighted engagement",
      icon: Video,
    },
    {
      label: "Best posting window",
      value: getBestWindow(report),
      detail: "By time-of-day performance",
      icon: CalendarClock,
    },
  ];

  return (
    <div className="flex h-screen min-h-[560px] overflow-hidden bg-white">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader
          activeView={activeView}
          onOpenCommandMenu={() => setCommandOpen(true)}
          onGenerateStrategy={handleGenerateStrategy}
          isGenerating={isGenerating}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1440px] px-6 pb-12 pt-9 lg:px-10">
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A8F98]">
                  {copy.eyebrow}
                </p>
                <h1 className="text-[23px] font-semibold leading-tight tracking-[-0.045em] text-[#171A22] sm:text-[26px]">
                  {copy.title}
                </h1>
                <p className="mt-2 text-[12px] text-[#737985]">{copy.description}</p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full border border-[#E6E6E6] bg-white px-2.5 py-1.5 text-[10px] text-[#777D87]">
                <span
                  className={`size-1.5 rounded-full ${
                    isLoading ? "bg-[#C7A34B]" : error ? "bg-[#D15D5D]" : "bg-[#39A876]"
                  }`}
                />
                {isLoading ? "Connecting to Instagram data" : error ? "Backend unavailable" : "Instagram data connected"}
              </span>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start justify-between gap-3 rounded-md border border-[#F0D8D8] bg-[#FFF9F9] px-3.5 py-3 text-[11px] text-[#9A3D3D]"
              >
                <span>{error}</span>
                <button
                  type="button"
                  className="shrink-0 font-medium underline underline-offset-2"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </button>
              </div>
            )}

            <section
              aria-label="Key performance indicators"
              className="mb-9 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            >
              {kpis.map((kpi) => (
                <KpiCard key={kpi.label} {...kpi} loading={isLoading} />
              ))}
            </section>

            <AnimatePresence mode="wait">
              <motion.section
                key={activeView}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                {activeView === "AI Strategist" && (
                  <>
                    <SectionHeading
                      title="AI content strategy"
                      detail="Grounded recommendations based on your Instagram performance"
                    />
                    {strategyError && (
                      <div
                        role="alert"
                        className="mb-4 rounded-md border border-[#F0D8D8] bg-[#FFF9F9] px-3.5 py-3 text-[11px] text-[#9A3D3D]"
                      >
                        {strategyError}
                      </div>
                    )}
                    <StrategistView
                      strategy={strategy}
                      isGenerating={isGenerating}
                      postsAnalyzed={report?.overview.totalPosts ?? posts.length}
                      postsById={postsById}
                      onGenerate={handleGenerateStrategy}
                      onSelectPost={setSelectedPost}
                    />
                  </>
                )}
                {activeView === "Analytics" && (
                  <>
                    <SectionHeading
                      title="Performance breakdown"
                      detail="Compare post formats and find your strongest publishing windows"
                    />
                    {isLoading ? (
                      <div className="grid gap-4 xl:grid-cols-2">
                        <Skeleton className="h-64 rounded-lg" />
                        <Skeleton className="h-64 rounded-lg" />
                      </div>
                    ) : report ? (
                      <AnalyticsView report={report} onSelectPost={setSelectedPost} />
                    ) : (
                      <EmptyPanel message="Analytics will appear here when the backend is available." />
                    )}
                  </>
                )}
                {activeView === "Post Feed" && (
                  <>
                    <SectionHeading
                      title="Post performance"
                      detail="Filter and review recent Instagram content"
                    />
                    <PostFeedView
                      posts={[...postsById.values()]}
                      selectedFormat={postFilter}
                      onFormatChange={handleFormatChange}
                      onSelectPost={setSelectedPost}
                      loading={isLoading}
                    />
                  </>
                )}
              </motion.section>
            </AnimatePresence>

            <footer className="mt-10 flex items-center justify-between border-t border-[#EFEFEF] pt-4 text-[9px] text-[#9A9FA7]">
              <span>Insights are calculated from normalized Instagram post data.</span>
              <span className="hidden items-center gap-1.5 sm:flex">
                <Heart size={10} /> Reach-first analytics
                <MessageCircle size={10} className="ml-1" /> Weighted comments
                <ArrowUpRight size={10} className="ml-1" />
              </span>
            </footer>
          </div>
        </main>
      </div>
      <CommandMenu
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onViewChange={setActiveView}
        onFormatChange={handleFormatChange}
        onGenerateStrategy={handleGenerateStrategy}
      />
      <PostInspectorSheet
        post={selectedPost}
        onOpenChange={(open) => {
          if (!open) setSelectedPost(null);
        }}
        recommendations={strategy?.recommendations}
      />
    </div>
  );
}
