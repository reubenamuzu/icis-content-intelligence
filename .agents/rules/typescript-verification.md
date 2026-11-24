---
trigger: glob
globs: "**/*.{ts,tsx}"
---

# TypeScript Quality & Verification Rules

1. **Strict TypeScript Standards**:
   - Maintain `strict: true` at all times.
   - Do not use `any` under any circumstances; use `unknown`, generics, or explicit domain types.
   - All function signatures must define explicit parameter and return types.

2. **Cross-Format Metric Scaling & Video Metrics Handling**:
   - The primary cross-format engagement metric is **Weighted Engagement Rate by Reach**:
     `((likes + 3 * comments) / reach) * 100`, evaluated uniformly across `REEL`, `CAROUSEL`, and `IMAGE`.
   - `views` represents video play count and must be typed as `number | null | undefined` (populated for `REEL`, nullable for `IMAGE` and `CAROUSEL`).
   - Do NOT use `views` as the engagement rate denominator; preserve it for Reel-specific metrics (such as `replayRatio = views / reach`).
   - If `reach` is absent or zero, fall back to `ACCOUNT_FOLLOWER_COUNT` uniformly across all formats.
   - Never perform un-guarded arithmetic operations; guard against division by zero by falling back to `1` when denominators are <= 0.

3. **Verification Before Task Completion**:
   - Always run `npm test` inside `backend/` before marking any backend task or refactor complete.
   - Ensure clean compilation with `npm run build` or `npx tsc --noEmit` with zero type errors.
