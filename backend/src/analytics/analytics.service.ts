import { InstagramPost, PostType } from '../schemas/content.schema';

export type CaptionLengthBucket = 'SHORT' | 'MEDIUM' | 'LONG';

export interface EnrichedPost extends InstagramPost {
  weightedEngagementRate: number;
  replayRatio: number | null;
  captionLengthBucket: CaptionLengthBucket;
  hasQuestionHook: boolean;
}

export interface OverviewMetrics {
  totalPosts: number;
  avgWeightedEngagementRate: number;
  totalReach: number;
  totalLikes: number;
  totalComments: number;
  totalReelViews: number;
}

export interface FormatPerformance {
  format: PostType;
  postCount: number;
  avgWeightedEngagementRate: number;
  avgReach: number;
  avgLikes: number;
  avgComments: number;
  avgViews: number | null;
  avgReplayRatio: number | null;
}

export interface TopicPerformance {
  topic: string;
  postCount: number;
  avgWeightedEngagementRate: number;
  avgReach: number;
  avgLikes: number;
  avgComments: number;
  commentToReachRatio: number;
}

export interface DayOfWeekTrend {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  dayIndex: number;
  postCount: number;
  avgWeightedEngagementRate: number;
}

export interface HourBucketTrend {
  bucket: 'Morning (06–11)' | 'Afternoon (12–17)' | 'Evening (18–23)' | 'Night (00–05)';
  postCount: number;
  avgWeightedEngagementRate: number;
}

export interface WeeklyTrend {
  week: string;
  weekStart: string;
  postCount: number;
  avgWeightedEngagementRate: number;
}

export interface TemporalTrends {
  byDayOfWeek: DayOfWeekTrend[];
  byHourBucket: HourBucketTrend[];
  weeklyTrend: WeeklyTrend[];
}

export interface HookPerformance {
  count: number;
  avgWeightedEngagementRate: number;
}

export interface LengthBucketPerformance {
  count: number;
  avgWeightedEngagementRate: number;
}

export interface CaptionPatterns {
  questionHooks: HookPerformance;
  nonQuestionHooks: HookPerformance;
  byLength: Record<CaptionLengthBucket, LengthBucketPerformance>;
}

export interface AnalyticsReport {
  overview: OverviewMetrics;
  topPosts: EnrichedPost[];
  worstPosts: EnrichedPost[];
  formatBreakdown: Record<PostType, FormatPerformance>;
  topicBreakdown: TopicPerformance[];
  temporalTrends: TemporalTrends;
  captionPatterns: CaptionPatterns;
}

/**
 * Checks if the first sentence of a caption contains a question mark '?'.
 * The first sentence ends at the first occurrence of '.', '!', '?', or '\n'.
 */
export function hasQuestionHook(caption: string): boolean {
  const trimmed = caption.trim();
  if (!trimmed) return false;
  return /^[^.!\n]*\?/.test(trimmed);
}

/**
 * Categorizes caption length:
 * - "SHORT": < 80 characters
 * - "MEDIUM": 80–200 characters
 * - "LONG": > 200 characters
 */
export function getCaptionLengthBucket(caption: string): CaptionLengthBucket {
  const length = caption.length;
  if (length < 80) return 'SHORT';
  if (length <= 200) return 'MEDIUM';
  return 'LONG';
}

/**
 * Calculates Weighted Engagement Rate by Reach:
 * ((likes + comments * 3) / reach) * 100
 *
 * Applied uniformly across ALL formats (REEL, CAROUSEL, IMAGE).
 * Guard: returns 0 if reach <= 0.
 * Rounded to 2 decimal places.
 */
export function calculateWeightedEngagementRate(likes: number, comments: number, reach: number): number {
  if (reach <= 0) return 0;
  const raw = ((likes + comments * 3) / reach) * 100;
  return Number(raw.toFixed(2));
}

/**
 * Calculates Reel replay ratio:
 * views / reach
 *
 * Populated only when views !== null and reach > 0.
 * Rounded to 2 decimal places.
 */
export function calculateReplayRatio(views: number | null | undefined, reach: number): number | null {
  if (views === null || views === undefined || reach <= 0) return null;
  return Number((views / reach).toFixed(2));
}

/**
 * Enriches a single raw InstagramPost with computed deterministic metrics.
 */
export function enrichPost(post: InstagramPost): EnrichedPost {
  return {
    ...post,
    weightedEngagementRate: calculateWeightedEngagementRate(post.likes, post.comments, post.reach),
    replayRatio: calculateReplayRatio(post.views, post.reach),
    captionLengthBucket: getCaptionLengthBucket(post.caption),
    hasQuestionHook: hasQuestionHook(post.caption),
  };
}

/**
 * Enriches an array of raw InstagramPost objects.
 */
export function enrichPosts(posts: InstagramPost[]): EnrichedPost[] {
  return posts.map(enrichPost);
}

const DAYS_MAP: Array<{ day: DayOfWeekTrend['day']; jsDay: number }> = [
  { day: 'Monday', jsDay: 1 },
  { day: 'Tuesday', jsDay: 2 },
  { day: 'Wednesday', jsDay: 3 },
  { day: 'Thursday', jsDay: 4 },
  { day: 'Friday', jsDay: 5 },
  { day: 'Saturday', jsDay: 6 },
  { day: 'Sunday', jsDay: 0 },
];

/**
 * Computes the ISO week string (YYYY-Www) and Monday start date for a given Date.
 */
function getWeekInfo(date: Date): { week: string; weekStart: string } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const week = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;

  // Monday of the given week
  const mon = new Date(date);
  const day = mon.getUTCDay();
  const diff = mon.getUTCDate() - day + (day === 0 ? -6 : 1);
  mon.setUTCDate(diff);
  const weekStart = mon.toISOString().split('T')[0];

  return { week, weekStart };
}

/**
 * Main Performance Analysis Engine.
 * Takes raw or enriched posts and computes a comprehensive, deterministic AnalyticsReport.
 */
export function generateAnalyticsReport(posts: InstagramPost[]): AnalyticsReport {
  const enriched = posts.map((p) => ('weightedEngagementRate' in p ? (p as EnrichedPost) : enrichPost(p)));

  if (enriched.length === 0) {
    return createEmptyReport();
  }

  // 1. Overview
  let totalReach = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalReelViews = 0;
  let sumEngagementRate = 0;

  for (const post of enriched) {
    totalReach += post.reach;
    totalLikes += post.likes;
    totalComments += post.comments;
    sumEngagementRate += post.weightedEngagementRate;
    if (post.postType === 'REEL' && post.views !== null) {
      totalReelViews += post.views;
    }
  }

  const overview: OverviewMetrics = {
    totalPosts: enriched.length,
    avgWeightedEngagementRate: Number((sumEngagementRate / enriched.length).toFixed(2)),
    totalReach,
    totalLikes,
    totalComments,
    totalReelViews,
  };

  // 2. Top 5 & Worst 5 Posts
  const sortedDesc = [...enriched].sort((a, b) => b.weightedEngagementRate - a.weightedEngagementRate);
  const sortedAsc = [...enriched].sort((a, b) => a.weightedEngagementRate - b.weightedEngagementRate);

  const topPosts = sortedDesc.slice(0, 5);
  const worstPosts = sortedAsc.slice(0, 5);

  // 3. Format Breakdown
  const formats: PostType[] = ['REEL', 'CAROUSEL', 'IMAGE'];
  const formatBreakdown = {} as Record<PostType, FormatPerformance>;

  for (const fmt of formats) {
    const fmtPosts = enriched.filter((p) => p.postType === fmt);
    const count = fmtPosts.length;

    if (count === 0) {
      formatBreakdown[fmt] = {
        format: fmt,
        postCount: 0,
        avgWeightedEngagementRate: 0,
        avgReach: 0,
        avgLikes: 0,
        avgComments: 0,
        avgViews: null,
        avgReplayRatio: null,
      };
      continue;
    }

    const fmtReach = fmtPosts.reduce((acc, p) => acc + p.reach, 0);
    const fmtLikes = fmtPosts.reduce((acc, p) => acc + p.likes, 0);
    const fmtComments = fmtPosts.reduce((acc, p) => acc + p.comments, 0);
    const fmtWer = fmtPosts.reduce((acc, p) => acc + p.weightedEngagementRate, 0);

    let avgViews: number | null = null;
    let avgReplayRatio: number | null = null;

    if (fmt === 'REEL') {
      const reelViewsSum = fmtPosts.reduce((acc, p) => acc + (p.views || 0), 0);
      avgViews = Math.round(reelViewsSum / count);

      const validRatios = fmtPosts
        .map((p) => p.replayRatio)
        .filter((r): r is number => typeof r === 'number' && !isNaN(r));

      if (validRatios.length > 0) {
        const ratioSum = validRatios.reduce((acc, r) => acc + r, 0);
        avgReplayRatio = Number((ratioSum / validRatios.length).toFixed(2));
      }
    }

    formatBreakdown[fmt] = {
      format: fmt,
      postCount: count,
      avgWeightedEngagementRate: Number((fmtWer / count).toFixed(2)),
      avgReach: Math.round(fmtReach / count),
      avgLikes: Math.round(fmtLikes / count),
      avgComments: Math.round(fmtComments / count),
      avgViews,
      avgReplayRatio,
    };
  }

  // 4. Topic Breakdown (sorted best to worst by avgWeightedEngagementRate descending)
  const topicMap = new Map<string, EnrichedPost[]>();
  for (const post of enriched) {
    const list = topicMap.get(post.topic) || [];
    list.push(post);
    topicMap.set(post.topic, list);
  }

  const topicBreakdown: TopicPerformance[] = Array.from(topicMap.entries()).map(([topic, tPosts]) => {
    const count = tPosts.length;
    const tReach = tPosts.reduce((acc, p) => acc + p.reach, 0);
    const tLikes = tPosts.reduce((acc, p) => acc + p.likes, 0);
    const tComments = tPosts.reduce((acc, p) => acc + p.comments, 0);
    const tWer = tPosts.reduce((acc, p) => acc + p.weightedEngagementRate, 0);
    const commentToReach = tReach > 0 ? Number(((tComments / tReach) * 100).toFixed(2)) : 0;

    return {
      topic,
      postCount: count,
      avgWeightedEngagementRate: Number((tWer / count).toFixed(2)),
      avgReach: Math.round(tReach / count),
      avgLikes: Math.round(tLikes / count),
      avgComments: Math.round(tComments / count),
      commentToReachRatio: commentToReach,
    };
  });

  topicBreakdown.sort((a, b) => b.avgWeightedEngagementRate - a.avgWeightedEngagementRate);

  // 5. Temporal Trends
  // 5a. byDayOfWeek (Monday through Sunday)
  const byDayOfWeek: DayOfWeekTrend[] = DAYS_MAP.map(({ day, jsDay }, index) => {
    const dayPosts = enriched.filter((p) => new Date(p.publishedAt).getUTCDay() === jsDay);
    const count = dayPosts.length;
    const werSum = dayPosts.reduce((acc, p) => acc + p.weightedEngagementRate, 0);

    return {
      day,
      dayIndex: index + 1, // 1 for Monday to 7 for Sunday
      postCount: count,
      avgWeightedEngagementRate: count > 0 ? Number((werSum / count).toFixed(2)) : 0,
    };
  });

  // 5b. byHourBucket
  const hourBuckets: Array<{
    bucket: HourBucketTrend['bucket'];
    min: number;
    max: number;
  }> = [
    { bucket: 'Morning (06–11)', min: 6, max: 11 },
    { bucket: 'Afternoon (12–17)', min: 12, max: 17 },
    { bucket: 'Evening (18–23)', min: 18, max: 23 },
    { bucket: 'Night (00–05)', min: 0, max: 5 },
  ];

  const byHourBucket: HourBucketTrend[] = hourBuckets.map(({ bucket, min, max }) => {
    const bPosts = enriched.filter((p) => {
      const h = new Date(p.publishedAt).getUTCHours();
      return h >= min && h <= max;
    });
    const count = bPosts.length;
    const werSum = bPosts.reduce((acc, p) => acc + p.weightedEngagementRate, 0);

    return {
      bucket,
      postCount: count,
      avgWeightedEngagementRate: count > 0 ? Number((werSum / count).toFixed(2)) : 0,
    };
  });

  // 5c. weeklyTrend (sorted chronologically)
  const weekMap = new Map<string, { weekStart: string; posts: EnrichedPost[] }>();
  for (const post of enriched) {
    const { week, weekStart } = getWeekInfo(new Date(post.publishedAt));
    const entry = weekMap.get(week) || { weekStart, posts: [] };
    entry.posts.push(post);
    weekMap.set(week, entry);
  }

  const weeklyTrend: WeeklyTrend[] = Array.from(weekMap.entries())
    .map(([week, { weekStart, posts: wPosts }]) => {
      const count = wPosts.length;
      const werSum = wPosts.reduce((acc, p) => acc + p.weightedEngagementRate, 0);
      return {
        week,
        weekStart,
        postCount: count,
        avgWeightedEngagementRate: Number((werSum / count).toFixed(2)),
      };
    })
    .sort((a, b) => a.week.localeCompare(b.week));

  const temporalTrends: TemporalTrends = {
    byDayOfWeek,
    byHourBucket,
    weeklyTrend,
  };

  // 6. Caption Patterns
  const qPosts = enriched.filter((p) => p.hasQuestionHook);
  const nonQPosts = enriched.filter((p) => !p.hasQuestionHook);

  const questionHooks: HookPerformance = {
    count: qPosts.length,
    avgWeightedEngagementRate:
      qPosts.length > 0 ? Number((qPosts.reduce((acc, p) => acc + p.weightedEngagementRate, 0) / qPosts.length).toFixed(2)) : 0,
  };

  const nonQuestionHooks: HookPerformance = {
    count: nonQPosts.length,
    avgWeightedEngagementRate:
      nonQPosts.length > 0
        ? Number((nonQPosts.reduce((acc, p) => acc + p.weightedEngagementRate, 0) / nonQPosts.length).toFixed(2))
        : 0,
  };

  const lengthBuckets: CaptionLengthBucket[] = ['SHORT', 'MEDIUM', 'LONG'];
  const byLength = {} as Record<CaptionLengthBucket, LengthBucketPerformance>;

  for (const lb of lengthBuckets) {
    const lbPosts = enriched.filter((p) => p.captionLengthBucket === lb);
    const count = lbPosts.length;
    byLength[lb] = {
      count,
      avgWeightedEngagementRate:
        count > 0 ? Number((lbPosts.reduce((acc, p) => acc + p.weightedEngagementRate, 0) / count).toFixed(2)) : 0,
    };
  }

  const captionPatterns: CaptionPatterns = {
    questionHooks,
    nonQuestionHooks,
    byLength,
  };

  return {
    overview,
    topPosts,
    worstPosts,
    formatBreakdown,
    topicBreakdown,
    temporalTrends,
    captionPatterns,
  };
}

function createEmptyReport(): AnalyticsReport {
  return {
    overview: {
      totalPosts: 0,
      avgWeightedEngagementRate: 0,
      totalReach: 0,
      totalLikes: 0,
      totalComments: 0,
      totalReelViews: 0,
    },
    topPosts: [],
    worstPosts: [],
    formatBreakdown: {
      REEL: {
        format: 'REEL',
        postCount: 0,
        avgWeightedEngagementRate: 0,
        avgReach: 0,
        avgLikes: 0,
        avgComments: 0,
        avgViews: null,
        avgReplayRatio: null,
      },
      CAROUSEL: {
        format: 'CAROUSEL',
        postCount: 0,
        avgWeightedEngagementRate: 0,
        avgReach: 0,
        avgLikes: 0,
        avgComments: 0,
        avgViews: null,
        avgReplayRatio: null,
      },
      IMAGE: {
        format: 'IMAGE',
        postCount: 0,
        avgWeightedEngagementRate: 0,
        avgReach: 0,
        avgLikes: 0,
        avgComments: 0,
        avgViews: null,
        avgReplayRatio: null,
      },
    },
    topicBreakdown: [],
    temporalTrends: {
      byDayOfWeek: DAYS_MAP.map(({ day }, index) => ({
        day,
        dayIndex: index + 1,
        postCount: 0,
        avgWeightedEngagementRate: 0,
      })),
      byHourBucket: [
        { bucket: 'Morning (06–11)', postCount: 0, avgWeightedEngagementRate: 0 },
        { bucket: 'Afternoon (12–17)', postCount: 0, avgWeightedEngagementRate: 0 },
        { bucket: 'Evening (18–23)', postCount: 0, avgWeightedEngagementRate: 0 },
        { bucket: 'Night (00–05)', postCount: 0, avgWeightedEngagementRate: 0 },
      ],
      weeklyTrend: [],
    },
    captionPatterns: {
      questionHooks: { count: 0, avgWeightedEngagementRate: 0 },
      nonQuestionHooks: { count: 0, avgWeightedEngagementRate: 0 },
      byLength: {
        SHORT: { count: 0, avgWeightedEngagementRate: 0 },
        MEDIUM: { count: 0, avgWeightedEngagementRate: 0 },
        LONG: { count: 0, avgWeightedEngagementRate: 0 },
      },
    },
  };
}
