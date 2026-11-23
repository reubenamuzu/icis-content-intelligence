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

#### 3.1 Mathematical Formula
For any given post $p$:

$$\text{WER}(p) = \left( \frac{\text{likes}_p + 3 \times \text{comments}_p}{\text{denom}(p)} \right) \times 100$$

Where the denominator $\text{denom}(p)$ is determined by:

$$\text{denom}(p) = \begin{cases} \text{views}_p & \text{if } \text{views}_p \in \mathbb{N} \land \text{views}_p > 0 \\ \text{ACCOUNT\_FOLLOWER\_BASELINE} & \text{if } \text{views}_p \text{ is } \text{null, undefined, or } \le 0 \end{cases}$$

If both $\text{views}_p$ and $\text{ACCOUNT\_FOLLOWER\_BASELINE}$ are $\le 0$, $\text{denom}(p) = 1$ to prevent division by zero.

#### 3.2 Metric Design Rationale
1. **Comment Multiplier ($3\times$)**:
   - Comments require significantly higher cognitive overhead and active platform commitment than a double-tap like.
   - Algorithms prioritizing conversational threads reward comments with amplified distribution across discovery feeds.
   - Empirical studies on Instagram engagement indicate comments represent $3\times$ to $5\times$ higher retention and brand recall value than passive likes.
2. **Adaptive Denominator Handling (`views` vs `ACCOUNT_FOLLOWER_BASELINE`)**:
   - Video formats (`VIDEO`, `REEL`) record explicit view/play counts, representing actual impressions. Measuring engagement relative to views reflects true conversion efficiency per impression.
   - Static images (`IMAGE`) lack impression data in organic API endpoints, returning `views: null`. Falling back to `ACCOUNT_FOLLOWER_BASELINE` anchors the post to total audience reach, preventing false infinity or skewed $0\%$ outputs while ensuring equitable comparison across formats.

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
  views: number | null; // Nullable for IMAGE posts
  permalink: string;
}

export interface PostAnalyticsResult {
  post: NormalizedPost;
  weightedEngagementRate: number;
  effectiveDenominator: number;
  denominatorType: 'VIEWS' | 'FOLLOWER_BASELINE' | 'FALLBACK';
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
