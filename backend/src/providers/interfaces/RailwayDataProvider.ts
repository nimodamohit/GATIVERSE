export interface StationCoordinate {
  stationCode: string;
  stationName: string;
  lat: number;
  lng: number;
}

export interface LiveRouteStop {
  sequence: number;
  stationCode: string;
  stationName: string;
  lat?: number | null;
  lng?: number | null;
  scheduledArrival?: string | null;
  scheduledDeparture?: string | null;
  actualArrival?: string | null;
  actualDeparture?: string | null;
  delayArrival?: number | null;
  delayDeparture?: number | null;
  status?: string | null;
  distance?: number | null;
  platform?: string | null;
  isHalt?: boolean;
}

export interface TrainLiveStatus {
  trainNumber: string;
  trainName: string | null;
  currentStation: string | null;
  nextStation: string | null;
  previousStation: string | null;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  delayMinutes: number | null;
  status: 'ON_TIME' | 'DELAYED' | 'ARRIVED' | 'DEPARTED' | 'CANCELLED' | 'UNKNOWN' | null;
  lastUpdated: string;
  expectedArrival: string | null;
  scheduledArrival: string | null;
  progress: number | null; // Progress percentage (0 to 100) across entire route
  currentStopIndex?: number;
  totalStops?: number;
  dataSource: 'simulator' | 'real' | 'railkit'; // Telemetry source flag
  dataAgeSeconds?: number; // Age of telemetry payload in seconds
  isStale?: boolean; // Flag indicating if real data has become stale (>180s)
  liveDataAvailable?: boolean; // Flag indicating if active real telemetry snapshot is available
  dataAvailabilityReason?: string; // Reason for data state ('live_telemetry_active', 'cached_snapshot_retained', 'provider_unavailable', 'no_real_snapshot_available', etc.)
  modelDataSource?: string; // Flag for ML model data source ("synthetic-demo")
  routeStops?: LiveRouteStop[];
  majorHalts?: LiveRouteStop[];
  routePoints?: LiveRouteStop[];
  segmentProgress?: number | null; // Progress percentage (0 to 100) between current & next station
}

export interface RailwayDataProviderStatus {
  provider: 'simulator' | 'real' | 'railkit';
  mode: 'demo' | 'live';
  available: boolean;
  apiEnabled: boolean;
  apiConfigured: boolean;
  fallbackActive: boolean;
  staleDataDetected?: boolean;
  lastSuccessfulRealDataTimestamp?: string | null;
  lastError?: string;
  lastStatusCheck: string;
}

export interface RailwayDataProvider {
  getTrainLiveStatus(trainNumber: string): Promise<TrainLiveStatus | null>;
  getAllLiveStatuses(): Promise<TrainLiveStatus[]>;
  getProviderStatus(): Promise<RailwayDataProviderStatus>;
  verifyConnection?(): Promise<unknown>;
  start(): void;
  stop(): void;
  onUpdate(callback: (status: TrainLiveStatus) => void): void;
}

