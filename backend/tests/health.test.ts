import { describe, it, expect } from 'vitest';
import { healthRouter } from '../src/routes/health';
import { Request, Response } from 'express';

describe('GET /api/health', () => {
  it('should return 200 OK with status "ok", timestamp, and uptime', () => {
    let statusCode: number | undefined;
    let jsonBody: Record<string, unknown> | undefined;

    const mockReq = {} as Request;
    const mockRes = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: Record<string, unknown>) {
        jsonBody = data;
        return this;
      },
    } as unknown as Response;

    const routeLayer = healthRouter.stack.find((layer) => layer.route?.path === '/health');
    const handler = routeLayer?.route?.stack[0]?.handle;

    expect(handler).toBeDefined();
    handler(mockReq, mockRes);

    expect(statusCode).toBe(200);
    expect(jsonBody).toHaveProperty('status', 'ok');
    expect(jsonBody).toHaveProperty('timestamp');
    expect(jsonBody).toHaveProperty('uptime');
    expect(typeof jsonBody?.uptime).toBe('number');
  });
});
