# AI Coding Agent Log — Day 2

## 1. Tasks Delegated to Antigravity IDE
- **Spec & Guardrail Patch:** Updated `GEMINI.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `README.md`, and `.env.example` to normalize engagement rate across all post formats (`REEL`, `CAROUSEL`, `IMAGE`) using `reach`.
- **Prompt 2 (Data Ingestion Layer):** Delegated Zod schemas (`content.schema.ts`), `IContentProvider` adapter interface, `SimulatedInstagramProvider`, `InstagramGraphProvider` stub, 60-post dataset (`data/sample_posts.json`), and `tests/ingestion.test.ts`.
- **Prompt 3 (Deterministic Analytics Engine):** Delegated `analytics.service.ts` and `tests/analytics.test.ts`.
- **Prompt 4 (Gemini Intelligence & REST API):** Delegated `gemini.service.ts` (`@google/genai` Structured Outputs), Express routes (`icis.routes.ts`), and `tests/routes.test.ts`.

## 2. Guardrails & Instructions Established
- Enforced a single cross-format metric scale in `GEMINI.md` and `PRD.md`: `weightedEngagementRate = ((likes + 3 * comments) / reach) * 100` across all formats, isolating `views` as a Reel-only metric (`replayRatio = views / reach`).
- Required deterministic pre-aggregation in `analytics.service.ts` before invoking Gemini, plus post-generation Zod validation verifying that every cited `supportingPostIds` entry exists in the ingested dataset.

## 3. Problems & Bugs Encountered (Agent Output & Design Review)
1. **Cross-Format Engagement Scale Mismatch (Caught in Peer Review):**
   - *Issue:* The initial Day 1 formula divided Reels by `views` (Engagement Rate by Views) while dividing Carousels/Images by `ACCOUNT_FOLLOWER_BASELINE` (Engagement Rate by Followers), placing different formats on incompatible mathematical scales.
   - *Investigation & Fix:* Replaced the conditional denominator with `reach` (unique accounts reached, available across all three Instagram post types) so Reels, Carousels, and Images are compared apples-to-apples. Added an equal-scale unit test requirement in `tests/analytics.test.ts`.
2. **[Add any bug caught during Prompt 2 — e.g., invalid ISO dates or `views` set on `IMAGE` posts in `sample_posts.json`]:**
   - *Issue:* ...
   - *Investigation & Fix:* ...
3. **[Add any bug caught during Prompts 3 & 4 — e.g., Gemini `responseSchema` type formatting or CORS configuration]:**
   - *Issue:* ...
   - *Investigation & Fix:* ...

## 4. Verification
- `[ ]` `npm test` passing for `tests/ingestion.test.ts` (60/60 posts validated).
- `[ ]` `npm test` passing for `tests/analytics.test.ts` (equal-scale and zero-division edge cases verified).
- `[ ]` `npm run build && npm test` passing for `tests/routes.test.ts` and live `POST /api/recommendations` call verified.