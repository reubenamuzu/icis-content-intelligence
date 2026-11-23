import { z } from 'zod';

export const MediaTypeSchema = z.enum(['IMAGE', 'VIDEO', 'REEL', 'CAROUSEL_ALBUM']);
export type MediaType = z.infer<typeof MediaTypeSchema>;

export const NormalizedPostSchema = z.object({
  id: z.string(),
  caption: z.string(),
  mediaType: MediaTypeSchema,
  timestamp: z.string().datetime(),
  likes: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  views: z.number().int().nonnegative().nullable().optional(),
  permalink: z.string().url(),
});

export type NormalizedPost = z.infer<typeof NormalizedPostSchema>;

export interface AccountProfile {
  id: string;
  username: string;
  followerCount: number;
}

export interface IContentProvider {
  fetchPosts(limit?: number): Promise<NormalizedPost[]>;
  fetchAccountProfile(): Promise<AccountProfile>;
}
