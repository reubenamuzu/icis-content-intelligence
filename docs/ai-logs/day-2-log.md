# AI Coding Agent Log — Day 2

## 1. Tasks Delegated to Antigravity IDE
- **Spec & Guardrail Patch:** Updated `GEMINI.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `README.md`, and `.env.example` to normalize engagement rate across all post formats (`REEL`, `CAROUSEL`, `IMAGE`) using `reach`.
- **Prompt 2 (Data Ingestion Layer):** Delegated Zod schemas (`content.schema.ts`), `IContentProvider` adapter interface, `SimulatedInstagramProvider`, `InstagramGraphProvider` stub, 60-post dataset (`data/sample_posts.json`), and `tests/ingestion.test.ts`.
- **Prompt 3 (Deterministic Analytics  Engine):** Delegated `analytics.service.ts` and `tests/analytics.test.ts`.
- **Prompt 4 (Gemini Intelligence & REST API):** Delegated `gemini.service.ts` (`@google/genai` Structured Outputs), Express routes (`icis.routes.ts`), and `tests/routes.test.ts`.

## 2. Guardrails & Instructions Established
- Enforced a single cross-format metric scale in `GEMINI.md` and `PRD.md`: `weightedEngagementRate = ((likes + 3 * comments) / reach) * 100` across all formats, isolating `views` as a Reel-only metric (`replayRatio = views / reach`).
- Required deterministic pre-aggregation in `analytics.service.ts` before invoking Gemini, plus post-generation Zod validation verifying that every cited `supportingPostIds` entry exists in the ingested dataset.

## 3. Problems & Bugs Encountered (Agent Output & Design Review)
1. **Cross-Format Engagement Scale Mismatch (Caught in Peer Review):**
   - *Issue:* The initial Day 1 formula divided Reels by `views` (Engagement Rate by Views) while dividing Carousels/Images by `ACCOUNT_FOLLOWER_BASELINE` (Engagement Rate by Followers), placing different formats on incompatible mathematical scales.
   - *Investigation & Fix:* Replaced the conditional denominator with `reach` (unique accounts reached, available across all three Instagram post types) so Reels, Carousels, and Images are compared apples-to-apples. Added an equal-scale unit test requirement in `tests/analytics.test.ts`.
2. **Gemini API v1 vs v1beta Developer Instruction Rejection (`HTTP 400 INVALID_ARGUMENT`):**
   - *Issue:* Calling `POST /api/recommendations` with `@google/genai` v3 caused the Gemini API to reject requests with `400 INVALID_ARGUMENT: Developer instruction is not enabled for api version v1. Use api version v1beta instead`. The `@google/genai` v3 client defaulted to API version `v1`, which rejects `systemInstruction` and structured schema configurations.
   - *Investigation & Fix:* Added `GOOGLE_GENAI_API_VERSION: z.string().default("v1beta")` to `backend/src/config/env.ts` and `.env.example`, updated `GeminiService` constructor to initialize `GoogleGenAI` with `apiVersion: env.GOOGLE_GENAI_API_VERSION`, and added the rule to `GEMINI.md`.
3. **Format-Specific Metric Decoupling (`views` vs `reach`):**
   - *Issue:* Mixing video play counts (`views`) into the general cross-format engagement rate denominator distorted comparisons for static images and carousels where views are null.
   - *Investigation & Fix:* Standardized `weightedEngagementRate` on `reach` across all formats in `analytics.service.ts`, keeping `views` and `replayRatio` as dedicated video-only metrics for `REEL` posts.

## 4. Verification
- `[x]` `npm test` passing for `tests/ingestion.test.ts` (60/60 posts validated).
- `[x]` `npm test` passing for `tests/analytics.test.ts` (equal-scale and zero-division edge cases verified).
- `[x]` `npm run build && npm test` passing for `tests/routes.test.ts` with mocked Gemini client and zero TypeScript or test errors.