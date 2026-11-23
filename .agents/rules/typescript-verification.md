---
trigger: glob
globs: "**/*.{ts,tsx}"
---

# TypeScript Quality & Verification Rules

1. **Strict TypeScript Standards**:
   - Maintain `strict: true` at all times.
   - Do not use `any` under any circumstances; use `unknown`, generics, or explicit domain types.
   - All function signatures must define explicit parameter and return types.

2. **Nullable Instagram Metrics Handling**:
   - Static Instagram posts (`media_type === "IMAGE"`) typically do not provide view counts via Instagram Graph APIs.
   - `views` must be typed as `number | null | undefined`.
   - Any engagement or analytics calculation that relies on a reach denominator must explicitly handle null/undefined `views` by using `ACCOUNT_FOLLOWER_BASELINE` as the safe fallback denominator.
   - Never perform un-guarded arithmetic operations like `(likes + comments) / post.views` without validating `post.views > 0`.

3. **Verification Before Task Completion**:
   - Always run `npm test` inside `backend/` before marking any backend task or refactor complete.
   - Ensure clean compilation with `npm run build` or `npx tsc --noEmit` with zero type errors.
