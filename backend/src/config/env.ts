import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  mongodbUri: process.env.MONGODB_URI || '',
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  simulatorEnabled: process.env.SIMULATOR_ENABLED !== 'false',
  simulatorIntervalMs: parseInt(process.env.SIMULATOR_INTERVAL_MS || '10000', 10),
  etaPredictionIntervalMs: parseInt(process.env.ETA_PREDICTION_INTERVAL_MS || '30000', 10),
  railwayDataProvider: process.env.RAILWAY_DATA_PROVIDER || 'simulator',
  railwayApiBaseUrl: process.env.RAILWAY_API_BASE_URL || '',
  railwayApiKey: process.env.RAILWAY_API_KEY || '',
  railwayApiTimeoutMs: parseInt(process.env.RAILWAY_API_TIMEOUT_MS || '10000', 10),
  railwayApiEnabled: process.env.RAILWAY_API_ENABLED === 'true',
  railwayPollIntervalMs: parseInt(process.env.RAILWAY_POLL_INTERVAL_MS || '10000', 10),
  railwayCacheTtlMs: parseInt(process.env.RAILWAY_CACHE_TTL_MS || '5000', 10),
  railkitApiKey: process.env.RAILKIT_API_KEY || '',
  etaModelSource: process.env.ETA_MODEL_SOURCE || 'synthetic-demo',
  historicalCollectionEnabled: process.env.HISTORICAL_COLLECTION_ENABLED === 'true',
  realDataCollectionIntervalMs: parseInt(process.env.REAL_DATA_COLLECTION_INTERVAL_MS || '60000', 10),
  historicalMonitoredTrains: (() => {
    const val = process.env.HISTORICAL_MONITORED_TRAINS || '12952,12002';
    const parts = val.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts.length;
    const num = parseInt(parts[0], 10);
    if (isNaN(num)) return 2;
    if (num > 500) return 1;
    return num;
  })(),
  railwayMonthlyQuotaLimit: parseInt(process.env.RAILWAY_MONTHLY_QUOTA_LIMIT || '30000', 10),
  railwayQuotaOverride: process.env.RAILWAY_QUOTA_OVERRIDE === 'true',
  railwayRateLimitCooldownMs: parseInt(process.env.RAILWAY_RATE_LIMIT_COOLDOWN_MS || '300000', 10),
};



