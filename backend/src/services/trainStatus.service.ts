import { TrainStatus } from '../models/TrainStatus.js';
import { isDbConnected } from '../config/db.js';
import { railwayDataProvider } from '../providers/index.js';
import { config } from '../config/env.js';

export const FALLBACK_DEMO_STATUSES: Record<string, Record<string, unknown>> = {
  '12952': {
    trainNumber: '12952',
    currentStation: 'Near Bhopal Junction',
    nextStation: 'Itarsi Junction',
    latitude: 23.2599,
    longitude: 77.4126,
    speed: 95,
    delayMinutes: 35,
    scheduledArrival: '07:15 PM',
    expectedArrival: '07:50 PM',
    status: 'DELAYED',
    lastUpdated: '2 mins ago',
  },
  '12002': {
    trainNumber: '12002',
    currentStation: 'Agra Cantt',
    nextStation: 'Gwalior Junction',
    latitude: 27.1767,
    longitude: 78.0081,
    speed: 120,
    delayMinutes: 0,
    scheduledArrival: '07:50 AM',
    expectedArrival: '07:50 AM',
    status: 'ON_TIME',
    lastUpdated: '1 min ago',
  },
  '12626': {
    trainNumber: '12626',
    currentStation: 'Mathura Junction',
    nextStation: 'Agra Cantt',
    latitude: 27.4924,
    longitude: 77.6737,
    speed: 85,
    delayMinutes: 15,
    scheduledArrival: '09:40 PM',
    expectedArrival: '09:55 PM',
    status: 'DELAYED',
    lastUpdated: 'Just now',
  },
  '12138': {
    trainNumber: '12138',
    currentStation: 'Khandwa Junction',
    nextStation: 'Bhusaval Junction',
    latitude: 21.8314,
    longitude: 76.3498,
    speed: 90,
    delayMinutes: 0,
    scheduledArrival: '03:15 PM',
    expectedArrival: '03:15 PM',
    status: 'ON_TIME',
    lastUpdated: '4 mins ago',
  },
};

export const getTrainStatusService = async (trainNumber: string): Promise<unknown | null> => {
  const cleanNum = trainNumber.trim();

  // 1. Check live railway data provider first
  const liveStatus = await railwayDataProvider.getTrainLiveStatus(cleanNum);
  if (liveStatus) {
    return liveStatus;
  }

  // 2. Query MongoDB if connected
  if (isDbConnected()) {
    const status = await TrainStatus.findOne({ trainNumber: cleanNum }).exec();
    if (status) return status;
  }

  // 3. Fallback demo status (Simulator mode only)
  const providerMode = (config.railwayDataProvider || 'simulator').toLowerCase().trim();
  if (providerMode === 'real' || providerMode === 'railkit') {
    return null;
  }

  return FALLBACK_DEMO_STATUSES[cleanNum] || {
    trainNumber: cleanNum,
    currentStation: 'Scheduled Origin',
    nextStation: 'Next Station Enroute',
    latitude: 28.6139,
    longitude: 77.209,
    speed: 80,
    delayMinutes: 0,
    scheduledArrival: '10:00 AM',
    expectedArrival: '10:00 AM',
    status: 'ON_TIME',
    lastUpdated: 'Just now',
  };
};
