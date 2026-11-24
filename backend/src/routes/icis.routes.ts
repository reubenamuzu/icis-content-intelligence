import { Router, Request, Response, NextFunction } from 'express';
import { IContentProvider } from '../ingestion/base.provider';
import { SimulatedInstagramProvider } from '../ingestion/simulated.provider';
import { PostTypeEnum } from '../schemas/content.schema';
import { generateAnalyticsReport } from '../analytics/analytics.service';
import { GeminiService, GeminiServiceError } from '../intelligence/gemini.service';

export function createIcisRouter(
  provider: IContentProvider = new SimulatedInstagramProvider(),
  geminiService: GeminiService = new GeminiService()
): Router {
  const router = Router();

  /**
   * GET /api/posts
   * Returns normalized Instagram posts with optional filtering by postType and topic.
   */
  router.get('/posts', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const posts = await provider.fetchPosts();
      let filtered = posts;

      if (req.query.postType) {
        const postTypeResult = PostTypeEnum.safeParse(req.query.postType);
        if (!postTypeResult.success) {
          return res.status(400).json({
            error: `Invalid postType: "${req.query.postType}". Allowed values are REEL, CAROUSEL, IMAGE.`,
          });
        }
        filtered = filtered.filter((p) => p.postType === postTypeResult.data);
      }

      if (req.query.topic && typeof req.query.topic === 'string') {
        const topicQuery = req.query.topic.trim().toLowerCase();
        filtered = filtered.filter((p) => p.topic.toLowerCase() === topicQuery);
      }

      return res.status(200).json(filtered);
    } catch (error) {
      return next(error);
    }
  });

  /**
   * GET /api/analytics
   * Generates and returns a comprehensive deterministic AnalyticsReport.
   */
  router.get('/analytics', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const posts = await provider.fetchPosts();
      const report = generateAnalyticsReport(posts);
      return res.status(200).json(report);
    } catch (error) {
      return next(error);
    }
  });

  /**
   * POST /api/recommendations
   * Synthesizes data-grounded strategic recommendations using Gemini 2.5 Flash.
   */
  router.post('/recommendations', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const posts = await provider.fetchPosts();
      const report = generateAnalyticsReport(posts);
      const strategy = await geminiService.generateStrategy(report, posts);
      return res.status(200).json(strategy);
    } catch (error: unknown) {
      if (error instanceof GeminiServiceError) {
        return res.status(error.statusCode).json({
          error: error.message,
        });
      }
      return next(error);
    }
  });

  return router;
}

export const icisRouter = createIcisRouter();
