export type PostType = "REEL" | "CAROUSEL" | "IMAGE";

export interface InstagramPost {
  postId: string;
  caption: string;
  postType: PostType;
  topic: string;
  publishedAt: string;
  reach: number;
  likes: number;
  comments: number;
  views: number | null;
  saves?: number;
}

export type CaptionLengthBucket = "SHORT" | "MEDIUM" | "LONG";

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
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  dayIndex: number;
  postCount: number;
  avgWeightedEngagementRate: number;
}

export interface HourBucketTrend {
  bucket: "Morning (06–11)" | "Afternoon (12–17)" | "Evening (18–23)" | "Night (00–05)";
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

export type RecommendationCategory =
  | "FORMAT_DOUBLE_DOWN"
  | "CONTENT_THEME"
  | "HOOK_AND_CAPTION"
  | "POSTING_SCHEDULE"
  | "UNDERPERFORMING_FIX";

export type ExpectedImpact = "HIGH" | "MEDIUM";

export interface RecommendationItem {
  id: string;
  title: string;
  category: RecommendationCategory;
  recommendedFormat: PostType;
  suggestedTopic: string;
  actionableBrief: string;
  supportingPostIds: string[];
  dataEvidence: string;
  expectedImpact: ExpectedImpact;
}

export interface ContentStrategyResponse {
  executiveSummary: string;
  keyPatterns: string[];
  recommendations: RecommendationItem[];
}

export interface PostFilters {
  postType?: PostType;
  topic?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new Error(
      `Unable to reach the ICIS API at ${API_BASE_URL}. Check that the backend is running and accessible.`,
    );
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
        ? body.error
        : `The ICIS API request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function getPosts(filters?: PostFilters): Promise<InstagramPost[]> {
  const query = new URLSearchParams();
  if (filters?.postType) query.set("postType", filters.postType);
  if (filters?.topic) query.set("topic", filters.topic);
  const search = query.size > 0 ? `?${query.toString()}` : "";
  return request<InstagramPost[]>(`/posts${search}`);
}

export function getAnalytics(): Promise<AnalyticsReport> {
  return request<AnalyticsReport>("/analytics");
}

export function generateRecommendations(): Promise<ContentStrategyResponse> {
  return request<ContentStrategyResponse>("/recommendations", { method: "POST" });
}
