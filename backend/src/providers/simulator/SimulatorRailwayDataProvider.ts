import { RailwayDataProvider, TrainLiveStatus, RailwayDataProviderStatus } from '../interfaces/RailwayDataProvider.js';
import { FALLBACK_DEMO_TRAINS } from '../../services/train.service.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/env.js';

interface StationCoord {
  lat: number;
  lng: number;
}

const STATION_COORDINATES: Record<string, StationCoord> = {
  NDLS: { lat: 28.6139, lng: 77.2090 },
  AGC: { lat: 27.1767, lng: 78.0081 },
  GWL: { lat: 27.4924, lng: 77.6737 },
  VGLJ: { lat: 25.4484, lng: 78.5685 },
  BPL: { lat: 23.2599, lng: 77.4126 },
  ET: { lat: 22.6106, lng: 77.7634 },
  ST: { lat: 21.1702, lng: 72.8311 },
  MMCT: { lat: 18.9696, lng: 72.8193 },
  RKMP: { lat: 23.2038, lng: 77.4385 },
  MTJ: { lat: 27.4924, lng: 77.6737 },
  TVC: { lat: 8.4875, lng: 76.9525 },
  FZR: { lat: 30.9237, lng: 74.6114 },
  KNW: { lat: 21.8314, lng: 76.3498 },
  BSL: { lat: 21.0454, lng: 75.7892 },
  CSMT: { lat: 18.9398, lng: 72.8355 },
};

interface InternalTrainState {
  trainNumber: string;
  trainName: string;
  stations: Array<{ stationCode: string; stationName: string; scheduledArrival: string }>;
  currentStopIndex: number;
  progressPercent: number; // 0 to 100 between currentStopIndex and currentStopIndex+1
  dwellTicks: number;
  delayMinutes: number;
  baseSpeed: number;
  isRunning: boolean;
  lastUpdatedTime: Date;
}

export class SimulatorRailwayDataProvider implements RailwayDataProvider {
  private timer: NodeJS.Timeout | null = null;
  private updateCallbacks: Array<(status: TrainLiveStatus) => void> = [];
  private trainStates: Map<string, InternalTrainState> = new Map();

  constructor() {
    this.initializeTrainStates();
  }

  private initializeTrainStates(): void {
    const defaultDelays: Record<string, number> = {
      '12952': 35,
      '12002': 0,
      '12626': 15,
      '12138': 0,
    };

    const defaultStartIndex: Record<string, number> = {
      '12952': 4, // Bhopal Junction (Intermediate stop, next: Itarsi, dest: Mumbai Central)
      '12002': 1, // Agra Cantt (Intermediate stop)
      '12626': 1, // Mathura Junction (Intermediate stop)
      '12138': 1, // Khandwa Junction (Intermediate stop)
    };

    const defaultInitialProgress: Record<string, number> = {
      '12952': 25,
      '12002': 25,
      '12626': 30,
      '12138': 20,
    };

    for (const train of FALLBACK_DEMO_TRAINS) {
      const startIndex = defaultStartIndex[train.trainNumber] ?? 0;
      const initialProgress = defaultInitialProgress[train.trainNumber] ?? 25;
      const safeIndex = Math.min(startIndex, train.stations.length - 2);

      this.trainStates.set(train.trainNumber, {
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        stations: train.stations.map((s) => ({
          stationCode: s.stationCode,
          stationName: s.stationName,
          scheduledArrival: s.scheduledArrival,
        })),
        currentStopIndex: Math.max(0, safeIndex),
        progressPercent: initialProgress,
        dwellTicks: 0,
        delayMinutes: defaultDelays[train.trainNumber] ?? 0,
        baseSpeed: train.trainNumber === '12002' ? 115 : train.trainNumber === '12952' ? 95 : 90,
        isRunning: true,
        lastUpdatedTime: new Date(),
      });
    }
  }

  public async getTrainLiveStatus(trainNumber: string): Promise<TrainLiveStatus | null> {
    const state = this.trainStates.get(trainNumber.trim());
    if (!state) return null;
    return this.buildLiveStatus(state);
  }

  public async getAllLiveStatuses(): Promise<TrainLiveStatus[]> {
    const statuses: TrainLiveStatus[] = [];
    for (const state of this.trainStates.values()) {
      statuses.push(this.buildLiveStatus(state));
    }
    return statuses;
  }

  public onUpdate(callback: (status: TrainLiveStatus) => void): void {
    this.updateCallbacks.push(callback);
  }

  public start(): void {
    if (this.timer) return;
    const interval = config.simulatorIntervalMs || 10000;
    logger.info(`Starting Railway Data Simulator engine with interval ${interval}ms`);

    this.timer = setInterval(() => {
      this.tick();
    }, interval);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('Railway Data Simulator engine stopped');
    }
  }

  private tick(): void {
    for (const state of this.trainStates.values()) {
      if (!state.isRunning) continue;

      state.lastUpdatedTime = new Date();
      const totalStops = state.stations.length;
      if (totalStops < 2) continue;

      const maxLegIndex = totalStops - 2;

      if (state.dwellTicks > 0) {
        state.dwellTicks -= 1;
        if (state.dwellTicks === 0) {
          if (state.currentStopIndex >= totalStops - 1) {
            // Reached final destination and finished dwell hold -> reset to initial demo start state
            const defaultStartIndex: Record<string, number> = {
              '12952': 4, // Bhopal Junction (Intermediate stop, next: Itarsi, dest: Mumbai Central)
              '12002': 1, // Agra Cantt
              '12626': 1, // Mathura Junction
              '12138': 1, // Khandwa Junction
            };
            state.currentStopIndex = defaultStartIndex[state.trainNumber] ?? 0;
            state.progressPercent = 25;
          } else {
            // Depart intermediate station and advance progress on next leg
            state.progressPercent = 0;
          }
        }
      } else if (state.currentStopIndex <= maxLegIndex) {
        // Advance progress gradually enroute (2.5% per 10s tick = 40 ticks / ~6.6 mins per leg)
        state.progressPercent += 2.5;

        if (state.progressPercent >= 100) {
          // Reached the next station on this leg!
          state.currentStopIndex += 1;

          if (state.currentStopIndex === totalStops - 1) {
            // Reached final destination station!
            state.progressPercent = 100;
            state.dwellTicks = 6; // Hold 6 ticks (60s) as ARRIVED at destination
          } else {
            // Reached intermediate station stop
            state.progressPercent = 0;
            state.dwellTicks = 2; // Dwell 2 ticks (20s) at station platform before advancing to next leg
          }
        }
      }

      // Small realistic delay fluctuation (+/- 1 minute occasionally)
      if (Math.random() > 0.8 && state.delayMinutes > 0) {
        const delta = Math.random() > 0.5 ? 1 : -1;
        state.delayMinutes = Math.max(0, state.delayMinutes + delta);
      }

      const liveStatus = this.buildLiveStatus(state);

      // Notify all update callbacks
      for (const cb of this.updateCallbacks) {
        cb(liveStatus);
      }
    }
  }

  public async getProviderStatus(): Promise<RailwayDataProviderStatus> {
    return {
      provider: 'simulator',
      mode: 'demo',
      available: true,
      apiEnabled: false,
      apiConfigured: false,
      fallbackActive: false,
      lastStatusCheck: new Date().toISOString(),
    };
  }

  private buildLiveStatus(state: InternalTrainState): TrainLiveStatus {
    const totalStops = state.stations.length;
    const currIndex = Math.min(Math.max(0, state.currentStopIndex), totalStops - 1);
    const nextIndex = Math.min(currIndex + 1, totalStops - 1);
    const prevIndex = Math.max(0, currIndex - 1);

    const currStation = state.stations[currIndex] || { stationCode: 'NDLS', stationName: 'New Delhi', scheduledArrival: '05:00 PM' };
    const nextStation = state.stations[nextIndex] || currStation;
    const prevStation = state.stations[prevIndex] || currStation;

    const currCoord = STATION_COORDINATES[currStation.stationCode] || { lat: 23.2599, lng: 77.4126 };
    const nextCoord = STATION_COORDINATES[nextStation.stationCode] || currCoord;

    // Interpolate lat/lng along segment
    const p = Math.min(100, Math.max(0, state.progressPercent)) / 100;
    const currentLat = Number((currCoord.lat + (nextCoord.lat - currCoord.lat) * p).toFixed(4));
    const currentLng = Number((currCoord.lng + (nextCoord.lng - currCoord.lng) * p).toFixed(4));

    // Calculate realistic speed
    let speed = 0;
    if (state.dwellTicks > 0 && currIndex < totalStops - 1) {
      speed = 0; // Stopped at intermediate station
    } else if (currIndex === totalStops - 1 && state.progressPercent >= 100) {
      speed = 0; // Stopped at final destination
    } else {
      const speedFluctuation = Math.floor(Math.random() * 5) - 2;
      speed = Math.max(45, state.baseSpeed + speedFluctuation);
    }

    // Status logic: ARRIVED ONLY when train is at final destination station (totalStops - 1)
    let status: TrainLiveStatus['status'] = 'ON_TIME';
    const isFinalDestination = currIndex === totalStops - 1;

    if (isFinalDestination) {
      status = 'ARRIVED';
    } else if (state.delayMinutes > 5) {
      status = 'DELAYED';
    } else if (state.progressPercent > 0 || state.currentStopIndex > 0) {
      status = 'DEPARTED';
    }

    // Expected arrival format
    const expectedArrival = state.delayMinutes > 0
      ? `${currStation.scheduledArrival} (+${state.delayMinutes} min)`
      : currStation.scheduledArrival;

    const dataAgeSeconds = Math.max(0, Math.floor((Date.now() - state.lastUpdatedTime.getTime()) / 1000));

    return {
      trainNumber: state.trainNumber,
      trainName: state.trainName,
      currentStation: currStation.stationName,
      nextStation: nextStation.stationName,
      previousStation: prevStation.stationName,
      latitude: currentLat,
      longitude: currentLng,
      speed,
      delayMinutes: state.delayMinutes,
      status,
      lastUpdated: `${dataAgeSeconds}s ago`,
      expectedArrival,
      scheduledArrival: currStation.scheduledArrival,
      progress: Math.round(state.progressPercent),
      currentStopIndex: currIndex,
      totalStops,
      dataSource: 'simulator',
      dataAgeSeconds,
      modelDataSource: 'synthetic-demo',
    };
  }
}


