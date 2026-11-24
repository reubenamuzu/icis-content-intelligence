import { NormalizedPost } from '../ingestion/types';
import { InstagramPost } from '../schemas/content.schema';

export interface EngagementCalculationResult {
  postId: string;
  weightedEngagementRate: number;
  effectiveDenominator: number;
  denominatorType: 'REACH' | 'VIEWS' | 'FOLLOWER_BASELINE' | 'SAFE_MINIMUM';
  replayRatio?: number | null;
}

/**
 * Calculates the Weighted Engagement Rate for a post.
 *
 * Formula: ((likes + 3 * comments) / denominator) * 100
 *
 * Denominator resolution (Cross-Format Uniform Scale):
 * - If post.reach is present and > 0, denominator = post.reach (uniform across REEL, CAROUSEL, IMAGE).
 * - For legacy posts without reach where views is > 0, denominator = views.
 * - If reach and views are absent/null, falls back to followerBaseline.
 * - If all are <= 0, denominator = 1 to prevent division by zero.
 */
export function calculateWeightedEngagementRate(
  post: NormalizedPost | InstagramPost | (NormalizedPost & { reach?: number }),
  followerBaseline: number
): EngagementCalculationResult {
  const commentWeight = 3;
  const weightedEngagements = post.likes + commentWeight * post.comments;

  let effectiveDenominator: number;
  let denominatorType: 'REACH' | 'VIEWS' | 'FOLLOWER_BASELINE' | 'SAFE_MINIMUM';

  if ('reach' in post && typeof post.reach === 'number' && post.reach > 0) {
    effectiveDenominator = post.reach;
    denominatorType = 'REACH';
  } else if (typeof post.views === 'number' && post.views > 0) {
    effectiveDenominator = post.views;
    denominatorType = 'VIEWS';
  } else if (followerBaseline > 0) {
    effectiveDenominator = followerBaseline;
    denominatorType = 'FOLLOWER_BASELINE';
  } else {
    effectiveDenominator = 1;
    denominatorType = 'SAFE_MINIMUM';
  }

  const rate = (weightedEngagements / effectiveDenominator) * 100;
  // Round to 4 decimal places for clean numerical representation
  const weightedEngagementRate = Math.round(rate * 10000) / 10000;

  const resolvedId = 'postId' in post ? post.postId : (post as NormalizedPost).id;

  let replayRatio: number | null = null;
  if (
    'reach' in post &&
    typeof post.reach === 'number' &&
    post.reach > 0 &&
    typeof post.views === 'number' &&
    post.views > 0
  ) {
    replayRatio = Math.round((post.views / post.reach) * 100) / 100;
  }

  return {
    postId: resolvedId,
    weightedEngagementRate,
    effectiveDenominator,
    denominatorType,
    replayRatio,
  };
}
