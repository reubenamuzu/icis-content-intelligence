import express, { Express } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Mount API endpoints
  app.use('/api', healthRouter);

  return app;
}

export const app = createApp();
