import { railwayDataProvider, TrainLiveStatus } from '../providers/index.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface ETAPredictionResult {
  trainNumber: string;
  predictedAdditionalDelayMinutes: number;
  predictedTotalDelayMinutes: number;
  predictedArrival: string;
  modelVersion: string;
  predictionGeneratedAt: string;
  disclaimer?: string;
}

interface CacheItem {
  result: ETAPredictionResult;
  timestamp: number;
}

const CACHE_TTL_MS = 30000; // 30 seconds TTL cache
const predictionCache: Map<string, CacheItem> = new Map();

export const getETAPredictionService = async (trainNumber: string): Promise<ETAPredictionResult | null> => {
  const cleanNum = trainNumber.trim();
  const now = Date.now();

  // 1. Check cache first
  const cached = predictionCache.get(cleanNum);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // 2. Obtain live telemetry snapshot from provider
  const liveStatus: TrainLiveStatus | null = await railwayDataProvider.getTrainLiveStatus(cleanNum);
  if (!liveStatus || !liveStatus.currentStation) {
    return null;
  }

  // 3. Validate live telemetry features before sending to ML model
  const delayMinutes = typeof liveStatus.delayMinutes === 'number' && Number.isFinite(liveStatus.delayMinutes) && liveStatus.delayMinutes >= 0 ? liveStatus.delayMinutes : 0;
  const rawSpeed = liveStatus.speed;
  const speed = rawSpeed !== null && rawSpeed !== undefined && Number.isFinite(rawSpeed) && rawSpeed >= 0 ? rawSpeed : 0;
  const totalStops = typeof liveStatus.totalStops === 'number' && Number.isFinite(liveStatus.totalStops) && liveStatus.totalStops > 0 ? liveStatus.totalStops : 8;
  const currentStopIndex = typeof liveStatus.currentStopIndex === 'number' && Number.isFinite(liveStatus.currentStopIndex) && liveStatus.currentStopIndex >= 0 ? liveStatus.currentStopIndex : 0;
  const stationsRemaining = Math.max(0, totalStops - currentStopIndex - 1);

  // Derive remaining distance & times based on validated values
  const totalDistanceEst = 1400.0;
  const progressRatio = totalStops > 1 ? currentStopIndex / (totalStops - 1) : 0.5;
  const distanceTravelledKm = Number((totalDistanceEst * progressRatio).toFixed(1));
  const distanceRemainingKm = Number((totalDistanceEst - distanceTravelledKm).toFixed(1));

  const scheduledRemainingMinutes = Number(((distanceRemainingKm / 80.0) * 60.0).toFixed(1));
  const elapsedJourneyMinutes = Number(((distanceTravelledKm / 75.0) * 60.0).toFixed(1));

  const currentDate = new Date();
  const hourOfDay = currentDate.getHours();
  const dayOfWeek = currentDate.getDay();

  const requestPayload = {
    trainNumber: cleanNum,
    currentDelayMinutes: delayMinutes,
    currentSpeedKmph: speed,
    distanceRemainingKm,
    distanceTravelledKm,
    stationsRemaining,
    scheduledRemainingMinutes,
    elapsedJourneyMinutes,
    previousStationDelayMinutes: Math.max(0, delayMinutes - 3),
    averageStationDwellMinutes: 3.5,
    hourOfDay,
    dayOfWeek,
    scheduledArrival: liveStatus.scheduledArrival || '07:15 PM',
  };

  // 4. Call FastAPI ML Service endpoint POST /predict-eta
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const mlUrl = `${config.mlServiceUrl}/predict-eta`;
    const response = await fetch(mlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn(`ML Service HTTP error status ${response.status} for train ${cleanNum}`);
      return cached ? cached.result : null;
    }

    const data = await response.json();
    if (data && data.success && data.data) {
      const predArrivalStr = data.data.predictedArrival;
      const predTotalDelay = data.data.predictedTotalDelayMinutes ?? 0;
      const predAddDelay = data.data.predictedAdditionalDelayMinutes ?? 0;

      // ETA CONSISTENCY CHECK (Requirement J):
      // 1. predictedTotalDelayMinutes must be >= currentDelayMinutes
      if (predTotalDelay < delayMinutes || predAddDelay < 0) {
        logger.warn(
          `[ETA Validation] Inconsistent prediction for train ${cleanNum}: predictedTotalDelay (${predTotalDelay}m) < currentDelay (${delayMinutes}m)`
        );
        return null;
      }

      // 2. Validate predictedArrival >= current timestamp (allowing 60s clock skew)
      if (typeof predArrivalStr === 'string' && predArrivalStr.includes('T')) {
        const predMs = new Date(predArrivalStr).getTime();
        if (!isNaN(predMs)) {
          if (predMs < now - 60000) {
            logger.warn(
              `[ETA Validation] Inconsistent prediction for train ${cleanNum}: predictedArrival (${predArrivalStr}) is in the past`
            );
            return null;
          }

          // 3. Validate predictedArrival >= expectedArrival timestamp if present
          if (liveStatus.expectedArrival && liveStatus.expectedArrival.includes('T')) {
            const expMs = new Date(liveStatus.expectedArrival).getTime();
            if (!isNaN(expMs) && predMs < expMs - 60000) {
              logger.warn(
                `[ETA Validation] Inconsistent prediction for train ${cleanNum}: predictedArrival (${predArrivalStr}) < expectedArrival (${liveStatus.expectedArrival})`
              );
              return null;
            }
          }
        }
      }

      const result: ETAPredictionResult = {
        trainNumber: data.data.trainNumber,
        predictedAdditionalDelayMinutes: predAddDelay,
        predictedTotalDelayMinutes: predTotalDelay,
        predictedArrival: predArrivalStr,
        modelVersion: data.data.modelVersion,
        predictionGeneratedAt: data.data.predictionGeneratedAt,
        disclaimer: data.data.disclaimer,
      };

      // Store in cache
      predictionCache.set(cleanNum, { result, timestamp: now });
      return result;
    }
  } catch (error) {
    logger.warn(`Failed to connect to ML Service at ${config.mlServiceUrl}: ${(error as Error).message}`);
    // Return stale cache if available
    if (cached) return cached.result;
  }

  return null;
};
