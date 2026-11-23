import { InstagramPost } from '../schemas/content.schema';

export interface IContentProvider {
  readonly providerName: string;
  fetchPosts(): Promise<InstagramPost[]>;
}
