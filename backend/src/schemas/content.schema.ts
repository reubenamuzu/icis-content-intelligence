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
