import fs from 'fs';
import path from 'path';
import { TrainLiveStatus, railwayDataProvider } from '../providers/index.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

export interface TelemetrySnapshot {
  trainNumber: string;
  journeyDate: string;
  timestamp: string;
  currentStation: string | null;
  previousStation: string | null;
  nextStation: string | null;
  currentStopIndex: number;
  totalStops: number;
  delayMinutes: number;
  speedKmh: number | null;
  latitude: number | null;
  longitude: number | null;
  progress: number;
  scheduledArrival: string | null;
  expectedArrival: string | null;
  actualArrival: string | null;
  distanceRemaining: number;
  elapsedJourneyMinutes: number;
  scheduledRemainingMinutes: number;
  resolvedTargetMinutes?: number | null;
}

export interface QuotaCalculation {
  monitoredTrains: number;
  intervalMs: number;
  requestsPerMinute: number;
  estimatedRequestsPerDay: number;
  estimatedRequestsPerMonth: number;
  configuredQuota: number;
  quotaUtilization: number;
  quotaSafe: boolean;
  quotaOverrideActive: boolean;
  cacheTtlMs: number;
}

export interface DatasetStatistics {
  totalSnapshots: number;
  validSnapshots: number;
  rejectedSnapshots: number;
  uniqueTrainNumbers: number;
  uniqueJourneyIds: number;
  completedJourneys: number;
  unresolvedJourneys: number;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  snapshotsPerJourney: number;
  duplicateCount: number;
}

const SNAPSHOT_DIR = path.join(process.cwd(), '..', 'ml-service', 'data', 'snapshots');

export class HistoricalCollectorService {
  private lastSnapshots: Map<string, TelemetrySnapshot> = new Map();
  private rejectedCount: number = 0;
  private collectedCount: number = 0;
  private duplicateCount: number = 0;
  private collectionTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.ensureDirectoryExists();
  }

  public isCollectionActive(): boolean {
    return this.collectionTimer !== null;
  }

  public isCollectionEnabled(): boolean {
    return process.env.HISTORICAL_COLLECTION_ENABLED === 'true' || config.historicalCollectionEnabled === true;
  }

  public startCollection(): void {
    if (!this.isCollectionEnabled()) {
      logger.info(
        '[Historical Collector] Real historical data collection is DISABLED (HISTORICAL_COLLECTION_ENABLED=false). Skipping startup.'
      );
      return;
    }

    const quota = this.calculateQuotaConsumption();
    if (!quota.quotaSafe) {
      logger.warn(
        `[Historical Collector] Collection NOT started: quotaSafe=false (${quota.estimatedRequestsPerMonth} > ${quota.configuredQuota})`
      );
      return;
    }

    if (this.collectionTimer) {
      logger.info('[Historical Collector] Real historical data collection is already active.');
      return;
    }

    const trainsEnv = process.env.HISTORICAL_MONITORED_TRAINS || '12952,12002';
    const trains = trainsEnv
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const interval = Math.max(10000, config.realDataCollectionIntervalMs || 300000);

    logger.info(
      `[Historical Collector] STARTING REAL telemetry collection for ${trains.length} trains (${trains.join(
        ', '
      )}) every ${interval}ms (Est: ${quota.estimatedRequestsPerDay} req/day, ${quota.estimatedRequestsPerMonth} req/month, Safe: ${quota.quotaSafe})`
    );

    const collectCycle = async () => {
      for (const trainNum of trains) {
        try {
          const status = await railwayDataProvider.getTrainLiveStatus(trainNum);
          if (status) {
            const snap = this.recordSnapshot(status);
            if (snap) {
              logger.info(
                `[Historical Collector] Captured REAL telemetry snapshot for train ${trainNum} (Station: ${snap.currentStation || 'Enroute'}, Progress: ${snap.progress}%, Delay: ${snap.delayMinutes}m, Provider: ${status.dataSource})`
              );
            }
          }
        } catch (err) {
          logger.warn(`[Historical Collector] Error collecting telemetry for train ${trainNum}: ${(err as Error).message}`);
        }
      }
    };

    // Run initial collection cycle immediately upon start
    collectCycle().catch((err) =>
      logger.warn(`[Historical Collector] Initial collection cycle error: ${(err as Error).message}`)
    );

    // Schedule recurring interval
    this.collectionTimer = setInterval(collectCycle, interval);
  }

  public stopCollection(): void {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = null;
      logger.info('[Historical Collector] Stopped real telemetry collection.');
    }
  }

  private ensureDirectoryExists() {
    try {
      if (!fs.existsSync(SNAPSHOT_DIR)) {
        fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
      }
    } catch (err) {
      logger.warn(`Could not create snapshot directory: ${(err as Error).message}`);
    }
  }

  // 1. Quota Calculation & Quota Guard
  public calculateQuotaConsumption(
    monitoredTrains: number = config.historicalMonitoredTrains || 5,
    intervalMs: number = config.realDataCollectionIntervalMs || 60000,
    configuredQuota: number = config.railwayMonthlyQuotaLimit || 30000,
    quotaOverride: boolean = config.railwayQuotaOverride || false
  ): QuotaCalculation {
    const safeInterval = Math.max(10000, intervalMs);
    const reqsPerMin = (monitoredTrains * 60000) / safeInterval;
    const estimatedRequestsPerDay = Math.round(reqsPerMin * 60 * 24);
    const estimatedRequestsPerMonth = Math.round(estimatedRequestsPerDay * 30);
    const utilization = configuredQuota > 0 ? Number(((estimatedRequestsPerMonth / configuredQuota) * 100).toFixed(2)) : 100.0;

    const quotaSafe = estimatedRequestsPerMonth <= configuredQuota || (quotaOverride && configuredQuota > 0);

    return {
      monitoredTrains,
      intervalMs: safeInterval,
      requestsPerMinute: Number(reqsPerMin.toFixed(2)),
      estimatedRequestsPerDay,
      estimatedRequestsPerMonth,
      configuredQuota,
      quotaUtilization: utilization,
      quotaSafe,
      quotaOverrideActive: quotaOverride,
      cacheTtlMs: config.railwayCacheTtlMs || 5000,
    };
  }

  // 2. Telemetry Validation Rules
  public validateTelemetry(raw: TrainLiveStatus): { valid: boolean; reason?: string } {
    if (!raw.trainNumber || !raw.trainNumber.trim()) {
      return { valid: false, reason: 'Missing train number' };
    }

    const providerMode = (config.railwayDataProvider || 'simulator').toLowerCase().trim();
    if (providerMode === 'real' && raw.dataSource !== 'real') {
      return { valid: false, reason: `Simulator telemetry rejected in Real provider mode (dataSource: ${raw.dataSource})` };
    }

    if (raw.isStale) {
      return { valid: false, reason: 'Stale telemetry snapshot rejected' };
    }

    const dateStr = new Date().toISOString().split('T')[0];
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return { valid: false, reason: 'Invalid journey date' };
    }

    if (raw.latitude !== null && raw.latitude !== undefined) {
      if (raw.latitude < -90 || raw.latitude > 90) {
        return { valid: false, reason: `Impossible latitude: ${raw.latitude}` };
      }
    }

    if (raw.longitude !== null && raw.longitude !== undefined) {
      if (raw.longitude < -180 || raw.longitude > 180) {
        return { valid: false, reason: `Impossible longitude: ${raw.longitude}` };
      }
    }

    if (raw.speed !== null && raw.speed !== undefined) {
      if (raw.speed < 0 || raw.speed > 300) {
        return { valid: false, reason: `Impossible speed: ${raw.speed} km/h` };
      }
    }

    const delay = raw.delayMinutes ?? 0;
    if (delay < -60 || delay > 1440) {
      return { valid: false, reason: `Delay outside valid range: ${delay}` };
    }

    const currentStop = raw.currentStopIndex ?? 0;
    const totalStops = raw.totalStops ?? 1;
    if (currentStop < 0 || currentStop > totalStops) {
      return { valid: false, reason: `Invalid stop index ${currentStop} of ${totalStops}` };
    }

    // Duplicate Detection Check
    const last = this.lastSnapshots.get(raw.trainNumber);
    if (last) {
      const isSameStation = last.currentStation === raw.currentStation;
      const isSameProgress = last.progress === raw.progress;
      const isSameSpeed = last.speedKmh === raw.speed;
      const timeDiffMs = Date.now() - new Date(last.timestamp).getTime();

      if (isSameStation && isSameProgress && isSameSpeed && timeDiffMs < 30000) {
        this.duplicateCount++;
        return { valid: false, reason: 'Duplicate telemetry snapshot within 30s' };
      }
    }

    return { valid: true };
  }

  // 3. Record Snapshot with Quota Guard Protection
  public recordSnapshot(status: TrainLiveStatus): TelemetrySnapshot | null {
    const quota = this.calculateQuotaConsumption();
    if (!quota.quotaSafe) {
      logger.warn(
        `[Historical Collector] Collector disabled: Estimated monthly requests (${quota.estimatedRequestsPerMonth}) exceed configured quota (${quota.configuredQuota}). Set RAILWAY_QUOTA_OVERRIDE=true and supply explicit quota to enable.`
      );
      return null;
    }

    const validation = this.validateTelemetry(status);
    if (!validation.valid) {
      this.rejectedCount++;
      logger.warn(`[Historical Collector] Snapshot rejected for train ${status.trainNumber || 'N/A'}: ${validation.reason}`);
      return null;
    }

    const totalStops = status.totalStops || 8;
    const currentStopIndex = status.currentStopIndex || 0;
    const totalDistanceEst = 1400.0;
    const progressRatio = totalStops > 1 ? currentStopIndex / (totalStops - 1) : 0.5;
    const distanceTravelled = Number((totalDistanceEst * progressRatio).toFixed(1));
    const distanceRemaining = Number((totalDistanceEst - distanceTravelled).toFixed(1));

    const scheduledRemaining = Number(((distanceRemaining / 80.0) * 60.0).toFixed(1));
    const elapsedMinutes = Number(((distanceTravelled / 75.0) * 60.0).toFixed(1));

    const snapshot: TelemetrySnapshot = {
      trainNumber: status.trainNumber,
      journeyDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      currentStation: status.currentStation || null,
      previousStation: status.previousStation || null,
      nextStation: status.nextStation || null,
      currentStopIndex,
      totalStops,
      delayMinutes: status.delayMinutes ?? 0,
      speedKmh: status.speed !== undefined ? status.speed : null,
      latitude: status.latitude !== undefined ? status.latitude : null,
      longitude: status.longitude !== undefined ? status.longitude : null,
      progress: status.progress ?? 0,
      scheduledArrival: status.scheduledArrival || null,
      expectedArrival: status.expectedArrival || null,
      actualArrival: null,
      distanceRemaining,
      elapsedJourneyMinutes: elapsedMinutes,
      scheduledRemainingMinutes: scheduledRemaining,
      resolvedTargetMinutes: null,
    };

    this.lastSnapshots.set(status.trainNumber, snapshot);
    this.collectedCount++;
    this.appendSnapshotToFile(snapshot);
    return snapshot;
  }

  private appendSnapshotToFile(snapshot: TelemetrySnapshot) {
    try {
      this.ensureDirectoryExists();
      const filename = `telemetry_${snapshot.trainNumber}_${snapshot.journeyDate}.jsonl`;
      const filePath = path.join(SNAPSHOT_DIR, filename);
      fs.appendFileSync(filePath, JSON.stringify(snapshot) + '\n', 'utf-8');
    } catch (err) {
      logger.warn(`Failed to write snapshot log file: ${(err as Error).message}`);
    }
  }

  // 4. Resolve Target Arrival Time upon Journey Completion
  public resolveTargetArrival(
    trainNumber: string,
    journeyDate: string,
    actualDestinationArrivalIso: string
  ): number {
    const destArrivalMs = new Date(actualDestinationArrivalIso).getTime();
    let resolvedCount = 0;

    try {
      const filename = `telemetry_${trainNumber}_${journeyDate}.jsonl`;
      const filePath = path.join(SNAPSHOT_DIR, filename);

      if (!fs.existsSync(filePath)) return 0;

      const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
      const updatedLines = lines.map((line) => {
        const item: TelemetrySnapshot = JSON.parse(line);
        const itemTsMs = new Date(item.timestamp).getTime();
        const actualRemainingMinutes = Math.max(0, Math.round((destArrivalMs - itemTsMs) / 60000));
        item.actualArrival = actualDestinationArrivalIso;
        item.resolvedTargetMinutes = actualRemainingMinutes;
        resolvedCount++;
        return JSON.stringify(item);
      });

      fs.writeFileSync(filePath, updatedLines.join('\n') + '\n', 'utf-8');
      logger.info(`[Historical Collector] Resolved ${resolvedCount} snapshots for train ${trainNumber} on ${journeyDate}`);
    } catch (err) {
      logger.warn(`Target resolution error for train ${trainNumber}: ${(err as Error).message}`);
    }

    return resolvedCount;
  }

  // 5. Non-Fabricated Real Dataset Statistics Audit
  public getDatasetStatistics(): DatasetStatistics {
    this.ensureDirectoryExists();
    let totalSnapshots = 0;
    let validSnapshots = 0;
    const trainNumbers = new Set<string>();
    const journeyIds = new Set<string>();
    let completedJourneys = 0;
    let unresolvedJourneys = 0;
    let dateStart: string | null = null;
    let dateEnd: string | null = null;

    try {
      const files = fs.readdirSync(SNAPSHOT_DIR).filter((f) => f.endsWith('.jsonl'));
      for (const file of files) {
        const filePath = path.join(SNAPSHOT_DIR, file);
        const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
        let hasResolved = false;

        for (const line of lines) {
          totalSnapshots++;
          try {
            const item: TelemetrySnapshot = JSON.parse(line);
            validSnapshots++;
            trainNumbers.add(item.trainNumber);
            const jId = `${item.trainNumber}_${item.journeyDate}`;
            journeyIds.add(jId);

            if (item.resolvedTargetMinutes !== null && item.resolvedTargetMinutes !== undefined) {
              hasResolved = true;
            }

            if (item.timestamp) {
              if (!dateStart || item.timestamp < dateStart) dateStart = item.timestamp;
              if (!dateEnd || item.timestamp > dateEnd) dateEnd = item.timestamp;
            }
          } catch (err) {
            // Ignore corrupted lines
          }
        }

        if (hasResolved) completedJourneys++;
        else unresolvedJourneys++;
      }
    } catch (err) {
      logger.warn(`Failed reading snapshot directory statistics: ${(err as Error).message}`);
    }

    const uniqueJourneyCount = journeyIds.size;
    const snapshotsPerJourney = uniqueJourneyCount > 0 ? Number((validSnapshots / uniqueJourneyCount).toFixed(1)) : 0;

    return {
      totalSnapshots: totalSnapshots + this.rejectedCount,
      validSnapshots,
      rejectedSnapshots: this.rejectedCount,
      uniqueTrainNumbers: trainNumbers.size,
      uniqueJourneyIds: uniqueJourneyCount,
      completedJourneys,
      unresolvedJourneys,
      dateRangeStart: dateStart,
      dateRangeEnd: dateEnd,
      snapshotsPerJourney,
      duplicateCount: this.duplicateCount,
    };
  }

  public getStats() {
    return {
      collectedCount: this.collectedCount,
      rejectedCount: this.rejectedCount,
      activeMonitoredTrains: this.lastSnapshots.size,
    };
  }
}

export const historicalCollector = new HistoricalCollectorService();
