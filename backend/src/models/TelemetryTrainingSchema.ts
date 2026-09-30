/**
 * Normalized Historical Railway Telemetry Training Schema
 * Designed for training production XGBoost ML ETA models on authentic historical telemetry.
 */
export interface TelemetryTrainingRecord {
  trainNumber: string;
  journeyDate: string; // YYYY-MM-DD
  stationSequence: number;
  scheduledArrival?: string | null;
  scheduledDeparture?: string | null;
  actualArrival?: string | null;
  actualDeparture?: string | null;
  delayArrival?: number | null;
  delayDeparture?: number | null;
  distance?: number | null;
  currentDelay: number;
  segmentProgress?: number | null;
  timestamp: string; // ISO 8601 timestamp
  speed?: number | null;
  weather?: string | null;
  dayOfWeek: number; // 0-6 (Sun-Sat)
  hour: number; // 0-23
  targetDelayAtDestination?: number | null;
}

export const createTrainingRecordSnapshot = (
  trainNumber: string,
  journeyDate: string,
  stationSequence: number,
  currentDelay: number,
  timestamp: string,
  dayOfWeek: number,
  hour: number,
  optionalFields: Partial<TelemetryTrainingRecord> = {}
): TelemetryTrainingRecord => {
  return {
    trainNumber,
    journeyDate,
    stationSequence,
    currentDelay,
    timestamp,
    dayOfWeek,
    hour,
    scheduledArrival: optionalFields.scheduledArrival ?? null,
    scheduledDeparture: optionalFields.scheduledDeparture ?? null,
    actualArrival: optionalFields.actualArrival ?? null,
    actualDeparture: optionalFields.actualDeparture ?? null,
    delayArrival: optionalFields.delayArrival ?? null,
    delayDeparture: optionalFields.delayDeparture ?? null,
    distance: optionalFields.distance ?? null,
    segmentProgress: optionalFields.segmentProgress ?? null,
    speed: optionalFields.speed ?? null,
    weather: optionalFields.weather ?? null,
    targetDelayAtDestination: optionalFields.targetDelayAtDestination ?? null,
  };
};
