# Product Requirements Document (PRD)
## Instagram Content Intelligence System (ICIS)

### 1. Executive Summary & Product Vision
The **Instagram Content Intelligence System (ICIS)** transforms raw Instagram engagement metrics into deterministic performance analytics and grounded strategic recommendations. Rather than relying on generic AI prompts that hallucinate insights, ICIS uses a strictly layered architecture:
1. **Ingestion Layer**: Fetches and normalizes post metrics across multiple media types (`IMAGE`, `VIDEO`, `REEL`, `CAROUSEL`).
2. **Analytics Engine**: Computes deterministic statistical aggregates and a custom Weighted Engagement Rate without external side-effects or LLM dependencies.
3. **Intelligence Layer**: Feeds verified mathematical summaries into Google Gemini (`gemini-2.5-flash` via `@google/genai`) with structured JSON schema constraints to yield actionable, data-grounded content guidance.
4. **Presentation Layer**: Exposes an intuitive dark-mode dashboard built with Next.js App Router and `shadcn/ui`.

---

### 2. User Personas
- **Content Strategist / Social Media Manager**: Needs clear visibility into what themes, formats, and posting styles drive authentic audience commitment rather than superficial likes.
- **Brand Creator / Influencer**: Needs quick, prescriptive recommendations on future content topics, hook angles, and optimal media distribution based on historical performance.
- **Growth Analyst**: Demands deterministic, reproducible math for metric evaluation with strict separation between raw analytics and AI-generated insights.

---

### 3. Functional Requirements

#### FR1: Multi-Format Content Ingestion & Normalization
- The system must ingest post data through a swappable interface (`IContentProvider`).
- Supports media types: `IMAGE`, `VIDEO`, `REEL`, `CAROUSEL_ALBUM`.
- Normalizes disparate fields into a unified schema:
  - `id`: string
  - `caption`: string
  - `mediaType`: `"IMAGE" | "VIDEO" | "REEL" | "CAROUSEL_ALBUM"`
  - `timestamp`: ISO 8601 string
  - `likes`: non-negative integer
  - `comments`: non-negative integer
  - `views`: nullable non-negative integer (frequently `null` for static image posts)
  - `permalink`: string URL
- Validates all incoming payloads through Zod schemas before reaching downstream modules.

#### FR2: Deterministic Performance Analytics
- The analytics module must calculate deterministic metrics with zero LLM or framework dependencies.
- **Weighted Engagement Rate Formula**:
  $$\text{Engagement Rate (\%)} = \left( \frac{\text{likes} + 3 \times \text{comments}}{\text{denominator}} \right) \times 100$$
  - **Comment Weight Justification (3x)**:
    - **Cognitive Effort**: Liking a post requires a single double-tap or tap (low friction / passive interaction). Writing a comment requires reading, reflection, text entry, and public social commitment.
    - **Algorithmic Signal**: Social platform algorithms (specifically Meta's Graph ranking system) weight conversational feedback, replies, and active discussions significantly higher than passive likes when distributing content across Explore and recommended feeds.
    - **Intentionality**: Comments indicate active community building and intent, which directly correlates with audience retention and conversion.
  - **Adaptive Denominator Handling (`views` vs `ACCOUNT_FOLLOWER_BASELINE`)**:
    - For `VIDEO` and `REEL` formats, the Instagram API delivers concrete `views` (or video play counts). When `views` is present and $> 0$, `denominator = views`.
    - For static `IMAGE` posts, the Instagram Graph API does not provide a view or impression metric for organic media without advanced graph insights permissions. Thus, `views` is `null`.
    - When `views` is `null`, `undefined`, or $\le 0$, the formula safely falls back to `ACCOUNT_FOLLOWER_BASELINE` (configured via environment variable, e.g., 10,000) as the reach proxy.
    - Guard against division-by-zero: if both `views` and `ACCOUNT_FOLLOWER_BASELINE` are $\le 0$, the denominator defaults to 1.
- Aggregate metrics generated:
  - Mean Weighted Engagement Rate (overall and per media type)
  - Top 10% high-performing benchmark posts (outliers)
  - Bottom 10% underperforming benchmark posts
  - Comment-to-Like ratio across themes

#### FR3: Data-Grounded Content Intelligence (Gemini 2.5 Flash)
- Powered exclusively by the official `@google/genai` SDK using `gemini-2.5-flash`.
- Uses strictly enforced JSON schemas (`responseMimeType: "application/json"`, `responseSchema`).
- Prompts are injected with pre-calculated analytics metrics:
  - High and low quartile thresholds.
  - Media format efficiency rankings.
  - Caption keyword frequency and performance correlation.
- The model outputs:
  - **Strategic Summary**: Qualitative synthesis grounded in verified engagement math.
  - **Actionable Playbook**: 3–5 specific content tactics (topics, hooks, optimal media format).
  - **Format Distribution Recommendations**: Suggested target mix (e.g., 50% Reels, 30% Carousels, 20% Static Images).
- **Anti-Hallucination Guardrail**: The system prompt instructs Gemini to reference only provided analytics statistics and disallows inventing unmeasured metrics.

#### FR4: Modern Dashboard Interface
- Built with Next.js (App Router), TypeScript, and Tailwind CSS.
- Component library: `shadcn/ui` with dark mode enabled by default (`class="dark"` on `<html>`).
- Key UI Views:
  - **Overview Cards**: Key KPIs (Total Posts Analyzed, Mean Engagement Rate, Best Performing Format).
  - **Performance Table**: Sortable, filterable list of posts featuring badges for media type, raw likes/comments/views, and calculated engagement rates.
  - **Intelligence Recommendations Card**: Visual display of Gemini-generated strategy, hook templates, and format distribution.

---

### 4. Non-Functional Requirements
- **Performance**: Analytics calculations on up to 5,000 posts must execute in $< 50\text{ms}$.
- **Type Safety**: End-to-end TypeScript strict mode (`noImplicitAny`, `strictNullChecks`).
- **Resilience**: If the Gemini API experiences rate limiting or outages, the system gracefully falls back to returning the mathematical analytics without failing the entire request.
- **Maintainability**: Strict decoupling of layers—modifying ingestion or provider logic has zero impact on analytics math.
- **Testability**: Minimum 90% unit test coverage for `backend/src/analytics/` using `vitest`.
