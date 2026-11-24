import express, { Express } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';
import { createIcisRouter, icisRouter } from './routes/icis.routes';
import { IContentProvider } from './ingestion/base.provider';
import { GeminiService } from './intelligence/gemini.service';

export function createApp(
  provider?: IContentProvider,
  geminiService?: GeminiService
): Express {
  const app = express();

  // Configure CORS for Next.js frontend
  app.use(
    cors({
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
    })
  );

  app.use(express.json());

  // Mount API endpoints
  app.use('/api', healthRouter);
  app.use(
    '/api',
    provider || geminiService ? createIcisRouter(provider, geminiService) : icisRouter
  );

  return app;
}

export const app = createApp();
