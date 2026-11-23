import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { InstagramPostSchema } from '../src/schemas/content.schema';
import { SimulatedInstagramProvider } from '../src/ingestion/simulated.provider';
import { InstagramGraphProvider, NotImplementedError } from '../src/ingestion/instagram.provider';

describe('Ingestion Layer & Content Schemas', () => {
  describe('InstagramPostSchema Validation', () => {
    it('successfully validates a valid REEL post', () => {
      const validReel = {
        postId: 'test_reel_1',
        caption: '5 AI tools for developers:\n1. Ollama...',
        postType: 'REEL' as const,
        topic: 'Tutorial',
        publishedAt: '2026-11-20T18:30:00.000Z',
        likes: 2500,
        comments: 320,
        views: 45000,
        saves: 800,
      };

      const result = InstagramPostSchema.safeParse(validReel);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.postId).toBe('test_reel_1');
        expect(result.data.postType).toBe('REEL');
        expect(result.data.views).toBe(45000);
      }
    });

    it('successfully validates a valid IMAGE post with views: null', () => {
      const validImage = {
        postId: 'test_img_1',
        caption: 'Architecture diagram breakdown',
        postType: 'IMAGE' as const,
        topic: 'Case Study',
        publishedAt: '2026-11-21T19:00:00.000Z',
        likes: 350,
        comments: 42,
        views: null,
      };

      const result = InstagramPostSchema.safeParse(validImage);
      expect(result.success).toBe(true);
      if (result.success) {
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
        likes: 300,
        comments: 20,
        views: 5000, // Must be null for IMAGE
      };

      const result = InstagramPostSchema.safeParse(invalidImage);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues;
        expect(issues.some((issue) => issue.message === 'views must be null for IMAGE posts')).toBe(true);
      }
    });

    it('rejects posts with negative engagement values', () => {
      const invalidLikes = {
        postId: 'test_neg',
        caption: 'Negative metrics test',
        postType: 'REEL' as const,
        topic: 'Tutorial',
        publishedAt: '2026-11-21T19:00:00.000Z',
        likes: -10,
        comments: 5,
        views: 1000,
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
        likes: 100,
        comments: 10,
        views: 2000,
      };

      const result = InstagramPostSchema.safeParse(invalidDate);
      expect(result.success).toBe(false);
    });

    it('rejects unknown postType values', () => {
      const invalidType = {
        postId: 'test_bad_type',
        caption: 'Unknown type',
        postType: 'TIKTOK',
        topic: 'Tutorial',
        publishedAt: '2026-11-21T19:00:00.000Z',
        likes: 100,
        comments: 10,
        views: 2000,
      };

      const result = InstagramPostSchema.safeParse(invalidType);
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

      // Verify every single post satisfies the schema
      for (const post of posts) {
        const validation = InstagramPostSchema.safeParse(post);
        expect(validation.success).toBe(true);
      }
    });

    it('enforces that all static IMAGE posts have views === null', async () => {
      const posts = await provider.fetchPosts();
      const imagePosts = posts.filter((p) => p.postType === 'IMAGE');

      expect(imagePosts.length).toBeGreaterThan(0);
      for (const imagePost of imagePosts) {
        expect(imagePost.views).toBeNull();
      }
    });

    it('ensures REEL and CAROUSEL posts have positive view counts', async () => {
      const posts = await provider.fetchPosts();
      const videoPosts = posts.filter((p) => p.postType === 'REEL' || p.postType === 'CAROUSEL');

      expect(videoPosts.length).toBeGreaterThan(0);
      for (const post of videoPosts) {
        expect(typeof post.views).toBe('number');
        expect(post.views).toBeGreaterThan(0);
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
