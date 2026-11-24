# Instagram Content Intelligence System (ICIS) - Development Rules

## 1. Architectural Guardrails

### Layered Backend Architecture (`backend/src/`)
Every backend component must strictly adhere to the separation of concerns across these layers:
- `backend/src/ingestion/`: Responsible solely for fetching external Instagram/content provider data and normalizing it to internal domain models via `IContentProvider`. No HTTP controllers, business analytics, or LLM logic permitted here.
- `backend/src/analytics/`: Pure, deterministic math and statistical calculations (e.g., Weighted Engagement Rate by Reach, replay ratio, standard deviation, percentile ranking). **Zero Express, HTTP, or LLM imports are allowed in this layer.** Cross-format metrics must use `reach` as the uniform denominator across all formats (`REEL`, `CAROUSEL`, `IMAGE`). `views` is reserved for video-specific metrics (e.g., `replayRatio = views / reach`) and must never be mixed into the cross-format engagement denominator. If `reach` is absent, fall back to `ACCOUNT_FOLLOWER_COUNT` uniformly across all formats.
- `backend/src/intelligence/`: High-level AI synthesis powered exclusively by the official `@google/genai` SDK. Consumes normalized data and analytics output to generate grounded recommendations and insights.
- `backend/src/routes/`: HTTP presentation layer. Handles request routing, input validation (using Zod schemas), and HTTP status code mapping only. Delegates directly to domain services without inline business logic.

### AI / LLM Integration Rules
- Use only the official `@google/genai` SDK with `gemini-2.5-flash`.
- Always configure structured output with `responseMimeType: "application/json"` and a concrete `responseSchema`.
- **NEVER** use the deprecated `@google/generative-ai` package.
- Ground all prompts with deterministic metric summaries from `backend/src/analytics/` to eliminate hallucinations.

### Validation & Type Safety
- All external data (API payloads, webhooks, scraped data) and environment variables must be validated using `zod`.
- Strict TypeScript (`strict: true`) must be maintained across all packages. Avoid `any` and unsafe type assertions.
- Ensure uniform cross-format metric scaling: calculate Weighted Engagement Rate using `reach` across all formats (`REEL`, `CAROUSEL`, `IMAGE`). Keep `views` (nullable for `IMAGE` and `CAROUSEL`, populated for `REEL`) decoupled for video-specific metrics (`replayRatio = views / reach`). If `reach` is missing from a provider, fall back to `ACCOUNT_FOLLOWER_COUNT` uniformly across all formats.

### Testing Standards
- Every service, analytical calculation, and route handler requires automated unit tests in `backend/tests/` using `vitest`.
- Business analytics functions must maintain 100% unit test coverage for edge cases (zero likes/comments, zero reach, fallback follower count, nullable views).

---

## 2. Frontend Architecture (`frontend/`)

- **Framework**: Next.js (App Router) + TypeScript + Tailwind CSS.
- **UI Component System**: `shadcn/ui` based on Radix UI primitives.
- **Theme**: Default to dark mode (`class="dark"` on `<html>`).
- **Core UI Primitives**: Use standardized `@/components/ui/*` primitives (`Card`, `Tabs`, `Badge`, `Button`, `Table`, `Select`).
- **State & Data Fetching**: Decoupled API client services communicating with `NEXT_PUBLIC_API_URL`.

## Git & Commit Attribution Rules (Strictly Enforced)
- NEVER run `git commit`, `git push`, or modify `git config` (`user.name` / `user.email`). Leave all Git staging, committing, and pushing to the user.
- NEVER add `Co-authored-by:` trailers (e.g., Gemini, Antigravity, or any AI agent) to commit messages or templates. All commits must reflect only the human repository owner.