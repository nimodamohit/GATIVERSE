import { RailwayDataProvider, TrainLiveStatus, RailwayDataProviderStatus, LiveRouteStop } from '../interfaces/RailwayDataProvider.js';
import { RailwayApiClient, RawRailwayStatusResponse, ApiFetchResult } from './RailwayApiClient.js';
import { SimulatorRailwayDataProvider } from '../simulator/SimulatorRailwayDataProvider.js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export const KNOWN_TRAIN_NAMES: Record<string, string> = {
  '12952': 'Rajdhani Express',
  '12951': 'Mumbai Rajdhani Express',
  '12002': 'Shatabdi Express',
  '12001': 'Bhopal Shatabdi',
  '12626': 'Kerala Express',
  '12625': 'Kerala Express',
  '12138': 'Punjab Mail',
  '12137': 'Punjab Mail',
  '17606': 'Kacheguda Express',
};

export class RealRailwayDataProvider implements RailwayDataProvider {
  private apiClient: RailwayApiClient;
  private fallbackSimulator: SimulatorRailwayDataProvider;
  private updateCallbacks: Array<(status: TrainLiveStatus) => void> = [];
  private fallbackActive: boolean = false;
  private lastSuccessfulRealDataTimestamp: string | null = null;
  private lastError: string | undefined;
  private lastKnownRealSnapshots: Map<string, { status: TrainLiveStatus; timestamp: number }> = new Map();

  constructor() {
    this.apiClient = new RailwayApiClient({
      baseUrl: config.railwayApiBaseUrl,
      apiKey: config.railwayApiKey,
      timeoutMs: config.railwayApiTimeoutMs,
      cacheTtlMs: config.railwayCacheTtlMs,
    });

    this.fallbackSimulator = new SimulatorRailwayDataProvider();
    // Do NOT attach fallbackSimulator onUpdate listener when in Real mode.
    // In Real mode, simulator telemetry is strictly isolated and never emitted.
  }

  public getApiClient(): RailwayApiClient {
    return this.apiClient;
  }

  public async getTrainLiveStatus(trainNumber: string): Promise<TrainLiveStatus | null> {
    const cleanNum = trainNumber.trim();
    const isEnabled = config.railwayApiEnabled;
    const isConfigured = this.apiClient.isConfigured();

    if (isEnabled && isConfigured) {
      try {
        const fetchResult: ApiFetchResult = await this.apiClient.fetchRawTrainStatus(cleanNum);

        if (fetchResult.success && fetchResult.data) {
          const raw = fetchResult.data;
          if (this.validateRawTelemetry(cleanNum, raw)) {
            const normalized = this.normalizeRawTelemetry(cleanNum, raw);
            this.fallbackActive = false;
            this.lastSuccessfulRealDataTimestamp = new Date().toISOString();
            this.lastError = undefined;

            // Cache last successful real snapshot for stale fallback
            this.lastKnownRealSnapshots.set(cleanNum, { status: normalized, timestamp: Date.now() });

            logger.info(
              `[Real Provider] Path: ${fetchResult.requestedPath} | Status: 200 OK | Real Telemetry Normalized | Fallback: OFF`
            );
            return normalized;
          }

          const valError = `Telemetry validation failed for train ${cleanNum}`;
          logger.warn(`[Real Provider] Path: ${fetchResult.requestedPath} | Status: 200 | Error: ${valError}`);
          this.lastError = valError;
        } else {
          const apiMsg = fetchResult.errorMessage || `HTTP Error ${fetchResult.statusCode}`;
          logger.warn(`[Real Provider] Path: ${fetchResult.requestedPath} | Status: ${fetchResult.statusCode} | Error: ${apiMsg}`);
          this.lastError = apiMsg;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown provider error';
        logger.warn(`[Real Provider] Provider Exception: ${msg}`);
        this.lastError = msg;
      }
    } else {
      const reason = !isEnabled ? 'RAILWAY_API_ENABLED is false' : 'Missing API base URL or key';
      logger.info(`[Real Provider] Disabled/Unconfigured (${reason})`);
      this.lastError = `Real provider not active: ${reason}`;
    }

    // STATE B: REAL DATA STALE, LAST KNOWN SNAPSHOT EXISTS
    const cached = this.lastKnownRealSnapshots.get(cleanNum);
    if (cached) {
      const ageSec = Math.max(0, Math.floor((Date.now() - cached.timestamp) / 1000));
      const isStale = true; // Any cached snapshot used on provider failure is treated as stale
      logger.info(
        `[Real Provider] Returning cached real snapshot for train ${cleanNum} (age: ${ageSec}s, isStale: ${isStale})`
      );
      return {
        ...cached.status,
        dataSource: 'real',
        isStale,
        liveDataAvailable: false,
        dataAvailabilityReason: 'cached_snapshot_retained',
        dataAgeSeconds: ageSec,
        lastUpdated: `Stale (${ageSec}s ago)`,
      };
    }

    // STATE C: REAL PROVIDER UNAVAILABLE, NO LAST KNOWN SNAPSHOT
    const staticName = KNOWN_TRAIN_NAMES[cleanNum] || null;
    let reason = 'no_real_snapshot_available';
    if (this.lastError?.includes('429')) reason = 'rate_limit_exceeded';
    else if (this.lastError?.includes('401')) reason = 'authentication_failed';
    else if (this.lastError?.includes('404')) reason = 'train_not_found';
    else if (this.lastError?.includes('503')) reason = 'provider_unavailable';

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

  public async getAllLiveStatuses(): Promise<TrainLiveStatus[]> {
    const isEnabled = config.railwayApiEnabled;
    const isConfigured = this.apiClient.isConfigured();

    if (isEnabled && isConfigured) {
      try {
        const fetchResult = await this.apiClient.fetchRawTrainStatus('all');
        if (fetchResult.success && fetchResult.data) {
          const rawList = Array.isArray(fetchResult.data)
            ? fetchResult.data
            : Array.isArray(fetchResult.data.data)
            ? fetchResult.data.data
            : [];

          const validList = rawList
            .filter((raw) => this.validateRawTelemetry('', raw))
            .map((raw) => this.normalizeRawTelemetry('', raw));

          if (validList.length > 0) {
            for (const item of validList) {
              this.lastKnownRealSnapshots.set(item.trainNumber, { status: item, timestamp: Date.now() });
            }
            this.fallbackActive = false;
            this.lastSuccessfulRealDataTimestamp = new Date().toISOString();
            this.lastError = undefined;
            return validList;
          }
        }
      } catch (err) {
        logger.warn(`[Real Provider] Bulk fetch error: ${(err as Error).message}`);
      }
    }

    // In Real mode, return cached real snapshots marked stale instead of simulator data
    const result: TrainLiveStatus[] = [];
    const monitored = (process.env.HISTORICAL_MONITORED_TRAINS || '12952,12002')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    for (const trainNum of monitored) {
      const status = await this.getTrainLiveStatus(trainNum);
      if (status) result.push(status);
    }

    return result;
  }

  public extractPayloadObject(raw: RawRailwayStatusResponse): RawRailwayStatusResponse {
    if (raw && typeof raw === 'object') {
      if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
        return raw.data;
      }
      if (raw.result && typeof raw.result === 'object' && !Array.isArray(raw.result)) {
        return raw.result;
      }
    }
    return raw;
  }

  public validateRawTelemetry(expectedTrainNum: string, rawInput: RawRailwayStatusResponse): boolean {
    if (!rawInput || typeof rawInput !== 'object') return false;

    const raw = this.extractPayloadObject(rawInput);

    const trainNo =
      (typeof raw.train_number === 'string' ? raw.train_number : undefined) ||
      (typeof raw.trainNo === 'string' ? raw.trainNo : undefined) ||
      (typeof raw.train_no === 'string' ? raw.train_no : undefined) ||
      (typeof raw.number === 'string' ? raw.number : undefined) ||
      expectedTrainNum;

    if (!trainNo || typeof trainNo !== 'string' || !trainNo.trim()) return false;

    const delay = raw.delayMinutes ?? raw.delay_minutes ?? raw.delay;
    if (delay !== undefined && delay !== null && (typeof delay !== 'number' || !Number.isFinite(delay) || delay < 0 || delay > 1440)) {
      logger.warn(`[Real Provider] Telemetry rejected: invalid delay value (${delay}) for train ${trainNo}`);
      return false;
    }

    const currLoc = raw.currentLocation || raw.current_location;
    const speed = currLoc?.speedKmh ?? currLoc?.speed ?? raw.speed ?? raw.speed_kmph;
    if (speed !== undefined && speed !== null && (typeof speed !== 'number' || !Number.isFinite(speed) || speed < 0 || speed > 300)) {
      logger.warn(`[Real Provider] Telemetry rejected: invalid speed value (${speed}) for train ${trainNo}`);
      return false;
    }

    const lat = currLoc?.lat ?? currLoc?.latitude ?? raw.latitude ?? raw.lat;
    if (lat !== undefined && lat !== null && (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90)) {
      logger.warn(`[Real Provider] Telemetry rejected: invalid latitude (${lat}) for train ${trainNo}`);
      return false;
    }

    const lng = currLoc?.lng ?? currLoc?.longitude ?? raw.longitude ?? raw.lng;
    if (lng !== undefined && lng !== null && (typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180)) {
      logger.warn(`[Real Provider] Telemetry rejected: invalid longitude (${lng}) for train ${trainNo}`);
      return false;
    }

    return true;
  }

  public normalizeRawTelemetry(expectedTrainNum: string, rawInput: RawRailwayStatusResponse): TrainLiveStatus {
    const raw = this.extractPayloadObject(rawInput);

    const trainNumber =
      (typeof raw.train_number === 'string' ? raw.train_number : undefined) ||
      (typeof raw.trainNo === 'string' ? raw.trainNo : undefined) ||
      (typeof raw.train_no === 'string' ? raw.train_no : undefined) ||
      (typeof raw.number === 'string' ? raw.number : undefined) ||
      expectedTrainNum ||
      '12952';

    const rawName =
      (typeof raw.train_name === 'string' ? raw.train_name : undefined) ||
      (typeof raw.trainName === 'string' ? raw.trainName : undefined) ||
      (typeof raw.name === 'string' ? raw.name : undefined);

    const trainName =
      rawName && rawName.trim() && rawName.trim().toLowerCase() !== 'express train'
        ? rawName.trim()
        : KNOWN_TRAIN_NAMES[trainNumber] || null;

    const routeList: LiveRouteStop[] = Array.isArray(raw.route)
      ? raw.route.map((item, idx) => ({
          sequence: item.sequence ?? idx + 1,
          stationCode: item.stationCode || '',
          stationName: item.stationName || item.stationCode || '',
          lat: item.lat ?? item.latitude ?? null,
          lng: item.lng ?? item.longitude ?? null,
          scheduledArrival: item.scheduledArrival || null,
          scheduledDeparture: item.scheduledDeparture || null,
          actualArrival: item.actualArrival || null,
          actualDeparture: item.actualDeparture || null,
          delayArrival: item.delayArrival ?? null,
          delayDeparture: item.delayDeparture ?? null,
          status: item.status || null,
          distance: item.distance ?? null,
          platform: item.platform || null,
          isHalt: Boolean(item.scheduledArrival),
        }))
      : [];

    const majorHalts = routeList.length > 0 ? routeList.filter((r) => r.isHalt) : undefined;
    const routePoints = routeList.length > 0 ? routeList : undefined;

    const resolveStationName = (
      code?: string,
      name?: string,
      obj?: string | { code?: string; name?: string }
    ): string | null => {
      if (name && name.trim()) return name.trim();
      if (code && code.trim()) {
        const found = routeList.find((r) => r.stationCode === code.trim());
        if (found && found.stationName) return found.stationName;
        return code.trim();
      }
      if (obj) {
        if (typeof obj === 'string' && obj.trim()) return obj.trim();
        if (typeof obj === 'object') {
          if (obj.name && obj.name.trim()) return obj.name.trim();
          if (obj.code && obj.code.trim()) {
            const found = routeList.find((r) => r.stationCode === obj.code?.trim());
            if (found && found.stationName) return found.stationName;
            return obj.code.trim();
          }
        }
      }
      return null;
    };

    const currLoc = raw.currentLocation || raw.current_location;
    const prevHalt = raw.previousHalt || raw.previous_halt;
    const nextHalt = raw.nextHalt || raw.next_halt;

    const previousStation = resolveStationName(
      prevHalt?.stationCode,
      prevHalt?.stationName,
      raw.previous_station
    );

    const nextStation = resolveStationName(
      nextHalt?.stationCode,
      nextHalt?.stationName,
      raw.next_station || raw.nextStationName
    );

    let currentStation = resolveStationName(
      currLoc?.stationCode,
      currLoc?.stationName,
      raw.current_station || raw.currentStationName
    );

    // If currentLocation is unavailable but previousHalt and nextHalt exist -> 'En route'
    if (!currentStation && (previousStation || nextStation)) {
      currentStation = 'En route';
    }

    const KNOWN_STATION_COORDINATES: Record<string, { lat: number; lng: number }> = {
      NDLS: { lat: 28.6139, lng: 77.2090 },
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
      BVI: { lat: 19.2290, lng: 72.8567 },
      MMCT: { lat: 18.9696, lng: 72.8193 },
      CSMT: { lat: 18.9398, lng: 72.8355 },
    };

    // Lat/Lng resolution
    let latitude: number | null = currLoc?.lat ?? currLoc?.latitude ?? raw.latitude ?? raw.lat ?? null;
    let longitude: number | null = currLoc?.lng ?? currLoc?.longitude ?? raw.longitude ?? raw.lng ?? null;

    if ((latitude === null || longitude === null) && currLoc?.stationCode) {
      const match = routeList.find((r) => r.stationCode === currLoc.stationCode);
      if (match && match.lat !== null && match.lat !== undefined && match.lng !== null && match.lng !== undefined) {
        latitude = match.lat;
        longitude = match.lng;
      } else if (KNOWN_STATION_COORDINATES[currLoc.stationCode]) {
        latitude = KNOWN_STATION_COORDINATES[currLoc.stationCode].lat;
        longitude = KNOWN_STATION_COORDINATES[currLoc.stationCode].lng;
      }
    }

    // Speed resolution: if null from provider -> null (never synthesize speed)
    const speedVal = currLoc?.speedKmh ?? currLoc?.speed ?? raw.speed ?? raw.speed_kmph;
    const speed = speedVal !== undefined && speedVal !== null && Number.isFinite(speedVal) ? speedVal : null;

    // Delay resolution
    const delayVal = raw.delayMinutes ?? raw.delay_minutes ?? raw.delay;
    const delayMinutes = delayVal !== undefined && delayVal !== null && Number.isFinite(delayVal) ? delayVal : 0;

    // Station stops count & current stop sequence resolution
    const totalStops = routeList.length > 0 ? routeList.length : raw.total_stops;
    let currentStopIndex = 0;
    if (currLoc?.sequence && Number.isFinite(currLoc.sequence) && totalStops) {
      currentStopIndex = Math.max(0, Math.min(currLoc.sequence - 1, totalStops - 1));
    } else if (currentStation && routeList.length > 0) {
      const idx = routeList.findIndex(
        (r) =>
          (currLoc?.stationCode && r.stationCode === currLoc.stationCode) ||
          (r.stationName && r.stationName.toLowerCase() === currentStation.toLowerCase())
      );
      if (idx !== -1) currentStopIndex = idx;
    } else if (totalStops) {
      currentStopIndex = Math.max(0, Math.min(raw.current_stop_index ?? 0, totalStops - 1));
    }

    // Segment progress (0.0 to 1.0 or 0 to 100 between current and next station)
    const rawSegProgress = currLoc?.segmentProgress ?? raw.progress_percentage ?? 0;
    const segmentProgress = typeof rawSegProgress === 'number' && Number.isFinite(rawSegProgress)
      ? rawSegProgress
      : 0;

    // Route progress (completed journey progress across entire route 0 to 100%)
    const segRatio = segmentProgress <= 1.0 ? segmentProgress : segmentProgress / 100;
    const routeProgress = totalStops && totalStops > 1
      ? Math.min(100, Math.max(0, Number((((currentStopIndex + segRatio) / (totalStops - 1)) * 100).toFixed(1))))
      : null;

    // Status resolution
    const statusCode = currLoc?.status || raw.status_code || raw.status || raw.running_status || '';
    let status: TrainLiveStatus['status'] = 'ON_TIME';
    if (statusCode.toUpperCase().includes('ARRIV')) status = 'ARRIVED';
    else if (statusCode.toUpperCase().includes('CANCEL')) status = 'CANCELLED';
    else if (delayMinutes > 5 || statusCode.toUpperCase().includes('DELAY')) status = 'DELAYED';
    else if ((routeProgress !== null && routeProgress > 0) || statusCode.toUpperCase().includes('RUN') || statusCode.toUpperCase().includes('DEPART')) status = 'DEPARTED';

    // Freshness & Last Updated resolution
    let epochMs = Date.now();
    if (raw.lastUpdatedAt) {
      const parsed = new Date(raw.lastUpdatedAt).getTime();
      if (!isNaN(parsed) && parsed > 0) epochMs = parsed;
    } else if (raw.last_updated_epoch) {
      epochMs = raw.last_updated_epoch * 1000;
    } else if (raw.last_updated_ts) {
      epochMs = raw.last_updated_ts * 1000;
    }

    const dataAgeSeconds = Math.max(0, Math.floor((Date.now() - epochMs) / 1000));
    const isStale = dataAgeSeconds > 180;

    // Arrival time resolution
    const scheduledArrival = raw.scheduled_arrival || (routeList.length > 0 ? routeList[routeList.length - 1].scheduledArrival : null);
    const expectedArrival = raw.expected_arrival || (routeList.length > 0 ? routeList[routeList.length - 1].actualArrival : null);

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
      segmentProgress,
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

  public async verifyConnection(): Promise<{
    status: string;
    provider: string;
    liveDataAvailable: boolean;
    apiEnabled: boolean;
    apiConfigured: boolean;
    testTrainNumber?: string;
    requestedPath?: string;
    statusCode?: number;
    responseTime?: number;
    message?: string;
    verificationTimestamp: string;
    dataAgeSeconds?: number;
    lastSuccessfulRealDataTimestamp?: string | null;
  }> {
    const isEnabled = config.railwayApiEnabled;
    const isConfigured = this.apiClient.isConfigured();

    if (!isEnabled || !isConfigured) {
      return {
        status: 'not_configured',
        provider: 'real',
        liveDataAvailable: false,
        apiEnabled: isEnabled,
        apiConfigured: isConfigured,
        message: 'Real railway API provider is not enabled or credentials are missing.',
        verificationTimestamp: new Date().toISOString(),
      };
    }

    const testTrainNum = '12952';
    const fetchResult = await this.apiClient.fetchRawTrainStatus(testTrainNum);

    if (!fetchResult.success || !fetchResult.data) {
      return {
        status: 'provider_error',
        provider: 'real',
        liveDataAvailable: false,
        apiEnabled: true,
        apiConfigured: true,
        testTrainNumber: testTrainNum,
        requestedPath: fetchResult.requestedPath,
        statusCode: fetchResult.statusCode,
        responseTime: fetchResult.responseTimeMs,
        message: fetchResult.errorMessage || `Failed to contact real railway API for train ${testTrainNum}`,
        verificationTimestamp: new Date().toISOString(),
      };
    }

    const isValid = this.validateRawTelemetry(testTrainNum, fetchResult.data);
    if (!isValid) {
      return {
        status: 'provider_error',
        provider: 'real',
        liveDataAvailable: false,
        apiEnabled: true,
        apiConfigured: true,
        testTrainNumber: testTrainNum,
        requestedPath: fetchResult.requestedPath,
        statusCode: fetchResult.statusCode,
        responseTime: fetchResult.responseTimeMs,
        message: `Real railway API returned malformed or unvalidated telemetry for train ${testTrainNum}`,
        verificationTimestamp: new Date().toISOString(),
      };
    }

    const normalized = this.normalizeRawTelemetry(testTrainNum, fetchResult.data);
    this.lastKnownRealSnapshots.set(testTrainNum, { status: normalized, timestamp: Date.now() });
    this.lastSuccessfulRealDataTimestamp = new Date().toISOString();
    this.lastError = undefined;

    const rawPayload = this.extractPayloadObject(fetchResult.data);
    const epoch = rawPayload.last_updated_epoch
      ? rawPayload.last_updated_epoch * 1000
      : rawPayload.last_updated_ts
      ? rawPayload.last_updated_ts * 1000
      : Date.now();
    const dataAgeSeconds = Math.max(0, Math.floor((Date.now() - epoch) / 1000));

    return {
      status: 'verified',
      provider: 'real',
      liveDataAvailable: true,
      apiEnabled: true,
      apiConfigured: true,
      testTrainNumber: testTrainNum,
      requestedPath: fetchResult.requestedPath,
      statusCode: fetchResult.statusCode,
      lastSuccessfulRealDataTimestamp: this.lastSuccessfulRealDataTimestamp,
      responseTime: fetchResult.responseTimeMs,
      dataAgeSeconds,
      verificationTimestamp: new Date().toISOString(),
    };
  }

  public async getProviderStatus(): Promise<RailwayDataProviderStatus> {
    const isEnabled = config.railwayApiEnabled;
    const isConfigured = this.apiClient.isConfigured();
    const isLiveActive = isEnabled && isConfigured;

    return {
      provider: 'real',
      mode: isLiveActive ? 'live' : 'demo',
      available: true,
      apiEnabled: isEnabled,
      apiConfigured: isConfigured,
      fallbackActive: false, // Never fall back to simulator when in Real mode
      lastSuccessfulRealDataTimestamp: this.lastSuccessfulRealDataTimestamp,
      lastError: this.lastError,
      lastStatusCheck: new Date().toISOString(),
    };
  }

  public start(): void {
    logger.info('Starting RealRailwayDataProvider lifecycle (Real Mode active; Simulator standby disabled)');
    // Perform initial fetch in background to populate initial cache state if available
    this.getAllLiveStatuses().catch((err) => {
      logger.warn(`[Real Provider] Initial startup fetch error: ${(err as Error).message}`);
    });
  }

  public stop(): void {
    logger.info('Stopping RealRailwayDataProvider lifecycle');
  }

  public onUpdate(callback: (status: TrainLiveStatus) => void): void {
    this.updateCallbacks.push(callback);
  }
}
