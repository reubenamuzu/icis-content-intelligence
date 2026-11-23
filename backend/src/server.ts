import { app } from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`[ICIS Backend] Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  console.log(`[ICIS Backend] Health check available at http://localhost:${env.PORT}/api/health`);
});

export default server;
