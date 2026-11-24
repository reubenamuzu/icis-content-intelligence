import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { GeminiService, IGeminiClient, GeminiServiceError } from '../src/intelligence/gemini.service';
import { ContentStrategyResponse } from '../src/schemas/content.schema';

const mockStrategy: ContentStrategyResponse = {
  executiveSummary:
    'Tutorial carousels and high-replay reels are the primary growth engines for our AI engineering brand.',
  keyPatterns: [
    'Reels achieve 14.21% avg WER and 1.38x replay ratio.',
    'Tutorial topics generate 4.6x higher comment-to-reach ratio than Product Launch posts.',
    'Tuesday and Thursday evening slots (18:00-21:00 UTC) outperform daytime posting by 30%.',
  ],
  recommendations: [
    {
      id: 'rec_001',
      title: 'Double down on step-by-step AI Agent tutorials in Carousel format',
      category: 'FORMAT_DOUBLE_DOWN',
      recommendedFormat: 'CAROUSEL',
      suggestedTopic: 'Tutorial',
      actionableBrief:
        'Create a 5-slide carousel explaining multi-agent architectures. Hook: "Why are 90% of developers still building RAG pipelines the hard way?"',
      supportingPostIds: ['post_001', 'post_006'],
      dataEvidence:
        'Tutorials average 14.8% WER and 1.53% comment-to-reach ratio, outperforming static images by 3.7x.',
      expectedImpact: 'HIGH',
    },
    {
      id: 'rec_002',
      title: 'Shift deployment announcements from static images to video walkthroughs',
      category: 'UNDERPERFORMING_FIX',
      recommendedFormat: 'REEL',
      suggestedTopic: 'Product Launch',
      actionableBrief:
        'Turn release notes into 45-second screen recordings. Hook: "Here is what we shipped in ICIS v2.0."',
      supportingPostIds: ['post_049', 'post_059'],
      dataEvidence:
        'Posts post_049 and post_059 had 0 comments and under 2% WER when posted as static images.',
      expectedImpact: 'MEDIUM',
    },
  ],
};

function createMockGeminiClient(
  responsePayload: ContentStrategyResponse = mockStrategy,
  shouldFail = false,
  isRateLimit = false
): IGeminiClient {
  return {
    models: {
      generateContent: async () => {
        if (isRateLimit) {
          throw new Error('429 RESOURCE_EXHAUSTED: Rate limit exceeded');
        }
        if (shouldFail) {
          throw new Error('Internal Gemini API error');
        }
        return {
          text: JSON.stringify(responsePayload),
        };
      },
    },
  };
}

describe('Express REST API Routes (/api)', () => {
  const mockClient = createMockGeminiClient();
  const mockGeminiService = new GeminiService(mockClient);
  const testApp = createApp(undefined, mockGeminiService);

  describe('GET /api/posts', () => {
    it('returns all 60 normalized posts with status 200', async () => {
      const res = await request(testApp).get('/api/posts');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(60);

      const first = res.body[0];
      expect(first).toHaveProperty('postId');
      expect(first).toHaveProperty('reach');
      expect(first).toHaveProperty('likes');
      expect(first).toHaveProperty('comments');
      expect(first).toHaveProperty('views');
    });

    it('filters posts by postType=REEL', async () => {
      const res = await request(testApp).get('/api/posts?postType=REEL');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(25);
      for (const p of res.body) {
        expect(p.postType).toBe('REEL');
        expect(typeof p.views).toBe('number');
      }
    });

    it('filters posts by postType=CAROUSEL', async () => {
      const res = await request(testApp).get('/api/posts?postType=CAROUSEL');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(20);
      for (const p of res.body) {
        expect(p.postType).toBe('CAROUSEL');
        expect(p.views).toBeNull();
      }
    });

    it('filters posts by postType=IMAGE', async () => {
      const res = await request(testApp).get('/api/posts?postType=IMAGE');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(15);
      for (const p of res.body) {
        expect(p.postType).toBe('IMAGE');
        expect(p.views).toBeNull();
      }
    });

    it('filters posts by topic=Tutorial', async () => {
      const res = await request(testApp).get('/api/posts?topic=Tutorial');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      for (const p of res.body) {
        expect(p.topic.toLowerCase()).toBe('tutorial');
      }
    });

    it('returns 400 Bad Request for an invalid postType parameter', async () => {
      const res = await request(testApp).get('/api/posts?postType=INVALID_TYPE');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('Allowed values are REEL, CAROUSEL, IMAGE');
    });
  });

  describe('GET /api/analytics', () => {
    it('returns 200 with a complete AnalyticsReport', async () => {
      const res = await request(testApp).get('/api/analytics');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('overview');
      expect(res.body).toHaveProperty('topPosts');
      expect(res.body).toHaveProperty('worstPosts');
      expect(res.body).toHaveProperty('formatBreakdown');
      expect(res.body).toHaveProperty('topicBreakdown');
      expect(res.body).toHaveProperty('temporalTrends');
      expect(res.body).toHaveProperty('captionPatterns');

      // Overview verification
      expect(res.body.overview.totalPosts).toBe(60);
      expect(res.body.overview.totalReach).toBeGreaterThan(0);

      // Top & Worst posts verification
      expect(res.body.topPosts).toHaveLength(5);
      expect(res.body.worstPosts).toHaveLength(5);
      expect(res.body.topPosts[0].weightedEngagementRate).toBeGreaterThan(
        res.body.worstPosts[0].weightedEngagementRate
      );

      // Format breakdown verification
      expect(res.body.formatBreakdown.REEL.postCount).toBe(25);
      expect(res.body.formatBreakdown.CAROUSEL.postCount).toBe(20);
      expect(res.body.formatBreakdown.IMAGE.postCount).toBe(15);
    });
  });

  describe('POST /api/recommendations', () => {
    it('returns 200 with data-grounded ContentStrategyResponse when Gemini succeeds', async () => {
      const res = await request(testApp).post('/api/recommendations');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('executiveSummary');
      expect(res.body).toHaveProperty('keyPatterns');
      expect(res.body).toHaveProperty('recommendations');

      expect(res.body.executiveSummary).toContain('Tutorial carousels');
      expect(res.body.keyPatterns).toHaveLength(3);
      expect(res.body.recommendations).toHaveLength(2);

      const rec = res.body.recommendations[0];
      expect(rec.id).toBe('rec_001');
      expect(rec.category).toBe('FORMAT_DOUBLE_DOWN');
      expect(rec.recommendedFormat).toBe('CAROUSEL');
      expect(rec.supportingPostIds).toContain('post_001');
      expect(rec.expectedImpact).toBe('HIGH');
    });

    it('returns 429 when Gemini API rate limit is exceeded', async () => {
      const rateLimitedClient = createMockGeminiClient(mockStrategy, false, true);
      const rateLimitedService = new GeminiService(rateLimitedClient);
      const appWithRateLimit = createApp(undefined, rateLimitedService);

      const res = await request(appWithRateLimit).post('/api/recommendations');

      expect(res.status).toBe(429);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('rate limit');
    });

    it('returns 500 when Gemini API throws an unexpected internal error', async () => {
      const failingClient = createMockGeminiClient(mockStrategy, true);
      const failingService = new GeminiService(failingClient);
      const appWithFailure = createApp(undefined, failingService);

      const res = await request(appWithFailure).post('/api/recommendations');

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('Gemini API generation failed');
    });

    it('rejects recommendations citing non-existent postIds with 500 error', async () => {
      const hallucinatedStrategy: ContentStrategyResponse = {
        ...mockStrategy,
        recommendations: [
          {
            ...mockStrategy.recommendations[0],
            supportingPostIds: ['post_FAKE_999'],
          },
        ],
      };

      const hallucinatingClient = createMockGeminiClient(hallucinatedStrategy);
      const hallucinatingService = new GeminiService(hallucinatingClient);
      const appWithHallucination = createApp(undefined, hallucinatingService);

      const res = await request(appWithHallucination).post('/api/recommendations');

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('cited non-existent postId(s): post_FAKE_999');
    });
  });
});
