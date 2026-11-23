import { IContentProvider } from './base.provider';
import { InstagramPost } from '../schemas/content.schema';

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

/**
 * Adapter stub for Meta Graph API v21+ integration.
 * In production, this provider queries the Instagram Graph API endpoints
 * (/me/media with caption, media_type, timestamp, like_count, comments_count, insights).
 */
export class InstagramGraphProvider implements IContentProvider {
  public readonly providerName = 'instagram-graph-api';
  private accessToken?: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
  }

  async fetchPosts(): Promise<InstagramPost[]> {
    if (!this.accessToken) {
      throw new NotImplementedError(
        'InstagramGraphProvider requires a valid Meta Graph API v21+ access token. ' +
        'Provide an access token to the constructor or set INSTAGRAM_ACCESS_TOKEN in your environment.'
      );
    }

    throw new NotImplementedError(
      'Meta Graph API v21+ integration is currently an adapter stub and not yet implemented.'
    );
  }
}
