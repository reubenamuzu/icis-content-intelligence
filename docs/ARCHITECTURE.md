# Architecture Specification
## Instagram Content Intelligence System (ICIS)

### 1. System Overview & Component Topology

```
+---------------------------------------------------------------------------------------+
|                                    FRONTEND (Next.js)                                 |
|   App Router | Tailwind CSS | shadcn/ui (Dark Mode Default) | TypeScript UI Primitives |
+---------------------------------------------------------------------------------------+
                                            |
                                      REST / JSON
                                            v
+---------------------------------------------------------------------------------------+
|                                   BACKEND (Express API)                               |
|                                                                                       |
|   +-------------------------------------------------------------------------------+   |
|   | 1. HTTP / Route Layer (src/routes/)                                           |   |
|   |    - Request validation via Zod schemas                                       |   |
|   |    - HTTP status mapping and error handling                                   |   |
|   +-------------------------------------------------------------------------------+   |
|           |                                       |                                   |
|           v                                       v                                   |
|   +-------------------------------+       +---------------------------------------+   |
|   | 2. Ingestion Layer            |       | 3. Analytics Layer (src/analytics/)   |   |
|   |    (src/ingestion/)           | ----> |    - Pure deterministic math          |   |
|   |    - IContentProvider         |       |    - Zero Express / zero LLM imports  |   |
|   |    - Mock / Graph API adapter |       |    - Weighted Engagement calculations |   |
|   |    - Schema normalization     |       +---------------------------------------+   |
|   +-------------------------------+                           |                       |
|                                                               v                       |
|                                           +---------------------------------------+   |
|                                           | 4. Intelligence Layer                 |   |
|                                           |    (src/intelligence/)                |   |
|                                           |    - Google GenAI SDK (@google/genai) |   |
|                                           |    - gemini-2.5-flash                 |   |
|                                           |    - Structured JSON output schemas   |   |
|                                           +---------------------------------------+   |
+---------------------------------------------------------------------------------------+
```

---

### 2. Architectural Layer Boundary Specifications

#### 2.1 Ingestion Layer (`backend/src/ingestion/`)
- **Responsibility**: Interface with external sources (Instagram Basic Display API, Instagram Graph API, or mock JSON datasets) and normalize external schemas into ICIS domain models.
- **Core Interface**:
  ```typescript
  export interface IContentProvider {
    fetchPosts(limit?: number): Promise<NormalizedPost[]>;
    fetchAccountProfile(): Promise<AccountProfile>;
  }
  ```
- **Rules**:
  - Must never import `express`, HTTP response handlers, or Gemini AI SDKs.
  - Must validate all raw payloads using `zod`.
  - Must normalize missing or `null` view counts on static posts to `null` (leaving fallback logic to analytics).

#### 2.2 Analytics Layer (`backend/src/analytics/`)
- **Responsibility**: Pure mathematical and statistical processing.
- **Constraints**:
  - **Zero side-effects**: Given the same inputs, functions always produce identical outputs.
  - **Zero Express or HTTP imports**: Cannot access `req`, `res`, or headers.
  - **Zero LLM imports**: Cannot call Google Gemini or any generative model.
- **Primary Metrics**:
  - Single-post Weighted Engagement Rate.
  - Aggregate metrics: mean, median, standard deviation, format breakdown, and quartile segmentation (top 10% vs bottom 10%).

#### 2.3 Intelligence Layer (`backend/src/intelligence/`)
- **Responsibility**: Contextual synthesis and strategic recommendation generation.
- **SDK**: Official `@google/genai` (model: `gemini-2.5-flash`).
- **Constraints**:
  - Structured output required: `responseMimeType: "application/json"` with an explicit `responseSchema`.
  - Grounded prompts: The prompt receives normalized post summaries and deterministic metrics calculated by the Analytics layer.
  - Prohibits deprecated `@google/generative-ai` package.

#### 2.4 Route Layer (`backend/src/routes/`)
- **Responsibility**: Request routing, query/body validation with Zod, and response formatting.
- **Rules**:
  - Controllers only coordinate calls between Ingestion, Analytics, and Intelligence.
  - No business logic or math formulas defined inside route callbacks.

---

### 3. Mathematical Specification: Weighted Engagement Rate

#### 3.1 Primary Cross-Format Metric: Weighted Engagement Rate by Reach
For any given post $p \in \{\text{REEL}, \text{CAROUSEL}, \text{IMAGE}\}$:

$$\text{WER}(p) = \left( \frac{\text{likes}_p + 3 \times \text{comments}_p}{\text{reach}_p} \right) \times 100$$

#### 3.2 Uniform Scale Rationale & Metric Decoupling
1. **Apples-to-Apples Cross-Format Comparability**:
   - In earlier iterations, conditional denominators (using `views` for Reels and an account follower baseline for static Images) created severe metric scale distortion. A Reel evaluated against 50,000 views and a static post evaluated against 10,000 baseline followers yielded non-comparable percentage figures.
   - `reach` measures unique accounts exposed to the post and is universally reported across Reels, Carousels, and Static Images. Using `reach` provides a single, uniform denominator across all formats on the exact same scale.

2. **Decoupling Video Metrics (`views` and `replayRatio`)**:
   - `views` represents total video impressions/plays. It is populated for `REEL` posts and `null` for static `IMAGE` and non-video `CAROUSEL` posts.
   - Rather than polluting the cross-format engagement denominator, `views` is isolated as a video-specific metric.
   - For `REEL` posts, ICIS computes:
     $$\text{replayRatio}(p) = \frac{\text{views}_p}{\text{reach}_p}$$
     A high `replayRatio` ($> 1.0$) demonstrates high retention and audience re-watching behavior.

3. **Universal Fallback Handling (`ACCOUNT_FOLLOWER_COUNT`)**:
   - In scenarios where an external provider does not supply `reach` (e.g., basic permission tiers), ICIS uses `followerCount` (via `ACCOUNT_FOLLOWER_COUNT`) applied **uniformly to ALL posts** in the dataset:
     $$\text{WER}_{\text{fallback}}(p) = \left( \frac{\text{likes}_p + 3 \times \text{comments}_p}{\text{ACCOUNT\_FOLLOWER\_COUNT}} \right) \times 100$$
   - The system never mixes `views` and `followerCount` in the same analytical comparison.
   - Division-by-zero protection: If the effective denominator is $\le 0$, it safely defaults to $1$.

---

### 4. Domain Data Contracts & Type Definitions

```typescript
export type MediaType = 'IMAGE' | 'VIDEO' | 'REEL' | 'CAROUSEL_ALBUM';

export interface NormalizedPost {
  id: string;
  caption: string;
  mediaType: MediaType;
  timestamp: string; // ISO 8601
  likes: number;
  comments: number;
  reach: number; // Unique accounts reached across all formats
  views: number | null; // Nullable for IMAGE & CAROUSEL; populated for REEL
  permalink: string;
}

export interface PostAnalyticsResult {
  post: NormalizedPost;
  weightedEngagementRate: number; // ((likes + 3 * comments) / reach) * 100
  replayRatio?: number | null; // views / reach (for REEL)
  effectiveDenominator: number;
  denominatorType: 'REACH' | 'FOLLOWER_COUNT' | 'FALLBACK';
}

export interface AggregateAnalytics {
  totalPosts: number;
  meanWeightedEngagementRate: number;
  formatPerformance: Record<MediaType, { count: number; meanEngagementRate: number }>;
  topPerformers: PostAnalyticsResult[];
  bottomPerformers: PostAnalyticsResult[];
}

export interface StrategicRecommendations {
  summary: string;
  topPerformingThemes: string[];
  recommendedFormatMix: {
    format: MediaType;
    targetPercentage: number;
    rationale: string;
  }[];
  contentHooks: string[];
  actionItems: string[];
}
```

---

### 5. Frontend Architecture (`frontend/`)

- **Framework**: Next.js 14+ (App Router).
- **Styling**: Tailwind CSS configured with CSS variables.
- **Theme**: Dark mode by default (`<html class="dark">`).
- **Component Primitives**: `shadcn/ui` based on Radix UI:
  - `Card`, `CardHeader`, `CardTitle`, `CardContent`
  - `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
  - `Badge` (used for `MediaType` and sentiment status)
  - `Button`
  - `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableCell`, `TableBody`
  - `Select`
- **Client/Server Boundary**:
  - Server components for initial static layout rendering.
  - Client components (`"use client"`) for interactive data filtering, sorting, and manual AI generation triggers.
