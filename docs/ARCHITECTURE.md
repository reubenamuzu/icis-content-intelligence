# ICIS Architecture

## System flow

ICIS is a layered Instagram content intelligence prototype. The frontend presents
the product and collects user actions; the Express API coordinates providers,
deterministic analytics, and AI synthesis.

```mermaid 
flowchart LR
    U[User] --> F[Next.js App Router<br/>Linear-inspired Light Mode<br/>Tailwind CSS + shadcn/ui]
    F -->|REST / JSON| R[Express REST API]
    R -->|IContentProvider.fetchPosts| I[Ingestion<br/>Simulated JSON provider]
    I -->|Zod-validated InstagramPost[]| R
    R --> A[Deterministic AnalyticsService]
    A -->|AnalyticsReport| R
    R --> G[Gemini intelligence<br/>@google/genai · gemini-2.5-flash]
    G -->|JSON responseSchema| R
    R -->|JSON response| F
```

### Request lifecycle

1. The Next.js App Router dashboard fetches posts and analytics from the Express
   API. Its three views are AI Strategist, Analytics, and Post Feed. Interactive
   navigation includes a `⌘K`/`Ctrl+K` command menu and a shared slide-over post
   inspector.
2. `GET /api/posts` asks the configured `IContentProvider` for posts. The
   `SimulatedInstagramProvider` reads the sample JSON and validates each record
   with `InstagramPostSchema` before returning it.
3. `GET /api/analytics` passes provider posts to the deterministic analytics
   service, which returns an `AnalyticsReport`.
4. `POST /api/recommendations` uses the same provider and analytics report,
   supplies the verified data to Gemini, validates the returned strategy, and
   returns JSON to the frontend.

## Backend boundaries

| Layer | Responsibility | Important boundary |
| --- | --- | --- |
| `backend/src/ingestion/` | Fetch and normalize provider data through `IContentProvider`. | Provider payloads are validated against the domain Zod schema; this layer does not own HTTP routes, analytics, or LLM calls. |
| `backend/src/analytics/` | Deterministic enrichment, format/topic comparisons, temporal and caption trends, and post rankings. | Pure business calculations; no Express or generative-model dependencies. |
| `backend/src/intelligence/` | Evidence-grounded content-strategy synthesis with the official `@google/genai` SDK. | Uses `gemini-2.5-flash`, `GOOGLE_GENAI_API_VERSION=v1beta`, and a concrete JSON response schema. |
| `backend/src/routes/` | HTTP endpoints, query validation, status mapping, and service coordination. | Route handlers delegate calculations and AI synthesis to their domain layers. |

`IContentProvider` currently exposes `fetchPosts(): Promise<InstagramPost[]>`.
The simulated provider is the active implementation. `InstagramGraphProvider`
is an adapter stub, not a live Meta integration.

## Analytics and metric definitions

The cross-format Weighted Engagement Rate (WER) uses reach as its denominator
for Reels, Carousels, and Images:

```text
WER (%) = ((likes + 3 * comments) / reach) * 100
```

Reach represents unique accounts exposed to a post and is available across all
three formats, so using it makes engagement rates comparable. Likes represent
lightweight engagement; comments receive a 3× weight to recognize the greater
effort and intent they represent. The API's `InstagramPostSchema` requires
positive integer reach and validates that `views` is populated for Reels and
null for Carousels and Images.

Video views are kept separate from cross-format WER. For Reels only, the
analytics service calculates:

```text
replayRatio = views / reach
```

This ratio describes plays per reached account, including repeat plays, without
changing the denominator used to compare engagement across formats. The service
rounds per-post WER and replay ratio to two decimal places.

## AI grounding and hallucination guardrails

- The deterministic analytics service calculates aggregates, patterns, format
  comparisons, and ranked posts before Gemini is called. The model synthesizes
  the verified report; it is not asked to calculate raw statistics.
- Gemini uses the official `@google/genai` client with `gemini-2.5-flash`,
  `apiVersion: "v1beta"`, `responseMimeType: "application/json"`, and the
  explicit `contentStrategyResponseSchema`.
- The generated JSON is parsed and validated by
  `ContentStrategyResponseSchema` (Zod), including required recommendation
  fields and non-empty `supportingPostIds`.
- The service checks each cited `supportingPostId` against the IDs in the
  provider dataset and rejects recommendations that cite nonexistent posts.

## API and configuration

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health check and provider status. |
| `GET` | `/api/posts` | Posts; accepts optional `postType` and `topic` query filters. |
| `GET` | `/api/analytics` | Deterministic analytics report. |
| `POST` | `/api/recommendations` | Generate an evidence-backed strategy. |

Configure the backend in `backend/.env` with `PORT`, `GEMINI_API_KEY`, and
`GOOGLE_GENAI_API_VERSION=v1beta`. The frontend reads
`NEXT_PUBLIC_API_URL` from `frontend/.env.local`; the local default is
`http://localhost:4000/api`. See the root `.env.example` for the template.

## Architectural Trade-offs & v2 Production Roadmap

| v1 prototype choice | Why it fits the 3-day prototype | v2 production direction |
| --- | --- | --- |
| Simulated provider with 60 sample posts in JSON; Graph API adapter remains a stub. | Makes analytics and the AI experience repeatable without waiting on Meta app review, credentials, or account permissions. | Implement Meta Graph API integration with OAuth 2.0, token lifecycle and permission handling, pagination, rate-limit handling, and provider-payload validation. |
| Stateless JSON ingestion and on-demand analytics; no database or historical snapshots. | Keeps setup and deployment small while establishing a replaceable `IContentProvider` boundary and deterministic baseline. | Persist normalized posts and time-series performance snapshots in PostgreSQL to support history, trend comparisons, refreshes, and backfills. |
| Single workspace and no user/tenant authentication. | Concentrates the prototype on validating the analysis workflow and interface instead of identity, authorization, and tenant provisioning. | Add authenticated multi-tenant workspaces, tenant-scoped provider credentials and data, role-based access, and isolation tests. |

The roadmap describes planned production work; those v2 integrations are not
implemented in the current prototype.
