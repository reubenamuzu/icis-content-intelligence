import { z } from 'zod';

export const PostTypeEnum = z.enum(['REEL', 'CAROUSEL', 'IMAGE']);
export type PostType = z.infer<typeof PostTypeEnum>;

export const InstagramPostSchema = z
  .object({
    postId: z.string().min(1, 'postId must not be empty'),
    caption: z.string(),
    postType: PostTypeEnum,
    topic: z.string().min(1, 'topic must not be empty'),
    publishedAt: z.string().datetime({ message: 'publishedAt must be a valid ISO 8601 datetime string' }),
    reach: z.number().int().positive('reach must be a positive integer'),
    likes: z.number().int().nonnegative('likes must be a non-negative integer'),
    comments: z.number().int().nonnegative('comments must be a non-negative integer'),
    views: z.number().int().nonnegative('views must be a non-negative integer').nullable(),
    saves: z.number().int().nonnegative('saves must be a non-negative integer').optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.postType === 'IMAGE' || data.postType === 'CAROUSEL') && data.views !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'views must be null for IMAGE and CAROUSEL posts',
        path: ['views'],
      });
    }

    if (data.postType === 'REEL') {
      if (data.views === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'views must be populated for REEL posts',
          path: ['views'],
        });
      } else if (data.views < data.reach) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'views must be greater than or equal to reach for REEL posts',
          path: ['views'],
        });
      }
    }
  });

export type InstagramPost = z.infer<typeof InstagramPostSchema>;

// Strategy & Recommendation Schemas
export const RecommendationCategoryEnum = z.enum([
  'FORMAT_DOUBLE_DOWN',
  'CONTENT_THEME',
  'HOOK_AND_CAPTION',
  'POSTING_SCHEDULE',
  'UNDERPERFORMING_FIX',
]);
export type RecommendationCategory = z.infer<typeof RecommendationCategoryEnum>;

export const ExpectedImpactEnum = z.enum(['HIGH', 'MEDIUM']);
export type ExpectedImpact = z.infer<typeof ExpectedImpactEnum>;

export const RecommendationItemSchema = z.object({
  id: z.string().min(1, 'id must not be empty'),
  title: z.string().min(1, 'title must not be empty'),
  category: RecommendationCategoryEnum,
  recommendedFormat: PostTypeEnum,
  suggestedTopic: z.string().min(1, 'suggestedTopic must not be empty'),
  actionableBrief: z.string().min(1, 'actionableBrief must not be empty'),
  supportingPostIds: z.array(z.string()).min(1, 'supportingPostIds must contain at least 1 postId'),
  dataEvidence: z.string().min(1, 'dataEvidence must not be empty'),
  expectedImpact: ExpectedImpactEnum,
});
export type RecommendationItem = z.infer<typeof RecommendationItemSchema>;

export const ContentStrategyResponseSchema = z.object({
  executiveSummary: z.string().min(1, 'executiveSummary must not be empty'),
  keyPatterns: z.array(z.string()).min(1, 'keyPatterns must contain at least 1 item'),
  recommendations: z.array(RecommendationItemSchema).min(1, 'recommendations must contain at least 1 item'),
});
export type ContentStrategyResponse = z.infer<typeof ContentStrategyResponseSchema>;
