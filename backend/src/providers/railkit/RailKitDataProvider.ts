import * as railkit from 'railkit';
import {
  RailwayDataProvider,
  TrainLiveStatus,
  RailwayDataProviderStatus,
  LiveRouteStop,
} from '../interfaces/RailwayDataProvider.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export const KNOWN_TRAIN_NAMES: Record<string, string> = {
  '12952': 'MMCT Tejas Rajdhani Express',
  '12951': 'Mumbai Rajdhani Express',
  '12002': 'Shatabdi Express',
  '12001': 'Bhopal Shatabdi',
  '12626': 'Kerala Express',
  '12625': 'Kerala Express',
  '12138': 'Punjab Mail',
  '12137': 'Punjab Mail',
  '17606': 'Kacheguda Express',
};

const KNOWN_STATION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  NDLS: { lat: 28.6139, lng: 77.209 },
  MTJ: { lat: 27.4924, lng: 77.6737 },
  AGC: { lat: 27.1767, lng: 78.0081 },
  GWL: { lat: 26.2183, lng: 78.1828 },
  VGLJ: { lat: 25.4484, lng: 78.5685 },
  KOTA: { lat: 25.2138, lng: 75.8648 },
  RTM: { lat: 23.3315, lng: 75.0367 },
  BPL: { lat: 23.2599, lng: 77.4126 },
  RKMP: { lat: 23.2038, lng: 77.4385 },
  ET: { lat: 22.6106, lng: 77.7634 },
  KNW: { lat: 21.8314, lng: 76.3498 },
  BSL: { lat: 21.0454, lng: 75.7892 },
  BRC: { lat: 22.3072, lng: 73.1812 },
  ST: { lat: 21.1702, lng: 72.8311 },
  BVI: { lat: 19.229, lng: 72.8567 },
  MMCT: { lat: 18.9696, lng: 72.8193 },
  CSMT: { lat: 18.9398, lng: 72.8355 },
};

export interface RailKitRouteStopRaw {
  sequence?: number;
  stnCode?: string;
  stnName?: string;
  isHalt?: boolean;
  status?: string;
  distance?: number;
  platform?: string | number | null;
  day?: number;
  cord?: { lat?: number; lon?: number; lng?: number };
  lat?: number;
  lng?: number;
  arrival?: { scheduled?: string | null; actual?: string | null; delay?: number | null };
  departure?: { scheduled?: string | null; actual?: string | null; delay?: number | null };
  scheduledArrival?: string | null;
  scheduledDeparture?: string | null;
  actualArrival?: string | null;
  actualDeparture?: string | null;
}

export interface RailKitLiveResponseData {
  startDate?: string;
  lastUpdatedAt?: string;
  status?: string;
  statusText?: string;
  isLive?: boolean;
  trainInfo?: Array<{
    number?: string;
    name?: string;
    type?: string;
    category?: string;
    source?: { code?: string; name?: string; lat?: number; lng?: number };
    destination?: { code?: string; name?: string; lat?: number; lng?: number };
    distance?: number;
    duration?: number;
    avgSpeed?: number;
    totalHalts?: number;
    coachPosition?: string;
    rakeType?: string;
  }>;
  currentLocation?: {
    sequence?: number;
    stnCode?: string;
    stnName?: string;
    status?: string;
    distanceToNextStationKm?: number | null;
    nextStation?: { sequence?: number; stnCode?: string; stnName?: string } | string | null;
    distanceFromOriginKm?: number | null;
    distanceFromLastStationKm?: number | null;
    delayMinutes?: number | null;
    speed?: number | null;
    speedKmh?: number | null;
    lat?: number | null;
    lng?: number | null;
    cord?: { lat?: number; lon?: number; lng?: number };
  };
  previousHalt?: {
    sequence?: number;
    stnCode?: string;
    stnName?: string;
    distance?: number;
  } | null;
  nextHalt?: {
    sequence?: number;
    stnCode?: string;
    stnName?: string;
    distance?: number;
  } | null;
  delayMinutes?: number | null;
  speed?: number | null;
  route?: RailKitRouteStopRaw[];
  _provider?: string;
}

export function getISTDateString(offsetDays = 0): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 330 * 60000 - offsetDays * 86400000);

  const yyyy = istDate.getFullYear();
  const mm = String(istDate.getMonth() + 1).padStart(2, '0');
  const dd = String(istDate.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

export class RailKitDataProvider implements RailwayDataProvider {
  private isConfigured: boolean = false;
  private apiKey: string = '';
  private cache: Map<string, { status: TrainLiveStatus; timestamp: number }> = new Map();
  private lastKnownRealSnapshots: Map<string, { status: TrainLiveStatus; timestamp: number }> = new Map();
  private updateCallbacks: Array<(status: TrainLiveStatus) => void> = [];
  private lastSuccessfulRealDataTimestamp: string | null = null;
  private lastError: string | undefined;
  private pollTimer: NodeJS.Timeout | null = null;
  private cacheTtlMs: number;
  private rateLimitCooldownUntil: number = 0;
  private rateLimitCooldownMs: number;

  constructor() {
    this.cacheTtlMs = config.railwayCacheTtlMs || 5000;
    this.rateLimitCooldownMs = config.railwayRateLimitCooldownMs || 300000;
    const key = (process.env.RAILKIT_API_KEY || config.railkitApiKey || '').trim();

    if (key) {
      this.apiKey = key;
      try {
        railkit.configure(key);
        this.isConfigured = true;
        logger.info('[RailKit Provider] Initialized with RailKit V2 SDK (WIMT backend)');
      } catch (err) {
        this.isConfigured = false;
        this.lastError = `RailKit configuration error: ${(err as Error).message}`;
        logger.error('[RailKit Provider] Configuration failed', err);
      }
    } else {
      this.isConfigured = false;
      this.lastError = 'process.env.RAILKIT_API_KEY is not configured';
      logger.warn('[RailKit Provider] RAILKIT_API_KEY is missing. Provider will return unavailable status.');
    }
  }

  public getIsConfigured(): boolean {
    return this.isConfigured;
  }

  public isCooldownActive(): boolean {
    return Date.now() < this.rateLimitCooldownUntil;
  }

  public getCooldownRemainingMs(): number {
    return Math.max(0, this.rateLimitCooldownUntil - Date.now());
  }

  public setCooldown(durationMs?: number): void {
    const dur = durationMs ?? this.rateLimitCooldownMs;
    this.rateLimitCooldownUntil = Date.now() + dur;
    logger.warn(
      `[RailKit Provider] 429 Rate limit / usage quota cooldown activated for ${Math.round(dur / 1000)}s (until ${new Date(this.rateLimitCooldownUntil).toISOString()})`
    );
  }

  public clearCooldown(): void {
    this.rateLimitCooldownUntil = 0;
  }

  public isRateLimitError(errMsg?: string): boolean {
    if (!errMsg) return false;
    const lower = errMsg.toLowerCase();
    return (
      lower.includes('limit exceeded') ||
      lower.includes('too many requests') ||
      lower.includes('429') ||
      lower.includes('quota') ||
      lower.includes('billing cycle') ||
      lower.includes('rate limit')
    );
  }

  public async getTrainLiveStatus(trainNumber: string, journeyDate?: string): Promise<TrainLiveStatus | null> {
    const cleanNum = trainNumber.trim();
    if (!cleanNum) return null;

    // 1. Check TTL cache
    const cached = this.cache.get(cleanNum);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return cached.status;
    }

    // 2. Check Cooldown (Circuit Breaker)
    if (this.isCooldownActive()) {
      const remSec = Math.ceil(this.getCooldownRemainingMs() / 1000);
      logger.warn(
        `[RailKit Provider] Rate limit cooldown ACTIVE (${remSec}s remaining). Skipping upstream RailKit request for train ${cleanNum}.`
      );
      this.lastError = 'Usage limit exceeded for current billing cycle';
      return this.handleFallbackOrUnavailable(cleanNum, 'rate_limit_exceeded');
    }

    // 3. If not configured, check snapshot or return unavailable status
    if (!this.isConfigured) {
      this.lastError = 'RAILKIT_API_KEY is not configured';
      return this.handleFallbackOrUnavailable(cleanNum, 'api_key_missing');
    }

    const todayDate = journeyDate || getISTDateString(0);

    try {
      logger.info(`[RailKit Provider] Fetching live status for train ${cleanNum} (date: ${todayDate})`);
      let result = await railkit.trackTrainV2(cleanNum, todayDate);

      // If today returned no valid data and journeyDate was not explicitly passed, try yesterday's run
      if ((!result || !result.success || !result.data) && !journeyDate) {
        const yesterdayDate = getISTDateString(1);
        logger.info(`[RailKit Provider] Today's schedule empty, trying yesterday's run (${yesterdayDate}) for train ${cleanNum}`);
        try {
          const yResult = await railkit.trackTrainV2(cleanNum, yesterdayDate);
          if (yResult && yResult.success && yResult.data && this.validateRawTelemetry(cleanNum, yResult.data)) {
            result = yResult;
          }
        } catch {
          // Keep original result
        }
      }

      if (result && result.success && result.data) {
        const rawData = result.data as RailKitLiveResponseData;
        if (this.validateRawTelemetry(cleanNum, rawData)) {
          const normalized = this.normalizeRawTelemetry(cleanNum, rawData);

          this.cache.set(cleanNum, { status: normalized, timestamp: Date.now() });
          this.lastKnownRealSnapshots.set(cleanNum, { status: normalized, timestamp: Date.now() });
          this.lastSuccessfulRealDataTimestamp = new Date().toISOString();
          this.lastError = undefined;

          // Notify update listeners
          for (const callback of this.updateCallbacks) {
            try {
              callback(normalized);
            } catch (err) {
              logger.warn(`[RailKit Provider] Error in onUpdate callback: ${(err as Error).message}`);
            }
          }

          logger.info(`[RailKit Provider] Train ${cleanNum} normalized successfully (Status: ${normalized.status}, Stops: ${normalized.totalStops})`);
          return normalized;
        }

        const valError = `Telemetry validation failed for train ${cleanNum}`;
        logger.warn(`[RailKit Provider] ${valError}`);
        this.lastError = valError;
      } else {
        const errMsg = result?.error || result?.message || `RailKit returned unsuccessful response for train ${cleanNum}`;
        logger.warn(`[RailKit Provider] API response error: ${errMsg}`);
        this.lastError = errMsg;
        if (this.isRateLimitError(errMsg)) {
          this.setCooldown();
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown RailKit error';
      logger.error(`[RailKit Provider] Exception during trackTrainV2 for ${cleanNum}: ${errMsg}`);
      this.lastError = errMsg;
      if (this.isRateLimitError(errMsg)) {
        this.setCooldown();
      }
    }

    return this.handleFallbackOrUnavailable(cleanNum, this.resolveUnavailableReason(this.lastError));
  }

  public async getAllLiveStatuses(): Promise<TrainLiveStatus[]> {
    // In on-demand mode, return active cached statuses without making network requests
    return Array.from(this.cache.values()).map((c) => c.status);
  }

  public validateRawTelemetry(expectedTrainNum: string, data: RailKitLiveResponseData): boolean {
    if (!data || typeof data !== 'object') return false;

    const trainNo = data.trainInfo?.[0]?.number || expectedTrainNum;
    if (!trainNo || typeof trainNo !== 'string' || !trainNo.trim()) return false;

    const delay = data.delayMinutes ?? data.currentLocation?.delayMinutes;
    if (delay !== undefined && delay !== null && (typeof delay !== 'number' || !Number.isFinite(delay) || delay < 0 || delay > 1440)) {
      logger.warn(`[RailKit Provider] Telemetry rejected: invalid delay value (${delay}) for train ${trainNo}`);
      return false;
    }

    const currLoc = data.currentLocation;
    const speed = currLoc?.speedKmh ?? currLoc?.speed ?? data.speed;
    if (speed !== undefined && speed !== null && (typeof speed !== 'number' || !Number.isFinite(speed) || speed < 0 || speed > 300)) {
      logger.warn(`[RailKit Provider] Telemetry rejected: invalid speed value (${speed}) for train ${trainNo}`);
      return false;
    }

    const lat = currLoc?.lat ?? currLoc?.cord?.lat;
    if (lat !== undefined && lat !== null && (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90)) {
      logger.warn(`[RailKit Provider] Telemetry rejected: invalid latitude (${lat}) for train ${trainNo}`);
      return false;
    }

    const lng = currLoc?.lng ?? currLoc?.cord?.lon ?? currLoc?.cord?.lng;
    if (lng !== undefined && lng !== null && (typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180)) {
      logger.warn(`[RailKit Provider] Telemetry rejected: invalid longitude (${lng}) for train ${trainNo}`);
      return false;
    }

    return true;
  }

  public normalizeRawTelemetry(expectedTrainNum: string, raw: RailKitLiveResponseData): TrainLiveStatus {
    const rawTrain = raw.trainInfo?.[0];
    const trainNumber = (rawTrain?.number || expectedTrainNum || '12952').trim();

    // Train name resolution
    const trainName =
      rawTrain?.name && rawTrain.name.trim() && rawTrain.name.trim().toLowerCase() !== 'express train'
        ? rawTrain.name.trim()
        : KNOWN_TRAIN_NAMES[trainNumber] || null;

    // Route normalization using actual route array from RailKit
    const rawRoute = Array.isArray(raw.route) ? raw.route : [];
    const routeList: LiveRouteStop[] = rawRoute.map((item, idx) => ({
      sequence: typeof item.sequence === 'number' ? item.sequence : idx + 1,
      stationCode: (item.stnCode || item.stnName || '').trim(),
      stationName: (item.stnName || item.stnCode || '').trim(),
      lat: item.cord?.lat ?? item.lat ?? null,
      lng: item.cord?.lon ?? item.cord?.lng ?? item.lng ?? null,
      scheduledArrival: item.arrival?.scheduled || item.scheduledArrival || null,
      scheduledDeparture: item.departure?.scheduled || item.scheduledDeparture || null,
      actualArrival: item.arrival?.actual || item.actualArrival || null,
      actualDeparture: item.departure?.actual || item.actualDeparture || null,
      delayArrival: typeof item.arrival?.delay === 'number' ? item.arrival.delay : null,
      delayDeparture: typeof item.departure?.delay === 'number' ? item.departure.delay : null,
      status: item.status || null,
      distance: typeof item.distance === 'number' ? item.distance : null,
      platform: item.platform !== undefined && item.platform !== null ? String(item.platform) : null,
      isHalt: Boolean(item.isHalt),
    }));

    const majorHalts = routeList.length > 0 ? routeList.filter((r) => r.isHalt) : undefined;
    const routePoints = routeList.length > 0 ? routeList : undefined;

    const currLoc = raw.currentLocation;
    const prevHalt = raw.previousHalt;
    const nextHalt = raw.nextHalt;

    const currentStation = currLoc?.stnName || currLoc?.stnCode || null;
    const previousStation = prevHalt?.stnName || prevHalt?.stnCode || null;

    let nextStation: string | null = null;
    if (nextHalt?.stnName || nextHalt?.stnCode) {
      nextStation = nextHalt.stnName || nextHalt.stnCode || null;
    } else if (currLoc?.nextStation) {
      nextStation =
        typeof currLoc.nextStation === 'object'
          ? currLoc.nextStation.stnName || currLoc.nextStation.stnCode || null
          : String(currLoc.nextStation);
    }

    // Coordinates resolution
    let latitude: number | null = currLoc?.lat ?? currLoc?.cord?.lat ?? null;
    let longitude: number | null = currLoc?.lng ?? currLoc?.cord?.lon ?? currLoc?.cord?.lng ?? null;

    if ((latitude === null || longitude === null) && (currLoc?.stnCode || currLoc?.stnName || currLoc?.sequence)) {
      const match = routeList.find(
        (r) =>
          (currLoc.sequence && r.sequence === currLoc.sequence) ||
          (currLoc.stnCode && r.stationCode.toUpperCase() === currLoc.stnCode.toUpperCase()) ||
          (currLoc.stnName && r.stationName.toLowerCase() === currLoc.stnName.toLowerCase())
      );
      if (match && match.lat !== null && match.lat !== undefined && match.lng !== null && match.lng !== undefined) {
        latitude = match.lat;
        longitude = match.lng;
      } else if (currLoc.stnCode && KNOWN_STATION_COORDINATES[currLoc.stnCode.toUpperCase()]) {
        latitude = KNOWN_STATION_COORDINATES[currLoc.stnCode.toUpperCase()].lat;
        longitude = KNOWN_STATION_COORDINATES[currLoc.stnCode.toUpperCase()].lng;
      }
    }

    // Speed resolution (never invent speed)
    const speedVal = currLoc?.speedKmh ?? currLoc?.speed ?? raw.speed;
    const speed = typeof speedVal === 'number' && Number.isFinite(speedVal) ? speedVal : null;

    // Delay resolution
    const delayVal = raw.delayMinutes ?? currLoc?.delayMinutes;
    const delayMinutes = typeof delayVal === 'number' && Number.isFinite(delayVal) ? delayVal : 0;

    // Stops and progress resolution
    const totalStops = routeList.length > 0 ? routeList.length : undefined;
    let currentStopIndex = 0;
    if (currLoc?.sequence && totalStops) {
      currentStopIndex = Math.max(0, Math.min(currLoc.sequence - 1, totalStops - 1));
    } else if (currentStation && routeList.length > 0) {
      const idx = routeList.findIndex(
        (r) =>
          (currLoc?.stnCode && r.stationCode.toUpperCase() === currLoc.stnCode.toUpperCase()) ||
          r.stationName.toLowerCase() === currentStation.toLowerCase()
      );
      if (idx !== -1) currentStopIndex = idx;
    }

    // Status mapping
    const rawStatus = (raw.status || raw.statusText || currLoc?.status || '').toUpperCase();
    let status: TrainLiveStatus['status'] = 'ON_TIME';

    if (rawStatus.includes('END') || rawStatus.includes('ARRIV')) {
      status = 'ARRIVED';
    } else if (rawStatus.includes('CANCEL')) {
      status = 'CANCELLED';
    } else if (delayMinutes > 5 || rawStatus.includes('DELAY')) {
      status = 'DELAYED';
    } else if (rawStatus.includes('RUN') || rawStatus.includes('DEPART') || (currentStopIndex > 0 && currentStopIndex < (totalStops || 1) - 1)) {
      status = 'DEPARTED';
    } else if (rawStatus.includes('UNKNOWN')) {
      status = 'UNKNOWN';
    }

    // Progress calculation
    let routeProgress: number | null = null;
    if (status === 'ARRIVED') {
      routeProgress = 100;
    } else if (totalStops && totalStops > 1) {
      routeProgress = Math.min(100, Math.max(0, Number(((currentStopIndex / (totalStops - 1)) * 100).toFixed(1))));
    }

    // Data age & freshness
    let epochMs = Date.now();
    if (raw.lastUpdatedAt) {
      const parsed = Date.parse(raw.lastUpdatedAt);
      if (!isNaN(parsed) && parsed > 0) {
        epochMs = parsed;
      }
    }

    const dataAgeSeconds = Math.max(0, Math.floor((Date.now() - epochMs) / 1000));
    const isStale = dataAgeSeconds > 180;

    const scheduledArrival = routeList.length > 0 ? routeList[routeList.length - 1].scheduledArrival : null;
    const expectedArrival = routeList.length > 0 ? routeList[routeList.length - 1].actualArrival : null;

    return {
      trainNumber,
      trainName,
      currentStation,
      nextStation,
      previousStation,
      latitude,
      longitude,
      speed,
      delayMinutes,
      status,
      lastUpdated: isStale ? `Stale (${dataAgeSeconds}s ago)` : `${dataAgeSeconds}s ago`,
      expectedArrival: expectedArrival ?? null,
      scheduledArrival: scheduledArrival ?? null,
      progress: routeProgress,
      segmentProgress: null,
      currentStopIndex,
      totalStops,
      dataSource: 'real',
      dataAgeSeconds,
      isStale,
      liveDataAvailable: true,
      dataAvailabilityReason: 'live_telemetry_active',
      modelDataSource: 'synthetic-demo',
      routeStops: routeList.length > 0 ? routeList : undefined,
      majorHalts,
      routePoints,
    };
  }

  public async getProviderStatus(): Promise<RailwayDataProviderStatus> {
    return {
      provider: 'railkit',
      mode: this.isConfigured ? 'live' : 'demo',
      available: this.isConfigured,
      apiEnabled: this.isConfigured,
      apiConfigured: this.isConfigured,
      fallbackActive: false,
      staleDataDetected: false,
      lastSuccessfulRealDataTimestamp: this.lastSuccessfulRealDataTimestamp,
      lastError: this.lastError,
      lastStatusCheck: new Date().toISOString(),
    };
  }

  public async verifyConnection(): Promise<{
    status: string;
    provider: string;
    sourceProvider?: string;
    liveDataAvailable: boolean;
    apiConfigured: boolean;
    testTrainNumber: string;
    trainName?: string | null;
    currentStation?: string | null;
    statusText?: string | null;
    totalStops?: number;
    responseTimeMs?: number;
    lastSuccessfulRealDataTimestamp?: string | null;
    message?: string;
    verificationTimestamp: string;
  }> {
    if (!this.isConfigured) {
      return {
        status: 'not_configured',
        provider: 'railkit',
        liveDataAvailable: false,
        apiConfigured: false,
        testTrainNumber: '12952',
        message: 'RAILKIT_API_KEY environment variable is not configured',
        verificationTimestamp: new Date().toISOString(),
      };
    }

    const testTrainNum = '12952';
    const startTs = Date.now();

    try {
      const status = await this.getTrainLiveStatus(testTrainNum);
      const responseTimeMs = Date.now() - startTs;

      if (status && status.liveDataAvailable) {
        return {
          status: 'verified',
          provider: 'railkit',
          sourceProvider: 'wimt',
          liveDataAvailable: true,
          apiConfigured: true,
          testTrainNumber: testTrainNum,
          trainName: status.trainName,
          currentStation: status.currentStation,
          statusText: status.status,
          totalStops: status.totalStops,
          responseTimeMs,
          lastSuccessfulRealDataTimestamp: this.lastSuccessfulRealDataTimestamp,
          verificationTimestamp: new Date().toISOString(),
        };
      }

      return {
        status: 'provider_error',
        provider: 'railkit',
        liveDataAvailable: false,
        apiConfigured: true,
        testTrainNumber: testTrainNum,
        message: this.lastError || `Live data for train ${testTrainNum} returned unavailable from RailKit`,
        responseTimeMs,
        verificationTimestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        status: 'provider_error',
        provider: 'railkit',
        liveDataAvailable: false,
        apiConfigured: true,
        testTrainNumber: testTrainNum,
        message: (err as Error).message,
        responseTimeMs: Date.now() - startTs,
        verificationTimestamp: new Date().toISOString(),
      };
    }
  }

  public start(): void {
    logger.info('[RailKit Provider] Lifecycle active in ON-DEMAND mode (zero startup prefetch, zero background polling)');
  }

  public stop(): void {
    logger.info('Stopping RailKitDataProvider lifecycle');
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  public onUpdate(callback: (status: TrainLiveStatus) => void): void {
    this.updateCallbacks.push(callback);
  }

  private handleFallbackOrUnavailable(cleanNum: string, reason: string): TrainLiveStatus {
    const cached = this.lastKnownRealSnapshots.get(cleanNum);
    if (cached) {
      const ageSec = Math.max(0, Math.floor((Date.now() - cached.timestamp) / 1000));
      logger.info(`[RailKit Provider] Returning cached real snapshot for train ${cleanNum} (age: ${ageSec}s)`);
      return {
        ...cached.status,
        dataSource: 'real',
        isStale: true,
        liveDataAvailable: false,
        dataAvailabilityReason: 'cached_snapshot_retained',
        dataAgeSeconds: ageSec,
        lastUpdated: `Stale (${ageSec}s ago)`,
      };
    }

    const staticName = KNOWN_TRAIN_NAMES[cleanNum] || null;
    return {
      trainNumber: cleanNum,
      trainName: staticName,
      currentStation: null,
      nextStation: null,
      previousStation: null,
      latitude: null,
      longitude: null,
      speed: null,
      delayMinutes: null,
      status: null,
      lastUpdated: 'Live data unavailable',
      expectedArrival: null,
      scheduledArrival: null,
      progress: null,
      segmentProgress: null,
      currentStopIndex: undefined,
      totalStops: undefined,
      dataSource: 'real',
      dataAgeSeconds: undefined,
      isStale: true,
      liveDataAvailable: false,
      dataAvailabilityReason: reason,
      modelDataSource: 'synthetic-demo',
    };
  }

  private resolveUnavailableReason(errMsg?: string): string {
    if (!errMsg) return 'no_real_snapshot_available';
    if (this.isRateLimitError(errMsg)) return 'rate_limit_exceeded';
    if (errMsg.includes('401') || errMsg.includes('key')) return 'authentication_failed';
    if (errMsg.includes('404')) return 'train_not_found';
    if (errMsg.includes('503')) return 'provider_unavailable';
    return 'no_real_snapshot_available';
  }
}
