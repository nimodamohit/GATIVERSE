import http from 'http';
import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { requestLogger } from './middleware/logger.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import routes from './routes/index.js';
import { initSocketServer } from './sockets/index.js';
import { railwayDataProvider } from './providers/index.js';
import { logger } from './utils/logger.js';

import { historicalCollector } from './services/historicalCollector.service.js';

const app = express();
const httpServer = http.createServer(app);

// CORS configuration
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

// JSON Parsing
app.use(express.json());

// Request logging middleware
app.use(requestLogger);

// API Routes
app.use('/api', routes);

// Centralized error handling
app.use(errorHandler);

// Initialize Socket.IO foundation
initSocketServer(httpServer);

// Start server
const startServer = async (): Promise<void> => {
  // Connect database if configured
  await connectDB();

  // Start railway data provider simulator only when simulator provider mode is active
  if (config.simulatorEnabled && config.railwayDataProvider === 'simulator') {
    railwayDataProvider.start();
  }

  // Start historical telemetry collector if quota safe
  historicalCollector.startCollection();

  httpServer.listen(config.port, () => {
    logger.info(`GATIVERSE Backend running on port ${config.port} [${config.env}]`);
  });
};


startServer().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

export { app, httpServer };
