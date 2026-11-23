import { describe, it, expect } from 'vitest';
import { calculateWeightedEngagementRate } from '../src/analytics/engagement';
import { NormalizedPost } from '../src/ingestion/types';

describe('Analytics - calculateWeightedEngagementRate', () => {
  const followerBaseline = 10000;

  it('uses views as denominator for VIDEO/REEL posts when views > 0', () => {
    const post: NormalizedPost = {
      id: 'reel_1',
      caption: 'Top tech tips',
      mediaType: 'REEL',
      timestamp: '2026-11-20T10:00:00.000Z',
      likes: 200,
      comments: 50, // 50 * 3 = 150 -> total 350
      views: 5000,
      permalink: 'https://instagram.com/p/reel_1',
    };

    const result = calculateWeightedEngagementRate(post, followerBaseline);
    // (200 + 150) / 5000 * 100 = 7%
    expect(result.weightedEngagementRate).toBe(7);
    expect(result.effectiveDenominator).toBe(5000);
    expect(result.denominatorType).toBe('VIEWS');
  });

  it('falls back to ACCOUNT_FOLLOWER_BASELINE for IMAGE posts where views is null', () => {
    const post: NormalizedPost = {
      id: 'img_1',
      caption: 'Infographic guide',
      mediaType: 'IMAGE',
      timestamp: '2026-11-21T12:00:00.000Z',
      likes: 500,
      comments: 100, // 100 * 3 = 300 -> total 800
      views: null,
      permalink: 'https://instagram.com/p/img_1',
    };

    const result = calculateWeightedEngagementRate(post, followerBaseline);
    // (500 + 300) / 10000 * 100 = 8%
    expect(result.weightedEngagementRate).toBe(8);
    expect(result.effectiveDenominator).toBe(10000);
    expect(result.denominatorType).toBe('FOLLOWER_BASELINE');
  });

  it('handles zero likes and zero comments safely', () => {
    const post: NormalizedPost = {
      id: 'img_2',
      caption: 'Quiet post',
      mediaType: 'IMAGE',
      timestamp: '2026-11-22T08:00:00.000Z',
      likes: 0,
      comments: 0,
      views: null,
      permalink: 'https://instagram.com/p/img_2',
    };

    const result = calculateWeightedEngagementRate(post, followerBaseline);
    expect(result.weightedEngagementRate).toBe(0);
  });

  it('prevents division by zero when both views and followerBaseline are 0', () => {
    const post: NormalizedPost = {
      id: 'img_zero',
      caption: 'Zero baseline test',
      mediaType: 'IMAGE',
      timestamp: '2026-11-22T08:00:00.000Z',
      likes: 10,
      comments: 2, // 10 + 6 = 16
      views: 0,
      permalink: 'https://instagram.com/p/img_zero',
    };

    const result = calculateWeightedEngagementRate(post, 0);
    expect(result.effectiveDenominator).toBe(1);
    expect(result.denominatorType).toBe('SAFE_MINIMUM');
    expect(result.weightedEngagementRate).toBe(1600);
  });
});
