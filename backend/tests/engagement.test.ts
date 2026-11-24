import { describe, it, expect } from 'vitest';
import { calculateWeightedEngagementRate } from '../src/analytics/engagement';
import { NormalizedPost } from '../src/ingestion/types';
import { InstagramPost } from '../src/schemas/content.schema';

describe('Analytics - calculateWeightedEngagementRate', () => {
  const followerBaseline = 10000;

  it('uses reach as the uniform denominator when reach is present on InstagramPost', () => {
    const post: InstagramPost = {
      postId: 'post_uniform_1',
      caption: 'Tutorial on LLM RAG pipelines',
      postType: 'REEL',
      topic: 'Tutorial',
      publishedAt: '2026-11-20T18:30:00.000Z',
      reach: 10000,
      likes: 800,
      comments: 200, // 200 * 3 = 600 -> total 1400
      views: 14000,  // replayRatio = 14000 / 10000 = 1.4
    };

    const result = calculateWeightedEngagementRate(post, followerBaseline);
    // (800 + 600) / 10000 * 100 = 14%
    expect(result.weightedEngagementRate).toBe(14);
    expect(result.effectiveDenominator).toBe(10000);
    expect(result.denominatorType).toBe('REACH');
    expect(result.replayRatio).toBe(1.4);
  });

  it('calculates Weighted Engagement Rate uniformly for CAROUSEL using reach', () => {
    const post: InstagramPost = {
      postId: 'post_carousel_1',
      caption: '5 Architecture patterns',
      postType: 'CAROUSEL',
      topic: 'Case Study',
      publishedAt: '2026-11-21T18:30:00.000Z',
      reach: 8000,
      likes: 600,
      comments: 100, // 100 * 3 = 300 -> total 900
      views: null,
    };

    const result = calculateWeightedEngagementRate(post, followerBaseline);
    // (600 + 300) / 8000 * 100 = 11.25%
    expect(result.weightedEngagementRate).toBe(11.25);
    expect(result.effectiveDenominator).toBe(8000);
    expect(result.denominatorType).toBe('REACH');
    expect(result.replayRatio).toBeNull();
  });

  it('calculates Weighted Engagement Rate uniformly for IMAGE using reach', () => {
    const post: InstagramPost = {
      postId: 'post_image_1',
      caption: 'Behind the scenes coffee break',
      postType: 'IMAGE',
      topic: 'Behind the Scenes',
      publishedAt: '2026-11-22T18:30:00.000Z',
      reach: 3000,
      likes: 90,
      comments: 10, // 10 * 3 = 30 -> total 120
      views: null,
    };

    const result = calculateWeightedEngagementRate(post, followerBaseline);
    // (90 + 30) / 3000 * 100 = 4%
    expect(result.weightedEngagementRate).toBe(4);
    expect(result.effectiveDenominator).toBe(3000);
    expect(result.denominatorType).toBe('REACH');
  });

  it('uses views as denominator for legacy posts without reach when views > 0', () => {
    const post: NormalizedPost = {
      id: 'reel_legacy',
      caption: 'Top tech tips',
      mediaType: 'REEL',
      timestamp: '2026-11-20T10:00:00.000Z',
      likes: 200,
      comments: 50, // 50 * 3 = 150 -> total 350
      views: 5000,
      permalink: 'https://instagram.com/p/reel_legacy',
    };

    const result = calculateWeightedEngagementRate(post, followerBaseline);
    // (200 + 150) / 5000 * 100 = 7%
    expect(result.weightedEngagementRate).toBe(7);
    expect(result.effectiveDenominator).toBe(5000);
    expect(result.denominatorType).toBe('VIEWS');
  });

  it('falls back to follower baseline when reach and views are both missing/null', () => {
    const post: NormalizedPost = {
      id: 'img_legacy',
      caption: 'Infographic guide',
      mediaType: 'IMAGE',
      timestamp: '2026-11-21T12:00:00.000Z',
      likes: 500,
      comments: 100, // 100 * 3 = 300 -> total 800
      views: null,
      permalink: 'https://instagram.com/p/img_legacy',
    };

    const result = calculateWeightedEngagementRate(post, followerBaseline);
    // (500 + 300) / 10000 * 100 = 8%
    expect(result.weightedEngagementRate).toBe(8);
    expect(result.effectiveDenominator).toBe(10000);
    expect(result.denominatorType).toBe('FOLLOWER_BASELINE');
  });

  it('handles zero likes and zero comments safely', () => {
    const post: NormalizedPost = {
      id: 'img_zero_eng',
      caption: 'Quiet post',
      mediaType: 'IMAGE',
      timestamp: '2026-11-22T08:00:00.000Z',
      likes: 0,
      comments: 0,
      views: null,
      permalink: 'https://instagram.com/p/img_zero_eng',
    };

    const result = calculateWeightedEngagementRate(post, followerBaseline);
    expect(result.weightedEngagementRate).toBe(0);
  });

  it('prevents division by zero when denominator resolves to 0', () => {
    const post: NormalizedPost = {
      id: 'img_zero_denom',
      caption: 'Zero baseline test',
      mediaType: 'IMAGE',
      timestamp: '2026-11-22T08:00:00.000Z',
      likes: 10,
      comments: 2, // 10 + 6 = 16
      views: 0,
      permalink: 'https://instagram.com/p/img_zero_denom',
    };

    const result = calculateWeightedEngagementRate(post, 0);
    expect(result.effectiveDenominator).toBe(1);
    expect(result.denominatorType).toBe('SAFE_MINIMUM');
    expect(result.weightedEngagementRate).toBe(1600);
  });
});
