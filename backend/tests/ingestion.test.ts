import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { InstagramPostSchema } from '../src/schemas/content.schema';
import { SimulatedInstagramProvider } from '../src/ingestion/simulated.provider';
import { InstagramGraphProvider, NotImplementedError } from '../src/ingestion/instagram.provider';

describe('Ingestion Layer & Content Schemas', () => {
  describe('InstagramPostSchema Validation', () => {
    it('successfully validates a valid REEL post with views >= reach', () => {
      const validReel = {
        postId: 'test_reel_1',
        caption: '5 AI tools for developers:\n1. Ollama...',
        postType: 'REEL' as const,
        topic: 'Tutorial',
        publishedAt: '2026-11-20T18:30:00.000Z',
        reach: 12000,
        likes: 1500,
        comments: 280,
        views: 18500, // views >= reach (replays)
        saves: 450,
      };

      const result = InstagramPostSchema.safeParse(validReel);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.postId).toBe('test_reel_1');
        expect(result.data.postType).toBe('REEL');
        expect(result.data.reach).toBe(12000);
        expect(result.data.views).toBe(18500);
      }
    });

    it('successfully validates a valid CAROUSEL post with views: null and positive reach', () => {
      const validCarousel = {
        postId: 'test_car_1',
        caption: 'Architecture patterns for multi-agent systems:\n1. Router...',
        postType: 'CAROUSEL' as const,
        topic: 'Case Study',
        publishedAt: '2026-11-21T18:30:00.000Z',
        reach: 8500,
        likes: 950,
        comments: 140,
        views: null, // Must be null for CAROUSEL
        saves: 300,
      };

      const result = InstagramPostSchema.safeParse(validCarousel);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.postType).toBe('CAROUSEL');
        expect(result.data.reach).toBe(8500);
        expect(result.data.views).toBeNull();
      }
    });

    it('successfully validates a valid IMAGE post with views: null and positive reach', () => {
      const validImage = {
        postId: 'test_img_1',
        caption: 'Late night deployment session complete.',
        postType: 'IMAGE' as const,
        topic: 'Behind the Scenes',
        publishedAt: '2026-11-22T20:00:00.000Z',
        reach: 3200,
        likes: 120,
        comments: 8,
        views: null, // Must be null for IMAGE
      };

      const result = InstagramPostSchema.safeParse(validImage);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.postType).toBe('IMAGE');
        expect(result.data.reach).toBe(3200);
        expect(result.data.views).toBeNull();
      }
    });

    it('rejects an IMAGE post that has a non-null view count', () => {
      const invalidImage = {
        postId: 'test_img_invalid',
        caption: 'Static image with views should fail',
        postType: 'IMAGE' as const,
        topic: 'Behind the Scenes',
        publishedAt: '2026-11-21T19:00:00.000Z',
        reach: 3000,
        likes: 300,
        comments: 20,
        views: 4500, // Must be null for IMAGE
      };

      const result = InstagramPostSchema.safeParse(invalidImage);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues;
        expect(issues.some((issue) => issue.message === 'views must be null for IMAGE and CAROUSEL posts')).toBe(true);
      }
    });

    it('rejects a CAROUSEL post that has a non-null view count', () => {
      const invalidCarousel = {
        postId: 'test_car_invalid',
        caption: 'Carousel with views should fail',
        postType: 'CAROUSEL' as const,
        topic: 'Tutorial',
        publishedAt: '2026-11-21T19:00:00.000Z',
        reach: 5000,
        likes: 400,
        comments: 30,
        views: 6000, // Must be null for CAROUSEL
      };

      const result = InstagramPostSchema.safeParse(invalidCarousel);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues;
        expect(issues.some((issue) => issue.message === 'views must be null for IMAGE and CAROUSEL posts')).toBe(true);
      }
    });

    it('rejects a REEL post that has views: null', () => {
      const invalidReel = {
        postId: 'test_reel_null_views',
        caption: 'Reel without views should fail',
        postType: 'REEL' as const,
        topic: 'Tutorial',
        publishedAt: '2026-11-21T19:00:00.000Z',
        reach: 8000,
        likes: 500,
        comments: 50,
        views: null, // Must be populated for REEL
      };

      const result = InstagramPostSchema.safeParse(invalidReel);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues;
        expect(issues.some((issue) => issue.message === 'views must be populated for REEL posts')).toBe(true);
      }
    });

    it('rejects a REEL post where views is less than reach', () => {
      const invalidReel = {
        postId: 'test_reel_low_views',
        caption: 'Reel where views < reach should fail',
        postType: 'REEL' as const,
        topic: 'Tutorial',
        publishedAt: '2026-11-21T19:00:00.000Z',
        reach: 10000,
        likes: 600,
        comments: 60,
        views: 8000, // views < reach is impossible (each reached account accounts for >= 1 view)
      };

      const result = InstagramPostSchema.safeParse(invalidReel);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues;
        expect(issues.some((issue) => issue.message === 'views must be greater than or equal to reach for REEL posts')).toBe(true);
      }
    });

    it('rejects posts with non-positive reach', () => {
      const invalidReach = {
        postId: 'test_zero_reach',
        caption: 'Zero reach test',
        postType: 'IMAGE' as const,
        topic: 'Tutorial',
        publishedAt: '2026-11-21T19:00:00.000Z',
        reach: 0, // Must be positive
        likes: 10,
        comments: 5,
        views: null,
      };

      const result = InstagramPostSchema.safeParse(invalidReach);
      expect(result.success).toBe(false);
    });

    it('rejects posts with negative engagement values', () => {
      const invalidLikes = {
        postId: 'test_neg',
        caption: 'Negative metrics test',
        postType: 'REEL' as const,
        topic: 'Tutorial',
        publishedAt: '2026-11-21T19:00:00.000Z',
        reach: 5000,
        likes: -10,
        comments: 5,
        views: 6000,
      };

      const result = InstagramPostSchema.safeParse(invalidLikes);
      expect(result.success).toBe(false);
    });

    it('rejects posts with invalid ISO datetimes', () => {
      const invalidDate = {
        postId: 'test_bad_date',
        caption: 'Bad date test',
        postType: 'CAROUSEL' as const,
        topic: 'Tutorial',
        publishedAt: 'invalid-date-string',
        reach: 5000,
        likes: 100,
        comments: 10,
        views: null,
      };

      const result = InstagramPostSchema.safeParse(invalidDate);
      expect(result.success).toBe(false);
    });
  });

  describe('SimulatedInstagramProvider with 60 Sample Posts', () => {
    const provider = new SimulatedInstagramProvider();

    it('has providerName set to "simulated"', () => {
      expect(provider.providerName).toBe('simulated');
    });

    it('successfully loads and validates all 60 sample posts', async () => {
      const posts = await provider.fetchPosts();
      expect(posts).toHaveLength(60);

      for (const post of posts) {
        const validation = InstagramPostSchema.safeParse(post);
        expect(validation.success).toBe(true);
      }
    });

    it('enforces that reach is a positive integer on all 60 posts', async () => {
      const posts = await provider.fetchPosts();
      for (const post of posts) {
        expect(typeof post.reach).toBe('number');
        expect(post.reach).toBeGreaterThan(0);
      }
    });

    it('enforces that views is null for all CAROUSEL and IMAGE posts', async () => {
      const posts = await provider.fetchPosts();
      const nonReels = posts.filter((p) => p.postType === 'IMAGE' || p.postType === 'CAROUSEL');

      expect(nonReels.length).toBe(35); // 20 Carousels + 15 Images
      for (const post of nonReels) {
        expect(post.views).toBeNull();
      }
    });

    it('enforces that all REEL posts have views >= reach', async () => {
      const posts = await provider.fetchPosts();
      const reels = posts.filter((p) => p.postType === 'REEL');

      expect(reels.length).toBe(25);
      for (const post of reels) {
        expect(typeof post.views).toBe('number');
        expect(post.views!).toBeGreaterThanOrEqual(post.reach);
      }
    });

    it('includes edge cases: at least 2 posts with 0 comments', async () => {
      const posts = await provider.fetchPosts();
      const zeroCommentPosts = posts.filter((p) => p.comments === 0);

      expect(zeroCommentPosts.length).toBeGreaterThanOrEqual(2);
    });

    it('throws error when the sample posts file does not exist', async () => {
      const invalidProvider = new SimulatedInstagramProvider(path.resolve(__dirname, 'non_existent.json'));
      await expect(invalidProvider.fetchPosts()).rejects.toThrow();
    });
  });

  describe('InstagramGraphProvider', () => {
    it('has providerName set to "instagram-graph-api"', () => {
      const provider = new InstagramGraphProvider();
      expect(provider.providerName).toBe('instagram-graph-api');
    });

    it('throws NotImplementedError when called without an access token', async () => {
      const provider = new InstagramGraphProvider('');
      await expect(provider.fetchPosts()).rejects.toThrowError(NotImplementedError);
      await expect(provider.fetchPosts()).rejects.toThrow(
        /requires a valid Meta Graph API v21\+ access token/i
      );
    });

    it('throws NotImplementedError stating stub status when an access token is provided', async () => {
      const provider = new InstagramGraphProvider('test_token_12345');
      await expect(provider.fetchPosts()).rejects.toThrowError(NotImplementedError);
      await expect(provider.fetchPosts()).rejects.toThrow(
        /adapter stub and not yet implemented/i
      );
    });
  });
});
