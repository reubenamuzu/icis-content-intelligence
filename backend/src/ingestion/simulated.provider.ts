import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { IContentProvider } from './base.provider';
import { InstagramPost, InstagramPostSchema } from '../schemas/content.schema';

export class SimulatedInstagramProvider implements IContentProvider {
  public readonly providerName = 'simulated';
  private filePath: string;

  constructor(customPath?: string) {
    if (customPath) {
      this.filePath = customPath;
    } else {
      const candidates = [
        path.resolve(__dirname, '../../data/sample_posts.json'),
        path.resolve(process.cwd(), 'data/sample_posts.json'),
        path.resolve(process.cwd(), 'backend/data/sample_posts.json'),
      ];
      this.filePath = candidates.find((candidate) => fsSync.existsSync(candidate)) || candidates[0];
    }
  }

  async fetchPosts(): Promise<InstagramPost[]> {
    const rawData = await fs.readFile(this.filePath, 'utf-8');
    const json = JSON.parse(rawData);

    if (!Array.isArray(json)) {
      throw new Error(`Invalid format in ${this.filePath}: expected an array of posts`);
    }

    return json.map((item, index) => {
      const parseResult = InstagramPostSchema.safeParse(item);
      if (!parseResult.success) {
        throw new Error(
          `Validation failed for post at index ${index} (postId: ${item?.postId}): ${JSON.stringify(parseResult.error.format())}`
        );
      }
      return parseResult.data;
    });
  }
}
