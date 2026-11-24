import { describe, it, expect } from 'vitest';
import {
  calculateWeightedEngagementRate,
  calculateReplayRatio,
  hasQuestionHook,
  getCaptionLengthBucket,
  enrichPost,
  generateAnalyticsReport,
} from '../src/analytics/analytics.service';
import { InstagramPost } from '../src/schemas/content.schema';
import { SimulatedInstagramProvider } from '../src/ingestion/simulated.provider';

describe('Performance Analysis Engine (analytics.service.ts)', () => {
  describe('calculateWeightedEngagementRate', () => {
    it('equal-scale verification: REEL, CAROUSEL, and IMAGE with identical reach, likes, and comments produce identical rates', () => {
      const reach = 10000;
      const likes = 500;
      const comments = 100; // 100 * 3 = 300 -> total 800 -> 800 / 10000 * 100 = 8.00%

      const reelPost: InstagramPost = {
        postId: 'reel_scale_1',
        caption: 'Reel caption',
        postType: 'REEL',
        topic: 'Tutorial',
        publishedAt: '2026-11-20T18:00:00.000Z',
        reach,
        likes,
        comments,
        views: 18000, // Views are decoupled and do NOT alter the cross-format WER denominator
      };

      const carouselPost: InstagramPost = {
        postId: 'car_scale_1',
        caption: 'Carousel caption',
        postType: 'CAROUSEL',
        topic: 'Tutorial',
        publishedAt: '2026-11-20T18:00:00.000Z',
        reach,
        likes,
        comments,
        views: null,
      };

      const imagePost: InstagramPost = {
        postId: 'img_scale_1',
        caption: 'Image caption',
        postType: 'IMAGE',
        topic: 'Tutorial',
        publishedAt: '2026-11-20T18:00:00.000Z',
        reach,
        likes,
        comments,
        views: null,
      };

      const reelEnriched = enrichPost(reelPost);
      const carouselEnriched = enrichPost(carouselPost);
      const imageEnriched = enrichPost(imagePost);

      expect(reelEnriched.weightedEngagementRate).toBe(8.00);
      expect(carouselEnriched.weightedEngagementRate).toBe(8.00);
      expect(imageEnriched.weightedEngagementRate).toBe(8.00);

      // Verify direct function output
      expect(calculateWeightedEngagementRate(likes, comments, reach)).toBe(8.00);
    });

    it('handles edge case: reach <= 0 returns 0, never NaN or Infinity', () => {
      expect(calculateWeightedEngagementRate(100, 20, 0)).toBe(0);
      expect(calculateWeightedEngagementRate(100, 20, -500)).toBe(0);
      expect(Number.isNaN(calculateWeightedEngagementRate(100, 20, 0))).toBe(false);
      expect(Number.isFinite(calculateWeightedEngagementRate(100, 20, 0))).toBe(true);
    });

    it('handles edge case: 0 likes and 0 comments returns 0', () => {
      expect(calculateWeightedEngagementRate(0, 0, 10000)).toBe(0);
    });

    it('rounds to exactly 2 decimal places', () => {
      // (10 + 1 * 3) / 300 * 100 = 13 / 300 * 100 = 4.3333333... -> 4.33
      expect(calculateWeightedEngagementRate(10, 1, 300)).toBe(4.33);
    });
  });

  describe('calculateReplayRatio', () => {
    it('calculates replayRatio when views !== null and reach > 0', () => {
      expect(calculateReplayRatio(15000, 10000)).toBe(1.50);
      expect(calculateReplayRatio(22450, 15000)).toBe(1.50);
    });

    it('returns null when views is null or undefined', () => {
      expect(calculateReplayRatio(null, 10000)).toBeNull();
      expect(calculateReplayRatio(undefined, 10000)).toBeNull();
    });

    it('returns null when reach is <= 0', () => {
      expect(calculateReplayRatio(15000, 0)).toBeNull();
      expect(calculateReplayRatio(15000, -100)).toBeNull();
    });
  });

  describe('hasQuestionHook', () => {
    it('returns true when the first sentence contains ?', () => {
      expect(hasQuestionHook('Why are 90% of developers still building RAG pipelines the hard way? 🤔 We tested...')).toBe(true);
      expect(hasQuestionHook('Want to know how we reduced latency? Here is the guide.\nStep 1...')).toBe(true);
      expect(hasQuestionHook('Is this working?')).toBe(true);
    });

    it('returns false when ? only appears in subsequent sentences', () => {
      expect(hasQuestionHook('We deployed a new model today. Why did we do it? Because performance.')).toBe(false);
      expect(hasQuestionHook('Late night deployment!\nAre you awake?')).toBe(false);
    });

    it('returns false for captions without questions', () => {
      expect(hasQuestionHook('5 AI tools that will save you 20 hours this week:\n1. Ollama...')).toBe(false);
      expect(hasQuestionHook('Building the future of content intelligence.')).toBe(false);
      expect(hasQuestionHook('')).toBe(false);
    });
  });

  describe('getCaptionLengthBucket', () => {
    it('classifies captions < 80 characters as SHORT', () => {
      expect(getCaptionLengthBucket('Late night deployment.')).toBe('SHORT');
      expect(getCaptionLengthBucket('A'.repeat(79))).toBe('SHORT');
    });

    it('classifies captions 80–200 characters as MEDIUM', () => {
      expect(getCaptionLengthBucket('A'.repeat(80))).toBe('MEDIUM');
      expect(getCaptionLengthBucket('A'.repeat(200))).toBe('MEDIUM');
    });

    it('classifies captions > 200 characters as LONG', () => {
      expect(getCaptionLengthBucket('A'.repeat(201))).toBe('LONG');
      expect(getCaptionLengthBucket('A'.repeat(500))).toBe('LONG');
    });
  });

  describe('generateAnalyticsReport on Controlled Mock Dataset', () => {
    const mockPosts: InstagramPost[] = [
      {
        postId: 'm_reel_1',
        caption: 'Why is AI search faster? Here is why.',
        postType: 'REEL',
        topic: 'Tutorial',
        publishedAt: '2026-11-03T19:00:00.000Z', // Tuesday 19:00 (Evening)
        reach: 10000,
        likes: 1000,
        comments: 200, // WER = (1000 + 600) / 10000 * 100 = 16.00%
        views: 15000,  // ReplayRatio = 1.50
      },
      {
        postId: 'm_car_1',
        caption: '5 Architecture tips for agents.\n1. Router\n2. Pipeline',
        postType: 'CAROUSEL',
        topic: 'Tutorial',
        publishedAt: '2026-11-05T20:00:00.000Z', // Thursday 20:00 (Evening)
        reach: 8000,
        likes: 600,
        comments: 100, // WER = (600 + 300) / 8000 * 100 = 11.25%
        views: null,
      },
      {
        postId: 'm_img_1',
        caption: 'Coffee and code at the lab.',
        postType: 'IMAGE',
        topic: 'Behind the Scenes',
        publishedAt: '2026-11-02T10:00:00.000Z', // Monday 10:00 (Morning)
        reach: 4000,
        likes: 120,
        comments: 10,  // WER = (120 + 30) / 4000 * 100 = 3.75%
        views: null,
      },
      {
        postId: 'm_img_zero',
        caption: 'Quiet announcement.',
        postType: 'IMAGE',
        topic: 'Product Launch',
        publishedAt: '2026-11-06T14:00:00.000Z', // Friday 14:00 (Afternoon)
        reach: 2000,
        likes: 20,
        comments: 0,   // WER = (20 + 0) / 2000 * 100 = 1.00%
        views: null,
      },
    ];

    it('computes overview metrics accurately', () => {
      const report = generateAnalyticsReport(mockPosts);

      expect(report.overview.totalPosts).toBe(4);
      expect(report.overview.totalReach).toBe(24000);
      expect(report.overview.totalLikes).toBe(1740);
      expect(report.overview.totalComments).toBe(310);
      expect(report.overview.totalReelViews).toBe(15000);

      // Average WER: (16.00 + 11.25 + 3.75 + 1.00) / 4 = 32.00 / 4 = 8.00%
      expect(report.overview.avgWeightedEngagementRate).toBe(8.00);
    });

    it('sorts topPosts and worstPosts accurately', () => {
      const report = generateAnalyticsReport(mockPosts);

      expect(report.topPosts[0].postId).toBe('m_reel_1');
      expect(report.topPosts[0].weightedEngagementRate).toBe(16.00);

      expect(report.worstPosts[0].postId).toBe('m_img_zero');
      expect(report.worstPosts[0].weightedEngagementRate).toBe(1.00);
    });

    it('computes formatBreakdown correctly', () => {
      const report = generateAnalyticsReport(mockPosts);

      expect(report.formatBreakdown.REEL.postCount).toBe(1);
      expect(report.formatBreakdown.REEL.avgWeightedEngagementRate).toBe(16.00);
      expect(report.formatBreakdown.REEL.avgViews).toBe(15000);
      expect(report.formatBreakdown.REEL.avgReplayRatio).toBe(1.50);

      expect(report.formatBreakdown.CAROUSEL.postCount).toBe(1);
      expect(report.formatBreakdown.CAROUSEL.avgWeightedEngagementRate).toBe(11.25);
      expect(report.formatBreakdown.CAROUSEL.avgViews).toBeNull();
      expect(report.formatBreakdown.CAROUSEL.avgReplayRatio).toBeNull();

      expect(report.formatBreakdown.IMAGE.postCount).toBe(2);
      // (3.75 + 1.00) / 2 = 2.38%
      expect(report.formatBreakdown.IMAGE.avgWeightedEngagementRate).toBe(2.38);
      expect(report.formatBreakdown.IMAGE.avgViews).toBeNull();
    });

    it('computes topicBreakdown sorted best to worst', () => {
      const report = generateAnalyticsReport(mockPosts);

      expect(report.topicBreakdown).toHaveLength(3);
      // Tutorial has m_reel_1 (16%) and m_car_1 (11.25%) -> avg = 13.63%
      expect(report.topicBreakdown[0].topic).toBe('Tutorial');
      expect(report.topicBreakdown[0].avgWeightedEngagementRate).toBe(13.63);

      // Behind the Scenes has m_img_1 (3.75%)
      expect(report.topicBreakdown[1].topic).toBe('Behind the Scenes');
      expect(report.topicBreakdown[1].avgWeightedEngagementRate).toBe(3.75);

      // Product Launch has m_img_zero (1.00%)
      expect(report.topicBreakdown[2].topic).toBe('Product Launch');
      expect(report.topicBreakdown[2].avgWeightedEngagementRate).toBe(1.00);
    });

    it('computes temporalTrends by Day of Week and Hour Bucket', () => {
      const report = generateAnalyticsReport(mockPosts);

      expect(report.temporalTrends.byDayOfWeek).toHaveLength(7);
      const tuesday = report.temporalTrends.byDayOfWeek.find((d) => d.day === 'Tuesday');
      expect(tuesday?.postCount).toBe(1);
      expect(tuesday?.avgWeightedEngagementRate).toBe(16.00);

      const evening = report.temporalTrends.byHourBucket.find((b) => b.bucket === 'Evening (18–23)');
      expect(evening?.postCount).toBe(2);
      // (16.00 + 11.25) / 2 = 13.63%
      expect(evening?.avgWeightedEngagementRate).toBe(13.63);
    });

    it('computes captionPatterns comparing question hooks and length buckets', () => {
      const report = generateAnalyticsReport(mockPosts);

      // m_reel_1 has question hook (16.00%)
      expect(report.captionPatterns.questionHooks.count).toBe(1);
      expect(report.captionPatterns.questionHooks.avgWeightedEngagementRate).toBe(16.00);

      // Other 3 do not have question hooks -> (11.25 + 3.75 + 1.00) / 3 = 16.00 / 3 = 5.33%
      expect(report.captionPatterns.nonQuestionHooks.count).toBe(3);
      expect(report.captionPatterns.nonQuestionHooks.avgWeightedEngagementRate).toBe(5.33);
    });

    it('returns clean empty report when given an empty array', () => {
      const emptyReport = generateAnalyticsReport([]);
      expect(emptyReport.overview.totalPosts).toBe(0);
      expect(emptyReport.topPosts).toHaveLength(0);
      expect(emptyReport.worstPosts).toHaveLength(0);
      expect(emptyReport.formatBreakdown.REEL.postCount).toBe(0);
      expect(emptyReport.topicBreakdown).toHaveLength(0);
    });
  });

  describe('generateAnalyticsReport on full 60 sample_posts.json', () => {
    it('accurately verifies deliberate discoverable patterns across all 60 posts', async () => {
      const provider = new SimulatedInstagramProvider();
      const posts = await provider.fetchPosts();
      expect(posts).toHaveLength(60);

      const report = generateAnalyticsReport(posts);

      // 1. Overview sanity
      expect(report.overview.totalPosts).toBe(60);
      expect(report.overview.totalReach).toBeGreaterThan(500000);
      expect(report.overview.totalReelViews).toBeGreaterThan(0);
      expect(report.overview.avgWeightedEngagementRate).toBeGreaterThan(8.0);

      // 2. Top 5 vs Worst 5
      expect(report.topPosts).toHaveLength(5);
      expect(report.worstPosts).toHaveLength(5);
      expect(report.topPosts[0].weightedEngagementRate).toBeGreaterThan(report.worstPosts[0].weightedEngagementRate);

      // Top posts should be high performers (> 12% WER)
      for (const p of report.topPosts) {
        expect(p.weightedEngagementRate).toBeGreaterThan(12.0);
      }

      // Worst posts should include our zero-comment posts (post_049, post_059)
      const worstIds = report.worstPosts.map((p) => p.postId);
      expect(worstIds).toContain('post_049');
      expect(worstIds).toContain('post_059');

      // 3. Format Breakdown Pattern: REEL and CAROUSEL outperform IMAGE
      const reelWer = report.formatBreakdown.REEL.avgWeightedEngagementRate;
      const carouselWer = report.formatBreakdown.CAROUSEL.avgWeightedEngagementRate;
      const imageWer = report.formatBreakdown.IMAGE.avgWeightedEngagementRate;

      expect(reelWer).toBeGreaterThan(imageWer);
      expect(carouselWer).toBeGreaterThan(imageWer);
      expect(report.formatBreakdown.REEL.avgReplayRatio).toBeGreaterThan(1.0);

      // 4. Topic Breakdown: Tutorials and Case Studies comment-to-reach ratio
      const tutorial = report.topicBreakdown.find((t) => t.topic === 'Tutorial');
      const caseStudy = report.topicBreakdown.find((t) => t.topic === 'Case Study');
      const productLaunch = report.topicBreakdown.find((t) => t.topic === 'Product Launch');

      expect(tutorial).toBeDefined();
      expect(caseStudy).toBeDefined();
      expect(productLaunch).toBeDefined();

      expect(tutorial!.commentToReachRatio).toBeGreaterThan(productLaunch!.commentToReachRatio);
      expect(caseStudy!.commentToReachRatio).toBeGreaterThan(productLaunch!.commentToReachRatio);

      // 5. Question Hooks outperform Non-Question Hooks
      expect(report.captionPatterns.questionHooks.avgWeightedEngagementRate).toBeGreaterThan(
        report.captionPatterns.nonQuestionHooks.avgWeightedEngagementRate
      );

      // 6. Temporal Trends: Evening (18-23) shows highest performance
      const evening = report.temporalTrends.byHourBucket.find((b) => b.bucket === 'Evening (18–23)');
      const morning = report.temporalTrends.byHourBucket.find((b) => b.bucket === 'Morning (06–11)');
      expect(evening).toBeDefined();
      expect(morning).toBeDefined();
      expect(evening!.avgWeightedEngagementRate).toBeGreaterThan(morning!.avgWeightedEngagementRate);
    });
  });
});
