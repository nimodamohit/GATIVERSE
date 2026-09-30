import { logger } from '../../utils/logger.js';
import { config } from '../../config/env.js';

export interface RailwayApiClientConfig {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
  cacheTtlMs?: number;
}

export interface RawCurrentLocation {
  stationCode?: string;
  stationName?: string;
  sequence?: number;
  status?: string;
  isHalt?: boolean;
  isActualPosition?: boolean;
  segmentProgress?: number;
  speedKmh?: number;
  speed?: number;
  bearingDegrees?: number;
  lat?: number;
  latitude?: number;
  lng?: number;
  longitude?: number;
}

export interface RawHaltStation {
  stationCode?: string;
  stationName?: string;
  sequence?: number;
  distance?: number;
}

export interface RawRouteItem {
  sequence?: number;
  stationCode?: string;
  stationName?: string;
  lat?: number;
  latitude?: number;
  lng?: number;
  longitude?: number;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  actualArrival?: string;
  actualDeparture?: string;
  delayArrival?: number;
  delayDeparture?: number;
  status?: string;
  distance?: number;
  platform?: string;
}

export interface RawRailwayStatusResponse {
  trainNo?: string;
  train_number?: string;
  train_no?: string;
  number?: string;
  trainName?: string;
  train_name?: string;
  name?: string;
  lastUpdatedAt?: string;
  last_updated_epoch?: number;
  last_updated_ts?: number;
  delayMinutes?: number;
  delay_minutes?: number;
  delay?: number;
  currentLocation?: RawCurrentLocation;
  current_location?: RawCurrentLocation;
  previousHalt?: RawHaltStation;
  previous_halt?: RawHaltStation;
  nextHalt?: RawHaltStation;
  next_halt?: RawHaltStation;
  route?: RawRouteItem[];
  current_station?: string | { code?: string; name?: string };
  currentStationName?: string;
  next_station?: string | { code?: string; name?: string };
  nextStationName?: string;
  previous_station?: string | { code?: string; name?: string };
  lat?: number;
  latitude?: number;
  lng?: number;
  longitude?: number;
  speed?: number;
  speed_kmph?: number;
  status_code?: string;
  status?: string;
  running_status?: string;
  scheduled_arrival?: string;
  expected_arrival?: string;
  progress_percentage?: number;
  current_stop_index?: number;
  total_stops?: number;
  data?: RawRailwayStatusResponse;
  result?: RawRailwayStatusResponse;
  message?: string;
  error?: string;
}

export interface ApiFetchResult {
  success: boolean;
  statusCode: number;
  data: RawRailwayStatusResponse | null;
  errorMessage?: string;
  responseTimeMs: number;
  requestedPath: string;
}

interface RawCacheEntry {
  result: ApiFetchResult;
  cachedAt: number;
}

export class RailwayApiClient {
  private config: RailwayApiClientConfig;
  private cache: Map<string, RawCacheEntry> = new Map();

  constructor(clientConfig: RailwayApiClientConfig) {
    this.config = clientConfig;
  }

  public isConfigured(): boolean {
    return Boolean(
      this.config.baseUrl &&
        this.config.baseUrl.trim() &&
        this.config.apiKey &&
        this.config.apiKey.trim()
    );
  }

  public async fetchRawTrainStatus(trainNumber: string): Promise<ApiFetchResult> {
    const cleanNum = trainNumber.trim();
    const baseUrl = (this.config.baseUrl || '').replace(/\/+$/, '');
    const requestedPath = baseUrl.endsWith('/v1')
      ? `/trains/${cleanNum}/live`
      : `/v1/trains/${cleanNum}/live`;
    const targetUrl = `${baseUrl}${requestedPath}`;

    if (!this.isConfigured()) {
      logger.warn('[API Client] Configuration missing (base URL or API key)');
      return {
        success: false,
        statusCode: 0,
        data: null,
        errorMessage: 'API base URL or API key not configured',
        responseTimeMs: 0,
        requestedPath,
      };
    }

    const ttl = this.config.cacheTtlMs || config.railwayCacheTtlMs || 5000;
    const cached = this.cache.get(cleanNum);

    if (cached && Date.now() - cached.cachedAt < ttl) {
      logger.info(`[API Client] Returning cached telemetry for train ${cleanNum} (TTL ${ttl}ms)`);
      return cached.result;
    }

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs || 10000);

      logger.info(`[API Client] Executing request: GET ${requestedPath}`);

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey.trim()}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;
      const statusCode = response.status;

      if (!response.ok) {
        let errorMsg = `HTTP Error ${statusCode}`;
        if (statusCode === 400) errorMsg = 'Bad Request (HTTP 400): Invalid train parameters';
        else if (statusCode === 401) errorMsg = 'Authentication Failure (HTTP 401): Invalid or expired API key';
        else if (statusCode === 404) errorMsg = `Train Not Found (HTTP 404): No live telemetry for train ${cleanNum}`;
        else if (statusCode === 429) errorMsg = 'Rate Limit Exceeded (HTTP 429): Quota limit reached';
        else if (statusCode === 503) errorMsg = 'Service Unavailable (HTTP 503): Upstream provider temporary outage';

        logger.warn(
          `[API Client] Path: ${requestedPath} | Status: ${statusCode} | Duration: ${responseTimeMs}ms | Msg: ${errorMsg}`
        );

        const failResult: ApiFetchResult = {
          success: false,
          statusCode,
          data: null,
          errorMessage: errorMsg,
          responseTimeMs,
          requestedPath,
        };
        return failResult;
      }

      const rawJson = (await response.json()) as RawRailwayStatusResponse;
      const successResult: ApiFetchResult = {
        success: true,
        statusCode: 200,
        data: rawJson,
        responseTimeMs,
        requestedPath,
      };

      this.cache.set(cleanNum, { result: successResult, cachedAt: Date.now() });
      logger.info(`[API Client] Path: ${requestedPath} | Status: 200 OK | Duration: ${responseTimeMs}ms`);
      return successResult;
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const err = error as Error;
      const isTimeout = err.name === 'AbortError';
      const errorMsg = isTimeout
        ? `Request Timeout after ${this.config.timeoutMs}ms`
        : `Network Error: ${err.message}`;

      logger.warn(`[API Client] Path: ${requestedPath} | Status: 0 | Duration: ${responseTimeMs}ms | Msg: ${errorMsg}`);

      return {
        success: false,
        statusCode: isTimeout ? 408 : 500,
        data: null,
        errorMessage: errorMsg,
        responseTimeMs,
        requestedPath,
      };
    }
  }

  public async fetchRawAllStatuses(): Promise<RawRailwayStatusResponse[]> {
    if (!this.isConfigured()) {
      return [];
    }

    const cleanNum = 'all';
    const res = await this.fetchRawTrainStatus(cleanNum);
    if (res.success && res.data) {
      const payload = res.data.data ? res.data.data : res.data;
      if (Array.isArray(payload)) {
        return payload as RawRailwayStatusResponse[];
      }
    }
    return [];
  }

  public async fetchRawStationsSearch(query: string, limit: number = 10): Promise<ApiFetchResult> {
    const cleanQ = query.trim();
    const cacheKey = `stations:${cleanQ.toLowerCase()}:${limit}`;
    const baseUrl = (this.config.baseUrl || '').replace(/\/+$/, '');
    const requestedPath = `/v1/lookup/search/stations?q=${encodeURIComponent(cleanQ)}&limit=${limit}`;
    const targetUrl = baseUrl.endsWith('/v1')
      ? `${baseUrl.replace(/\/v1$/, '')}${requestedPath}`
      : `${baseUrl}${requestedPath}`;

    if (!this.isConfigured()) {
      return {
        success: false,
        statusCode: 0,
        data: null,
        errorMessage: 'API base URL or API key not configured',
        responseTimeMs: 0,
        requestedPath,
      };
    }

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < 30000) {
      logger.info(`[API Client] Returning cached station search for query '${cleanQ}'`);
      return cached.result;
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs || 10000);

      logger.info(`[API Client] Executing station search: GET ${requestedPath}`);

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey.trim()}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;
      const statusCode = response.status;

      if (!response.ok) {
        let errorMsg = `HTTP Error ${statusCode}`;
        if (statusCode === 429) errorMsg = 'Rate Limit Exceeded (HTTP 429)';
        const failResult: ApiFetchResult = {
          success: false,
          statusCode,
          data: null,
          errorMessage: errorMsg,
          responseTimeMs,
          requestedPath,
        };
        return failResult;
      }

      const rawJson = await response.json();
      const successResult: ApiFetchResult = {
        success: true,
        statusCode: 200,
        data: rawJson,
        responseTimeMs,
        requestedPath,
      };

      this.cache.set(cacheKey, { result: successResult, cachedAt: Date.now() });
      return successResult;
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const err = error as Error;
      return {
        success: false,
        statusCode: err.name === 'AbortError' ? 408 : 500,
        data: null,
        errorMessage: err.message,
        responseTimeMs,
        requestedPath,
      };
    }
  }

  public async fetchRawTrainsBetween(
    from: string,
    to: string,
    date?: string,
    live: boolean = true
  ): Promise<ApiFetchResult> {
    const fromClean = from.trim().toUpperCase();
    const toClean = to.trim().toUpperCase();
    const dateClean = date ? date.trim() : '';
    const cacheKey = `search:${fromClean}:${toClean}:${dateClean}:${live}`;
    const baseUrl = (this.config.baseUrl || '').replace(/\/+$/, '');
    
    const queryParams = new URLSearchParams();
    if (dateClean) queryParams.set('date', dateClean);
    if (live) queryParams.set('live', 'true');
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

    const requestedPath = `/v1/trains/between/${encodeURIComponent(fromClean)}/${encodeURIComponent(toClean)}${queryString}`;
    const targetUrl = baseUrl.endsWith('/v1')
      ? `${baseUrl.replace(/\/v1$/, '')}${requestedPath}`
      : `${baseUrl}${requestedPath}`;

    if (!this.isConfigured()) {
      return {
        success: false,
        statusCode: 0,
        data: null,
        errorMessage: 'API base URL or API key not configured',
        responseTimeMs: 0,
        requestedPath,
      };
    }

    const ttl = this.config.cacheTtlMs || 5000;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < ttl) {
      logger.info(`[API Client] Returning cached search for ${fromClean} -> ${toClean} (TTL ${ttl}ms)`);
      return cached.result;
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs || 10000);

      logger.info(`[API Client] Executing trains search: GET ${requestedPath}`);

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey.trim()}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;
      const statusCode = response.status;

      if (!response.ok) {
        let errorMsg = `HTTP Error ${statusCode}`;
        if (statusCode === 400) errorMsg = 'Invalid station parameters (HTTP 400)';
        else if (statusCode === 401) errorMsg = 'Authentication Failure (HTTP 401)';
        else if (statusCode === 429) errorMsg = 'Rate Limit Exceeded (HTTP 429)';
        else if (statusCode === 503) errorMsg = 'Upstream provider outage (HTTP 503)';

        logger.warn(`[API Client] Path: ${requestedPath} | Status: ${statusCode} | Msg: ${errorMsg}`);
        return {
          success: false,
          statusCode,
          data: null,
          errorMessage: errorMsg,
          responseTimeMs,
          requestedPath,
        };
      }

      const rawJson = await response.json();
      const successResult: ApiFetchResult = {
        success: true,
        statusCode: 200,
        data: rawJson,
        responseTimeMs,
        requestedPath,
      };

      this.cache.set(cacheKey, { result: successResult, cachedAt: Date.now() });
      logger.info(`[API Client] Path: ${requestedPath} | Status: 200 OK | Duration: ${responseTimeMs}ms`);
      return successResult;
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const err = error as Error;
      return {
        success: false,
        statusCode: err.name === 'AbortError' ? 408 : 500,
        data: null,
        errorMessage: err.message,
        responseTimeMs,
        requestedPath,
      };
    }
  }

  public async fetchRawSeatAvailability(
    trainNumber: string,
    source: string,
    destination: string,
    journeyDate: string,
    classCode: string = '3A',
    quotaCode: string = 'GN'
  ): Promise<ApiFetchResult> {
    const cleanNum = trainNumber.trim();
    const src = source.trim().toUpperCase();
    const dst = destination.trim().toUpperCase();
    const date = journeyDate.trim();
    const cls = classCode.trim().toUpperCase();
    const quota = quotaCode.trim().toUpperCase();

    const cacheKey = `seats:${cleanNum}:${src}:${dst}:${date}:${cls}:${quota}`;
    const baseUrl = (this.config.baseUrl || '').replace(/\/+$/, '');
    const requestedPath = `/v1/trains/${cleanNum}/seats?source=${encodeURIComponent(src)}&destination=${encodeURIComponent(dst)}&journeyDate=${encodeURIComponent(date)}&classCode=${encodeURIComponent(cls)}&quotaCode=${encodeURIComponent(quota)}`;
    const targetUrl = baseUrl.endsWith('/v1')
      ? `${baseUrl.replace(/\/v1$/, '')}${requestedPath}`
      : `${baseUrl}${requestedPath}`;

    if (!this.isConfigured()) {
      return {
        success: false,
        statusCode: 0,
        data: null,
        errorMessage: 'API base URL or API key not configured',
        responseTimeMs: 0,
        requestedPath,
      };
    }

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < 10000) {
      logger.info(`[API Client] Returning cached seat availability for train ${cleanNum} (${src}->${dst})`);
      return cached.result;
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs || 10000);

      logger.info(`[API Client] Executing seat availability fetch: GET ${requestedPath}`);

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey.trim()}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;
      const statusCode = response.status;

      if (!response.ok) {
        let errorMsg = `HTTP Error ${statusCode}`;
        if (statusCode === 400) errorMsg = 'Invalid journey details (HTTP 400)';
        else if (statusCode === 401) errorMsg = 'Authentication/provider error (HTTP 401)';
        else if (statusCode === 404) errorMsg = `Train not found (HTTP 404): ${cleanNum}`;
        else if (statusCode === 429) errorMsg = 'Rate limit reached (HTTP 429)';
        else if (statusCode === 503) errorMsg = 'Railway provider temporarily unavailable (HTTP 503)';

        logger.warn(`[API Client] Path: ${requestedPath} | Status: ${statusCode} | Msg: ${errorMsg}`);
        return {
          success: false,
          statusCode,
          data: null,
          errorMessage: errorMsg,
          responseTimeMs,
          requestedPath,
        };
      }

      const rawJson = await response.json();
      const successResult: ApiFetchResult = {
        success: true,
        statusCode: 200,
        data: rawJson,
        responseTimeMs,
        requestedPath,
      };

      this.cache.set(cacheKey, { result: successResult, cachedAt: Date.now() });
      logger.info(`[API Client] Path: ${requestedPath} | Status: 200 OK | Duration: ${responseTimeMs}ms`);
      return successResult;
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const err = error as Error;
      return {
        success: false,
        statusCode: err.name === 'AbortError' ? 408 : 500,
        data: null,
        errorMessage: err.message,
        responseTimeMs,
        requestedPath,
      };
    }
  }

  public async fetchRawFare(
    trainNumber: string,
    source: string,
    destination: string,
    journeyDate: string,
    classCode: string = '3A',
    quotaCode: string = 'GN'
  ): Promise<ApiFetchResult> {
    const cleanNum = trainNumber.trim();
    const src = source.trim().toUpperCase();
    const dst = destination.trim().toUpperCase();
    const date = journeyDate.trim();
    const cls = classCode.trim().toUpperCase();
    const quota = quotaCode.trim().toUpperCase();

    const cacheKey = `fare:${cleanNum}:${src}:${dst}:${date}:${cls}:${quota}`;
    const baseUrl = (this.config.baseUrl || '').replace(/\/+$/, '');
    const requestedPath = `/v1/trains/${cleanNum}/fare?source=${encodeURIComponent(src)}&destination=${encodeURIComponent(dst)}&journeyDate=${encodeURIComponent(date)}&classCode=${encodeURIComponent(cls)}&quotaCode=${encodeURIComponent(quota)}`;
    const targetUrl = baseUrl.endsWith('/v1')
      ? `${baseUrl.replace(/\/v1$/, '')}${requestedPath}`
      : `${baseUrl}${requestedPath}`;

    if (!this.isConfigured()) {
      return {
        success: false,
        statusCode: 0,
        data: null,
        errorMessage: 'API base URL or API key not configured',
        responseTimeMs: 0,
        requestedPath,
      };
    }

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < 30000) {
      logger.info(`[API Client] Returning cached fare for train ${cleanNum} (${src}->${dst})`);
      return cached.result;
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs || 10000);

      logger.info(`[API Client] Executing fare fetch: GET ${requestedPath}`);

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey.trim()}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;
      const statusCode = response.status;

      if (!response.ok) {
        let errorMsg = `HTTP Error ${statusCode}`;
        if (statusCode === 400) errorMsg = 'Invalid journey details (HTTP 400)';
        else if (statusCode === 401) errorMsg = 'Authentication/provider error (HTTP 401)';
        else if (statusCode === 404) errorMsg = `Train not found (HTTP 404): ${cleanNum}`;
        else if (statusCode === 429) errorMsg = 'Rate limit reached (HTTP 429)';
        else if (statusCode === 503) errorMsg = 'Railway provider temporarily unavailable (HTTP 503)';

        logger.warn(`[API Client] Path: ${requestedPath} | Status: ${statusCode} | Msg: ${errorMsg}`);
        return {
          success: false,
          statusCode,
          data: null,
          errorMessage: errorMsg,
          responseTimeMs,
          requestedPath,
        };
      }

      const rawJson = await response.json();
      const successResult: ApiFetchResult = {
        success: true,
        statusCode: 200,
        data: rawJson,
        responseTimeMs,
        requestedPath,
      };

      this.cache.set(cacheKey, { result: successResult, cachedAt: Date.now() });
      logger.info(`[API Client] Path: ${requestedPath} | Status: 200 OK | Duration: ${responseTimeMs}ms`);
      return successResult;
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const err = error as Error;
      return {
        success: false,
        statusCode: err.name === 'AbortError' ? 408 : 500,
        data: null,
        errorMessage: err.message,
        responseTimeMs,
        requestedPath,
      };
    }
  }
}


