import { NormalizedPost } from '../ingestion/types';
import { InstagramPost } from '../schemas/content.schema';

export interface EngagementCalculationResult {
  postId: string;
  weightedEngagementRate: number;
  effectiveDenominator: number;
  denominatorType: 'VIEWS' | 'FOLLOWER_BASELINE' | 'SAFE_MINIMUM';
}

/**
 * Calculates the Weighted Engagement Rate for a post.
 *
 * Formula: ((likes + 3 * comments) / denominator) * 100
 *
 * Denominator resolution:
 * - If views is non-null and > 0, denominator = views (typical for VIDEO/REEL).
 * - For static IMAGE posts where views is null/undefined, denominator = followerBaseline.
 * - If both are <= 0, denominator = 1 to prevent division by zero.
 */
export function calculateWeightedEngagementRate(
  post: NormalizedPost | InstagramPost,
  followerBaseline: number
): EngagementCalculationResult {
  const commentWeight = 3;
  const weightedEngagements = post.likes + commentWeight * post.comments;

  let effectiveDenominator: number;
  let denominatorType: 'VIEWS' | 'FOLLOWER_BASELINE' | 'SAFE_MINIMUM';

  if (typeof post.views === 'number' && post.views > 0) {
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

  return {
    postId: resolvedId,
    weightedEngagementRate,
    effectiveDenominator,
    denominatorType,
  };
}
