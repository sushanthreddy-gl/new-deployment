import express from 'express';
import groupRoutes from '../../src/routes/groups.js';
import errorHandler from '../../src/middleware/errorHandler.js';

/**
 * Returns a configured Express app with the groups router mounted.
 * Used by Supertest in integration tests — does NOT start an HTTP server.
 */
export const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/groups', groupRoutes);
  app.use(errorHandler);
  return app;
};
