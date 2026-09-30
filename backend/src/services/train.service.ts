import { Train } from '../models/Train.js';
import { isDbConnected } from '../config/db.js';

export interface TrainSearchQuery {
  source?: string;
  destination?: string;
  date?: string;
  trainNumber?: string;
}


// Fallback demo trains when database is not connected
export const FALLBACK_DEMO_TRAINS = [
  {
    trainNumber: '12952',
    trainName: 'Rajdhani Express',
    source: 'New Delhi',
    destination: 'Mumbai Central',
    sourceCode: 'NDLS',
    destinationCode: 'MMCT',
    departureTime: '5:00 PM',
    arrivalTime: '8:35 AM',
    duration: '15h 35m',
    runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    stations: [
      { stopNumber: 1, stationCode: 'NDLS', stationName: 'New Delhi', scheduledArrival: '05:00 PM', scheduledDeparture: '05:00 PM', actualArrival: '05:00 PM', actualDeparture: '05:05 PM', status: 'passed', platform: 'Platform 16' },
      { stopNumber: 2, stationCode: 'AGC', stationName: 'Agra Cantt', scheduledArrival: '06:55 PM', scheduledDeparture: '06:57 PM', actualArrival: '07:08 PM', actualDeparture: '07:10 PM', status: 'passed', platform: 'Platform 1' },
      { stopNumber: 3, stationCode: 'GWL', stationName: 'Gwalior Junction', scheduledArrival: '08:28 PM', scheduledDeparture: '08:30 PM', actualArrival: '08:48 PM', actualDeparture: '08:50 PM', status: 'passed', platform: 'Platform 2' },
      { stopNumber: 4, stationCode: 'VGLJ', stationName: 'VGL Jhansi Junction', scheduledArrival: '09:45 PM', scheduledDeparture: '09:50 PM', actualArrival: '10:15 PM', actualDeparture: '10:20 PM', status: 'passed', platform: 'Platform 1' },
      { stopNumber: 5, stationCode: 'BPL', stationName: 'Bhopal Junction', scheduledArrival: '07:15 PM', scheduledDeparture: '07:20 PM', actualArrival: '07:50 PM', actualDeparture: '07:55 PM', status: 'current', platform: 'Platform 3' },
      { stopNumber: 6, stationCode: 'ET', stationName: 'Itarsi Junction', scheduledArrival: '08:50 PM', scheduledDeparture: '08:55 PM', actualArrival: '09:25 PM', actualDeparture: '09:30 PM', status: 'upcoming', platform: 'Platform 1' },
      { stopNumber: 7, stationCode: 'ST', stationName: 'Surat', scheduledArrival: '04:55 AM', scheduledDeparture: '05:00 AM', actualArrival: '05:30 AM', actualDeparture: '05:35 AM', status: 'upcoming', platform: 'Platform 2' },
      { stopNumber: 8, stationCode: 'MMCT', stationName: 'Mumbai Central', scheduledArrival: '08:35 AM', scheduledDeparture: '08:35 AM', actualArrival: '09:10 AM', actualDeparture: '09:10 AM', status: 'upcoming', platform: 'Platform 1' },
    ],
    classes: [
      { classCode: '3A', className: 'AC 3 Tier', fare: 1450 },
      { classCode: '2A', className: 'AC 2 Tier', fare: 2100 },
      { classCode: '1A', className: 'AC First Class', fare: 3450 },
      { classCode: '3E', className: 'AC 3 Economy', fare: 1320 },
    ],
  },
  {
    trainNumber: '12002',
    trainName: 'Shatabdi Express',
    source: 'New Delhi',
    destination: 'Rani Kamlapati (Bhopal)',
    sourceCode: 'NDLS',
    destinationCode: 'RKMP',
    departureTime: '06:00 AM',
    arrivalTime: '02:05 PM',
    duration: '8h 05m',
    runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    stations: [
      { stopNumber: 1, stationCode: 'NDLS', stationName: 'New Delhi', scheduledArrival: '06:00 AM', scheduledDeparture: '06:00 AM', actualArrival: '06:00 AM', actualDeparture: '06:00 AM', status: 'passed', platform: 'Platform 1' },
      { stopNumber: 2, stationCode: 'AGC', stationName: 'Agra Cantt', scheduledArrival: '07:50 AM', scheduledDeparture: '07:55 AM', actualArrival: '07:50 AM', actualDeparture: '07:55 AM', status: 'current', platform: 'Platform 1' },
      { stopNumber: 3, stationCode: 'GWL', stationName: 'Gwalior Junction', scheduledArrival: '09:23 AM', scheduledDeparture: '09:28 AM', actualArrival: '09:23 AM', actualDeparture: '09:28 AM', status: 'upcoming', platform: 'Platform 1' },
      { stopNumber: 4, stationCode: 'RKMP', stationName: 'Rani Kamlapati (Bhopal)', scheduledArrival: '02:05 PM', scheduledDeparture: '02:05 PM', actualArrival: '02:05 PM', actualDeparture: '02:05 PM', status: 'upcoming', platform: 'Platform 5' },
    ],
    classes: [
      { classCode: 'CC', className: 'AC Chair Car', fare: 1165 },
      { classCode: 'EC', className: 'Executive Chair', fare: 2280 },
    ],
  },
  {
    trainNumber: '12626',
    trainName: 'Kerala Express',
    source: 'New Delhi',
    destination: 'Trivandrum Central',
    sourceCode: 'NDLS',
    destinationCode: 'TVC',
    departureTime: '08:10 PM',
    arrivalTime: '06:00 PM',
    duration: '45h 50m',
    runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    stations: [
      { stopNumber: 1, stationCode: 'NDLS', stationName: 'New Delhi', scheduledArrival: '08:10 PM', scheduledDeparture: '08:10 PM', actualArrival: '08:10 PM', actualDeparture: '08:15 PM', status: 'passed', platform: 'Platform 3' },
      { stopNumber: 2, stationCode: 'MTJ', stationName: 'Mathura Junction', scheduledArrival: '09:40 PM', scheduledDeparture: '09:45 PM', actualArrival: '09:55 PM', actualDeparture: '10:00 PM', status: 'current', platform: 'Platform 2' },
      { stopNumber: 3, stationCode: 'AGC', stationName: 'Agra Cantt', scheduledArrival: '10:30 PM', scheduledDeparture: '10:35 PM', actualArrival: '10:45 PM', actualDeparture: '10:50 PM', status: 'upcoming', platform: 'Platform 1' },
      { stopNumber: 4, stationCode: 'BPL', stationName: 'Bhopal Junction', scheduledArrival: '05:30 AM', scheduledDeparture: '05:35 AM', actualArrival: '05:45 AM', actualDeparture: '05:50 AM', status: 'upcoming', platform: 'Platform 2' },
      { stopNumber: 5, stationCode: 'ET', stationName: 'Itarsi Junction', scheduledArrival: '07:10 AM', scheduledDeparture: '07:15 AM', actualArrival: '07:25 AM', actualDeparture: '07:30 AM', status: 'upcoming', platform: 'Platform 1' },
      { stopNumber: 6, stationCode: 'TVC', stationName: 'Trivandrum Central', scheduledArrival: '06:00 PM', scheduledDeparture: '06:00 PM', actualArrival: '06:15 PM', actualDeparture: '06:15 PM', status: 'upcoming', platform: 'Platform 1' },
    ],
    classes: [
      { classCode: 'SL', className: 'Sleeper Class', fare: 540 },
      { classCode: '3A', className: 'AC 3 Tier', fare: 1380 },
      { classCode: '2A', className: 'AC 2 Tier', fare: 1980 },
    ],
  },
  {
    trainNumber: '12138',
    trainName: 'Punjab Mail',
    source: 'Firozpur Cantt',
    destination: 'Mumbai CSMT',
    sourceCode: 'FZR',
    destinationCode: 'CSMT',
    departureTime: '09:45 PM',
    arrivalTime: '07:35 AM',
    duration: '33h 50m',
    runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    stations: [
      { stopNumber: 1, stationCode: 'FZR', stationName: 'Firozpur Cantt', scheduledArrival: '09:45 PM', scheduledDeparture: '09:45 PM', actualArrival: '09:45 PM', actualDeparture: '09:45 PM', status: 'passed' },
      { stopNumber: 2, stationCode: 'KNW', stationName: 'Khandwa Junction', scheduledArrival: '03:15 PM', scheduledDeparture: '03:20 PM', actualArrival: '03:15 PM', actualDeparture: '03:20 PM', status: 'current' },
      { stopNumber: 3, stationCode: 'BSL', stationName: 'Bhusaval Junction', scheduledArrival: '05:25 PM', scheduledDeparture: '05:30 PM', actualArrival: '05:25 PM', actualDeparture: '05:30 PM', status: 'upcoming' },
      { stopNumber: 4, stationCode: 'CSMT', stationName: 'Mumbai CSMT', scheduledArrival: '07:35 AM', scheduledDeparture: '07:35 AM', actualArrival: '07:35 AM', actualDeparture: '07:35 AM', status: 'upcoming' },
    ],
    classes: [
      { classCode: 'SL', className: 'Sleeper Class', fare: 495 },
      { classCode: '3A', className: 'AC 3 Tier', fare: 1290 },
      { classCode: '2A', className: 'AC 2 Tier', fare: 1850 },
    ],
  },
  {
    trainNumber: '12001',
    trainName: 'Bhopal Shatabdi',
    source: 'Rani Kamlapati (Bhopal)',
    destination: 'New Delhi',
    sourceCode: 'RKMP',
    destinationCode: 'NDLS',
    departureTime: '03:00 PM',
    arrivalTime: '11:50 PM',
    duration: '8h 50m',
    runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    stations: [
      { stopNumber: 1, stationCode: 'RKMP', stationName: 'Rani Kamlapati (Bhopal)', scheduledArrival: '03:00 PM', scheduledDeparture: '03:00 PM', actualArrival: '03:00 PM', actualDeparture: '03:00 PM', status: 'passed', platform: 'Platform 1' },
      { stopNumber: 2, stationCode: 'GWL', stationName: 'Gwalior Junction', scheduledArrival: '06:40 PM', scheduledDeparture: '06:45 PM', actualArrival: '06:40 PM', actualDeparture: '06:45 PM', status: 'upcoming', platform: 'Platform 2' },
      { stopNumber: 3, stationCode: 'AGC', stationName: 'Agra Cantt', scheduledArrival: '08:15 PM', scheduledDeparture: '08:20 PM', actualArrival: '08:15 PM', actualDeparture: '08:20 PM', status: 'upcoming', platform: 'Platform 1' },
      { stopNumber: 4, stationCode: 'NDLS', stationName: 'New Delhi', scheduledArrival: '11:50 PM', scheduledDeparture: '11:50 PM', actualArrival: '11:50 PM', actualDeparture: '11:50 PM', status: 'upcoming', platform: 'Platform 1' },
    ],
    classes: [
      { classCode: 'CC', className: 'AC Chair Car', fare: 1165 },
      { classCode: 'EC', className: 'Executive Chair', fare: 2280 },
    ],
  },
  {
    trainNumber: '12951',
    trainName: 'Mumbai Rajdhani Express',
    source: 'Mumbai Central',
    destination: 'New Delhi',
    sourceCode: 'MMCT',
    destinationCode: 'NDLS',
    departureTime: '05:00 PM',
    arrivalTime: '08:35 AM',
    duration: '15h 35m',
    runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    stations: [
      { stopNumber: 1, stationCode: 'MMCT', stationName: 'Mumbai Central', scheduledArrival: '05:00 PM', scheduledDeparture: '05:00 PM', actualArrival: '05:00 PM', actualDeparture: '05:00 PM', status: 'passed', platform: 'Platform 1' },
      { stopNumber: 2, stationCode: 'ST', stationName: 'Surat', scheduledArrival: '07:50 PM', scheduledDeparture: '07:55 PM', actualArrival: '07:50 PM', actualDeparture: '07:55 PM', status: 'passed', platform: 'Platform 1' },
      { stopNumber: 3, stationCode: 'ET', stationName: 'Itarsi Junction', scheduledArrival: '02:15 AM', scheduledDeparture: '02:20 AM', actualArrival: '02:15 AM', actualDeparture: '02:20 AM', status: 'upcoming', platform: 'Platform 1' },
      { stopNumber: 4, stationCode: 'BPL', stationName: 'Bhopal Junction', scheduledArrival: '03:40 AM', scheduledDeparture: '03:45 AM', actualArrival: '03:40 AM', actualDeparture: '03:45 AM', status: 'upcoming', platform: 'Platform 2' },
      { stopNumber: 5, stationCode: 'VGLJ', stationName: 'VGL Jhansi Junction', scheduledArrival: '05:35 AM', scheduledDeparture: '05:40 AM', actualArrival: '05:35 AM', actualDeparture: '05:40 AM', status: 'upcoming', platform: 'Platform 1' },
      { stopNumber: 6, stationCode: 'GWL', stationName: 'Gwalior Junction', scheduledArrival: '06:45 AM', scheduledDeparture: '06:50 AM', actualArrival: '06:45 AM', actualDeparture: '06:50 AM', status: 'upcoming', platform: 'Platform 2' },
      { stopNumber: 7, stationCode: 'AGC', stationName: 'Agra Cantt', scheduledArrival: '07:55 AM', scheduledDeparture: '08:00 AM', actualArrival: '07:55 AM', actualDeparture: '08:00 AM', status: 'upcoming', platform: 'Platform 1' },
      { stopNumber: 8, stationCode: 'NDLS', stationName: 'New Delhi', scheduledArrival: '08:35 AM', scheduledDeparture: '08:35 AM', actualArrival: '08:35 AM', actualDeparture: '08:35 AM', status: 'upcoming', platform: 'Platform 16' },
    ],
    classes: [
      { classCode: '3A', className: 'AC 3 Tier', fare: 1450 },
      { classCode: '2A', className: 'AC 2 Tier', fare: 2100 },
      { classCode: '1A', className: 'AC First Class', fare: 3450 },
      { classCode: '3E', className: 'AC 3 Economy', fare: 1320 },
    ],
  },
  {
    trainNumber: '12625',
    trainName: 'Kerala Express',
    source: 'Trivandrum Central',
    destination: 'New Delhi',
    sourceCode: 'TVC',
    destinationCode: 'NDLS',
    departureTime: '11:15 AM',
    arrivalTime: '01:45 PM',
    duration: '50h 30m',
    runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    stations: [
      { stopNumber: 1, stationCode: 'TVC', stationName: 'Trivandrum Central', scheduledArrival: '11:15 AM', scheduledDeparture: '11:15 AM', actualArrival: '11:15 AM', actualDeparture: '11:15 AM', status: 'passed', platform: 'Platform 1' },
      { stopNumber: 2, stationCode: 'ET', stationName: 'Itarsi Junction', scheduledArrival: '06:30 AM', scheduledDeparture: '06:35 AM', actualArrival: '06:30 AM', actualDeparture: '06:35 AM', status: 'upcoming', platform: 'Platform 1' },
      { stopNumber: 3, stationCode: 'BPL', stationName: 'Bhopal Junction', scheduledArrival: '08:00 AM', scheduledDeparture: '08:05 AM', actualArrival: '08:00 AM', actualDeparture: '08:05 AM', status: 'upcoming', platform: 'Platform 2' },
      { stopNumber: 4, stationCode: 'AGC', stationName: 'Agra Cantt', scheduledArrival: '12:15 PM', scheduledDeparture: '12:20 PM', actualArrival: '12:15 PM', actualDeparture: '12:20 PM', status: 'upcoming', platform: 'Platform 1' },
      { stopNumber: 5, stationCode: 'MTJ', stationName: 'Mathura Junction', scheduledArrival: '01:05 PM', scheduledDeparture: '01:10 PM', actualArrival: '01:05 PM', actualDeparture: '01:10 PM', status: 'upcoming', platform: 'Platform 2' },
      { stopNumber: 6, stationCode: 'NDLS', stationName: 'New Delhi', scheduledArrival: '01:45 PM', scheduledDeparture: '01:45 PM', actualArrival: '01:45 PM', actualDeparture: '01:45 PM', status: 'upcoming', platform: 'Platform 3' },
    ],
    classes: [
      { classCode: 'SL', className: 'Sleeper Class', fare: 540 },
      { classCode: '3A', className: 'AC 3 Tier', fare: 1380 },
      { classCode: '2A', className: 'AC 2 Tier', fare: 1980 },
    ],
  },
  {
    trainNumber: '12137',
    trainName: 'Punjab Mail',
    source: 'Mumbai CSMT',
    destination: 'Firozpur Cantt',
    sourceCode: 'CSMT',
    destinationCode: 'FZR',
    departureTime: '07:35 PM',
    arrivalTime: '05:10 AM',
    duration: '33h 35m',
    runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    stations: [
      { stopNumber: 1, stationCode: 'CSMT', stationName: 'Mumbai CSMT', scheduledArrival: '07:35 PM', scheduledDeparture: '07:35 PM', actualArrival: '07:35 PM', actualDeparture: '07:35 PM', status: 'passed' },
      { stopNumber: 2, stationCode: 'BSL', stationName: 'Bhusaval Junction', scheduledArrival: '02:15 AM', scheduledDeparture: '02:20 AM', actualArrival: '02:15 AM', actualDeparture: '02:20 AM', status: 'upcoming' },
      { stopNumber: 3, stationCode: 'KNW', stationName: 'Khandwa Junction', scheduledArrival: '04:10 AM', scheduledDeparture: '04:15 AM', actualArrival: '04:10 AM', actualDeparture: '04:15 AM', status: 'upcoming' },
      { stopNumber: 4, stationCode: 'FZR', stationName: 'Firozpur Cantt', scheduledArrival: '05:10 AM', scheduledDeparture: '05:10 AM', actualArrival: '05:10 AM', actualDeparture: '05:10 AM', status: 'upcoming' },
    ],
    classes: [
      { classCode: 'SL', className: 'Sleeper Class', fare: 495 },
      { classCode: '3A', className: 'AC 3 Tier', fare: 1290 },
      { classCode: '2A', className: 'AC 2 Tier', fare: 1850 },
    ],
  },
];

export const searchTrainsService = async (query: TrainSearchQuery): Promise<unknown[]> => {
  if (isDbConnected()) {
    const mongoFilter: Record<string, unknown> = {};

    if (query.trainNumber && query.trainNumber.trim()) {
      mongoFilter.$or = [
        { trainNumber: { $regex: query.trainNumber.trim(), $options: 'i' } },
        { trainName: { $regex: query.trainNumber.trim(), $options: 'i' } },
      ];
    }

    if (query.source && query.source.trim()) {
      const srcRegex = new RegExp(query.source.trim(), 'i');
      const andList = (mongoFilter.$and as Record<string, unknown>[]) || [];
      andList.push({
        $or: [
          { source: srcRegex },
          { sourceCode: srcRegex },
          { 'stations.stationName': srcRegex },
          { 'stations.stationCode': srcRegex },
        ],
      });
      mongoFilter.$and = andList;
    }

    if (query.destination && query.destination.trim()) {
      const destRegex = new RegExp(query.destination.trim(), 'i');
      const andList = (mongoFilter.$and as Record<string, unknown>[]) || [];
      andList.push({
        $or: [
          { destination: destRegex },
          { destinationCode: destRegex },
          { 'stations.stationName': destRegex },
          { 'stations.stationCode': destRegex },
        ],
      });
      mongoFilter.$and = andList;
    }

    const trains = await Train.find(mongoFilter).exec();
    if (trains && trains.length > 0) {
      return trains;
    }
  }

  // In-memory filter fallback
  return FALLBACK_DEMO_TRAINS.filter((t) => {
    let matches = true;
    if (query.trainNumber && query.trainNumber.trim()) {
      const num = query.trainNumber.trim().toLowerCase();
      matches = matches && (t.trainNumber.toLowerCase().includes(num) || t.trainName.toLowerCase().includes(num));
    }
    if (query.source && query.source.trim()) {
      const src = query.source.trim().toLowerCase();
      matches = matches && (
        t.source.toLowerCase().includes(src) ||
        t.sourceCode.toLowerCase().includes(src) ||
        t.stations.some((s) => s.stationName.toLowerCase().includes(src) || s.stationCode.toLowerCase().includes(src))
      );
    }
    if (query.destination && query.destination.trim()) {
      const dest = query.destination.trim().toLowerCase();
      matches = matches && (
        t.destination.toLowerCase().includes(dest) ||
        t.destinationCode.toLowerCase().includes(dest) ||
        t.stations.some((s) => s.stationName.toLowerCase().includes(dest) || s.stationCode.toLowerCase().includes(dest))
      );
    }
    return matches;
  });
};

export const getTrainByNumberService = async (trainNumber: string): Promise<unknown | null> => {
  if (isDbConnected()) {
    const train = await Train.findOne({ trainNumber: trainNumber.trim() }).exec();
    if (train) return train;
  }
  return FALLBACK_DEMO_TRAINS.find((t) => t.trainNumber === trainNumber.trim()) || null;
};

export interface NormalizedSearchTrain {
  trainNumber: string;
  trainName: string;
  trainType: string | null;
  from: {
    code: string;
    name: string;
    departure: string | null;
  };
  to: {
    code: string;
    name: string;
    arrival: string | null;
  };
  duration: string | null;
  distance: number | null;
  runDays: string[] | null;
  totalHalts: number | null;
  live?: {
    status: string | null;
    expectedDeparture: string | null;
    delayMinutes: number | null;
    platform: string | null;
  } | null;
  dataSource: 'real' | 'simulator' | 'railkit';
}

export const KNOWN_STATIONS: Array<{ code: string; name: string; aliases: string[] }> = [
  { code: 'BPL', name: 'Bhopal Junction', aliases: ['bhopal', 'bhopal jn', 'bpl'] },
  { code: 'NDLS', name: 'New Delhi', aliases: ['delhi', 'new delhi', 'ndls'] },
  { code: 'MMCT', name: 'Mumbai Central', aliases: ['mumbai', 'mumbai central', 'mmct', 'bombay'] },
  { code: 'CSMT', name: 'Mumbai CSMT', aliases: ['csmt', 'mumbai csmt', 'vt', 'victoria terminus'] },
  { code: 'INDB', name: 'Indore Junction', aliases: ['indore', 'indore jn', 'indb'] },
  { code: 'ST', name: 'Surat', aliases: ['surat', 'st'] },
  { code: 'BRC', name: 'Vadodara Junction', aliases: ['vadodara', 'baroda', 'brc'] },
  { code: 'KOTA', name: 'Kota Junction', aliases: ['kota', 'kota jn', 'kota'] },
  { code: 'AGC', name: 'Agra Cantt', aliases: ['agra', 'agra cantt', 'agc'] },
  { code: 'GWL', name: 'Gwalior Junction', aliases: ['gwalior', 'gwl'] },
  { code: 'VGLJ', name: 'VGL Jhansi Junction', aliases: ['jhansi', 'vglj', 'vgl jhansi'] },
  { code: 'ET', name: 'Itarsi Junction', aliases: ['itarsi', 'et'] },
  { code: 'RKMP', name: 'Rani Kamlapati (Bhopal)', aliases: ['rani kamlapati', 'habibganj', 'rkmp'] },
  { code: 'HWH', name: 'Howrah Junction', aliases: ['howrah', 'kolkata', 'hwh'] },
  { code: 'MAS', name: 'Mgr Chennai Central', aliases: ['chennai', 'madras', 'mas'] },
  { code: 'SBC', name: 'Ksr Bengaluru', aliases: ['bangalore', 'bengaluru', 'sbc'] },
  { code: 'ADI', name: 'Ahmedabad Junction', aliases: ['ahmedabad', 'adi'] },
  { code: 'PUNE', name: 'Pune Junction', aliases: ['pune', 'pune jn'] },
  { code: 'TVC', name: 'Trivandrum Central', aliases: ['trivandrum', 'thiruvananthapuram', 'tvc'] },
  { code: 'CNB', name: 'Kanpur Central', aliases: ['kanpur', 'cnb'] },
  { code: 'PNBE', name: 'Patna Junction', aliases: ['patna', 'pnbe'] },
  { code: 'BSB', name: 'Varanasi Junction', aliases: ['varanasi', 'banaras', 'bsb'] },
];

export const resolveStationCode = (text: string): { code: string; name: string } | null => {
  const clean = text.trim().toLowerCase();
  if (!clean) return null;

  const exactCode = KNOWN_STATIONS.find((s) => s.code.toLowerCase() === clean);
  if (exactCode) return { code: exactCode.code, name: exactCode.name };

  const aliasMatch = KNOWN_STATIONS.find((s) => s.aliases.some((a) => a === clean || a.includes(clean) || clean.includes(a)));
  if (aliasMatch) return { code: aliasMatch.code, name: aliasMatch.name };

  if (/^[A-Z]{2,5}$/i.test(clean)) {
    return { code: clean.toUpperCase(), name: clean.toUpperCase() };
  }

  return null;
};

import * as railkit from 'railkit';
import { RailwayApiClient } from '../providers/real/RailwayApiClient.js';
import { KNOWN_TRAIN_NAMES } from '../providers/real/RealRailwayDataProvider.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const formatToRailKitDate = (dateStr?: string): string | undefined => {
  if (!dateStr || !dateStr.trim()) return undefined;
  const clean = dateStr.trim();
  // Convert YYYY-MM-DD to DD-MM-YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split('-');
    return `${d}-${m}-${y}`;
  }
  return clean;
};

export const searchRealStationsService = async (query: string): Promise<Array<{ code: string; name: string }>> => {
  const qClean = query.trim();
  if (!qClean) return [];

  const apiKey = (process.env.RAILKIT_API_KEY || config.railkitApiKey || '').trim();
  if (apiKey && qClean.length >= 2) {
    try {
      railkit.configure(apiKey);
      const res = await railkit.stationsByName(qClean);
      if (res && res.success) {
        const rawList: Array<Record<string, unknown>> = Array.isArray(res.data)
          ? (res.data as Array<Record<string, unknown>>)
          : Array.isArray(res.data?.stations)
          ? (res.data.stations as Array<Record<string, unknown>>)
          : Array.isArray(res)
          ? (res as Array<Record<string, unknown>>)
          : [];
        const list: Array<{ code: string; name: string }> = rawList
          .map((st: Record<string, unknown>) => ({
            code: String(st.code || st.stationCode || st.stnCode || '').toUpperCase().trim(),
            name: String(st.name || st.stationName || st.stnName || st.city || st.code || '').trim(),
          }))
          .filter((s) => Boolean(s.code));
        if (list.length > 0) return list;
      }
    } catch (err) {
      logger.warn(`[RailKit Search] Station search error: ${(err as Error).message}`);
    }
  }

  const qLower = qClean.toLowerCase();
  return KNOWN_STATIONS.filter((st) =>
    st.code.toLowerCase().includes(qLower) ||
    st.name.toLowerCase().includes(qLower) ||
    st.aliases.some((a) => a.includes(qLower))
  ).map((st) => ({ code: st.code, name: st.name }));
};

export const normalizeRailKitSearchTrain = (item: Record<string, unknown>, fromCode: string, toCode: string): NormalizedSearchTrain => {
  const rawTrain = (item.train as Record<string, unknown>) || {};
  const rawFrom = (item.from as Record<string, unknown>) || {};
  const rawTo = (item.to as Record<string, unknown>) || {};
  const rawLive = (item.live as Record<string, unknown>) || null;

  let liveObj: NormalizedSearchTrain['live'] = null;
  if (rawLive && typeof rawLive === 'object') {
    liveObj = {
      status: (rawLive.type || rawLive.status) ? String(rawLive.type || rawLive.status) : null,
      expectedDeparture: (rawLive.expectedDepartureTime || rawLive.expectedArrivalTime || rawLive.departure) ? String(rawLive.expectedDepartureTime || rawLive.expectedArrivalTime || rawLive.departure) : null,
      delayMinutes: typeof rawLive.delayMinutes === 'number' ? rawLive.delayMinutes : null,
      platform: rawLive.platform !== undefined && rawLive.platform !== null ? String(rawLive.platform) : null,
    };
  }

  let durFormatted: string | null = null;
  const rawDur = item.duration ?? item.travelTime ?? rawTrain.duration;
  if (typeof rawDur === 'number' && Number.isFinite(rawDur)) {
    const h = Math.floor(rawDur / 60);
    const m = rawDur % 60;
    durFormatted = `${h}h ${m}m`;
  } else if (typeof rawDur === 'string' && rawDur.trim()) {
    durFormatted = rawDur.trim();
  }

  const trainNumber = String(rawTrain.number || rawTrain.trainNumber || item.trainNumber || item.trainNo || item.number || '').trim();
  const trainName = String(rawTrain.name || rawTrain.trainName || item.trainName || item.name || '').trim() || (KNOWN_TRAIN_NAMES[trainNumber] || 'Express');
  const trainType = (rawTrain.type || rawTrain.category || item.trainType || item.type || item.category) ? String(rawTrain.type || rawTrain.category || item.trainType || item.type || item.category) : null;

  const fromStnCode = String(rawFrom.code || rawFrom.stationCode || item.fromStnCode || item.sourceCode || fromCode).toUpperCase();
  const fromStnName = String(rawFrom.name || rawFrom.stationName || item.fromStnName || item.source || fromCode);
  const departureTime = (rawFrom.departure || rawFrom.departureTime || item.departureTime || item.departure || item.fromDepartureTime) ? String(rawFrom.departure || rawFrom.departureTime || item.departureTime || item.departure || item.fromDepartureTime) : null;

  const toStnCode = String(rawTo.code || rawTo.stationCode || item.toStnCode || item.destinationCode || toCode).toUpperCase();
  const toStnName = String(rawTo.name || rawTo.stationName || item.toStnName || item.destination || toCode);
  const arrivalTime = (rawTo.arrival || rawTo.arrivalTime || item.arrivalTime || item.arrival || item.toArrivalTime) ? String(rawTo.arrival || rawTo.arrivalTime || item.arrivalTime || item.arrival || item.toArrivalTime) : null;

  const distanceVal = item.distance ?? rawTrain.distance ?? item.distanceKm;
  const distance = typeof distanceVal === 'number' && Number.isFinite(distanceVal) ? distanceVal : null;

  let runDays: string[] | null = null;
  const rawRunDays = rawTrain.runDays || item.runDays || item.runningDays || item.days;
  if (Array.isArray(rawRunDays)) {
    runDays = rawRunDays.map((d: unknown) => String(d));
  } else if (typeof rawRunDays === 'string') {
    runDays = rawRunDays.split(',').map((d: string) => d.trim()).filter(Boolean);
  }

  const haltsVal = item.totalHaltsBetween ?? item.totalHalts ?? item.halts ?? rawTrain.totalHalts;
  const totalHalts = typeof haltsVal === 'number' && Number.isFinite(haltsVal) ? haltsVal : null;

  return {
    trainNumber,
    trainName,
    trainType,
    from: {
      code: fromStnCode,
      name: fromStnName,
      departure: departureTime,
    },
    to: {
      code: toStnCode,
      name: toStnName,
      arrival: arrivalTime,
    },
    duration: durFormatted,
    distance,
    runDays,
    totalHalts,
    live: liveObj,
    dataSource: 'railkit' as const,
  };
};

export const searchRealTrainsBetweenService = async (
  fromStr: string,
  toStr: string,
  dateStr?: string,
  _live: boolean = true
): Promise<{ success: boolean; data?: NormalizedSearchTrain[]; error?: { code: string; message: string; statusCode: number } }> => {
  const resolvedFrom = resolveStationCode(fromStr);
  const resolvedTo = resolveStationCode(toStr);

  const fromCode = resolvedFrom ? resolvedFrom.code : fromStr.trim().toUpperCase();
  const toCode = resolvedTo ? resolvedTo.code : toStr.trim().toUpperCase();

  if (!fromCode || !toCode || fromCode.length < 2 || toCode.length < 2) {
    return {
      success: false,
      error: { code: 'INVALID_STATION', message: 'From and To station parameters are required', statusCode: 400 },
    };
  }

  const providerMode = (config.railwayDataProvider || 'simulator').toLowerCase().trim();

  // If simulator mode is active
  if (providerMode === 'simulator') {
    const simResults: NormalizedSearchTrain[] = FALLBACK_DEMO_TRAINS.filter((t) => {
      const srcMatch = t.sourceCode === fromCode || t.source.toLowerCase().includes(fromStr.toLowerCase());
      const dstMatch = t.destinationCode === toCode || t.destination.toLowerCase().includes(toStr.toLowerCase());
      return srcMatch && dstMatch;
    }).map((t) => ({
      trainNumber: t.trainNumber,
      trainName: t.trainName,
      trainType: 'Express',
      from: { code: t.sourceCode, name: t.source, departure: t.departureTime },
      to: { code: t.destinationCode, name: t.destination, arrival: t.arrivalTime },
      duration: t.duration,
      distance: 700,
      runDays: t.runningDays,
      totalHalts: t.stations.length,
      live: { status: 'On Time', expectedDeparture: t.departureTime, delayMinutes: 0, platform: 'Platform 1' },
      dataSource: 'simulator' as const,
    }));

    return { success: true, data: simResults };
  }

  // Real / RailKit train search
  const apiKey = (process.env.RAILKIT_API_KEY || config.railkitApiKey || '').trim();
  if (!apiKey) {
    return {
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'RAILKIT_API_KEY is not configured',
        statusCode: 401,
      },
    };
  }

  try {
    railkit.configure(apiKey);
    const formattedDate = formatToRailKitDate(dateStr);
    logger.info(`[RailKit Search] Executing train search: ${fromCode} -> ${toCode} (Date: ${formattedDate || 'none'})`);

    const res = await railkit.searchTrainBetweenStations(fromCode, toCode, formattedDate);

    if (!res || !res.success) {
      const errMsg = res?.error || res?.message || 'RailKit train search failed';
      let errCode = 'PROVIDER_UNAVAILABLE';
      let statusCode = 503;

      const lower = errMsg.toLowerCase();
      if (lower.includes('limit') || lower.includes('quota') || lower.includes('rate') || lower.includes('usage limit')) {
        errCode = 'RATE_LIMIT_REACHED';
        statusCode = 429;
      } else if (lower.includes('key') || lower.includes('auth') || lower.includes('billing') || lower.includes('unauthorized')) {
        errCode = 'AUTH_ERROR';
        statusCode = 401;
      } else if (lower.includes('invalid') || lower.includes('station')) {
        errCode = 'INVALID_STATION';
        statusCode = 400;
      }

      logger.warn(`[RailKit Search] Search error (${errCode} - ${statusCode}): ${errMsg}`);
      return {
        success: false,
        error: {
          code: errCode,
          message: errMsg,
          statusCode,
        },
      };
    }

    // Extract train list
    let rawTrains: Array<Record<string, unknown>> = [];
    if (Array.isArray(res.data)) {
      rawTrains = res.data as Array<Record<string, unknown>>;
    } else if (res.data && typeof res.data === 'object') {
      if (Array.isArray(res.data.trains)) rawTrains = res.data.trains as Array<Record<string, unknown>>;
      else if (Array.isArray(res.data.data)) rawTrains = res.data.data as Array<Record<string, unknown>>;
      else if (Array.isArray(res.data.trainList)) rawTrains = res.data.trainList as Array<Record<string, unknown>>;
    } else if (Array.isArray(res)) {
      rawTrains = res as Array<Record<string, unknown>>;
    }

    const normalizedList: NormalizedSearchTrain[] = rawTrains.map((item: Record<string, unknown>) =>
      normalizeRailKitSearchTrain(item, fromCode, toCode)
    );

    return { success: true, data: normalizedList };
  } catch (err) {
    const errMsg = (err as Error).message || 'RailKit train search exception';
    logger.error(`[RailKit Search] Exception: ${errMsg}`, err);
    return {
      success: false,
      error: {
        code: 'PROVIDER_UNAVAILABLE',
        message: 'Real railway search is temporarily unavailable.',
        statusCode: 503,
      },
    };
  }
};

export interface NormalizedAvailabilityItem {
  date: string;
  status: string | null;
  statusCode?: string | null;
  isAvailable?: boolean;
  availableSeats?: number;
  waitlistNumber?: number;
}

export interface NormalizedAvailabilityResponse {
  trainNumber: string;
  source: string;
  destination: string;
  journeyDate: string;
  classCode: string;
  quotaCode: string;
  availability: NormalizedAvailabilityItem[];
  dataSource: 'real';
}

export interface NormalizedFareResponse {
  trainNumber: string;
  source: string;
  destination: string;
  journeyDate: string;
  classCode: string;
  quotaCode: string;
  totalFare: number | null;
  breakdown?: {
    baseFare: number;
    reservationCharge: number;
    superfastCharge: number;
    tatkalFare: number;
    goodsServiceTax: number;
    cateringCharge: number;
    dynamicFare: number;
    otherCharge: number;
    totalFare: number;
  } | null;
  dataSource: 'real';
  fareUnavailable?: boolean;
  message?: string;
}

export const getRealSeatAvailabilityService = async (params: {
  trainNumber: string;
  from: string;
  to: string;
  date: string;
  classCode?: string;
  quotaCode?: string;
}): Promise<{
  success: boolean;
  data?: NormalizedAvailabilityResponse;
  error?: { code: string; message: string; statusCode: number };
}> => {
  const trainNo = params.trainNumber.trim();
  const resolvedFrom = resolveStationCode(params.from);
  const resolvedTo = resolveStationCode(params.to);

  const srcCode = resolvedFrom ? resolvedFrom.code : params.from.trim().toUpperCase();
  const dstCode = resolvedTo ? resolvedTo.code : params.to.trim().toUpperCase();
  const journeyDate = params.date.trim();
  const cls = (params.classCode || '3A').trim().toUpperCase();
  const quota = (params.quotaCode || 'GN').trim().toUpperCase();

  if (!trainNo || !srcCode || !dstCode || !journeyDate) {
    return {
      success: false,
      error: { code: 'INVALID_JOURNEY_DETAILS', message: 'Invalid journey details', statusCode: 400 },
    };
  }

  const apiClient = new RailwayApiClient({
    baseUrl: config.railwayApiBaseUrl,
    apiKey: config.railwayApiKey,
    timeoutMs: config.railwayApiTimeoutMs,
    cacheTtlMs: config.railwayCacheTtlMs,
  });

  if (!config.railwayApiEnabled || !apiClient.isConfigured()) {
    return {
      success: false,
      error: { code: 'PROVIDER_UNAVAILABLE', message: 'Railway provider temporarily unavailable', statusCode: 503 },
    };
  }

  const res = await apiClient.fetchRawSeatAvailability(trainNo, srcCode, dstCode, journeyDate, cls, quota);

  if (!res.success) {
    if (res.statusCode === 400) {
      return { success: false, error: { code: 'INVALID_JOURNEY_DETAILS', message: 'Invalid journey details', statusCode: 400 } };
    }
    if (res.statusCode === 401) {
      return { success: false, error: { code: 'AUTHENTICATION_ERROR', message: 'Authentication/provider error', statusCode: 401 } };
    }
    if (res.statusCode === 404) {
      return { success: false, error: { code: 'TRAIN_NOT_FOUND', message: `Train not found: ${trainNo}`, statusCode: 404 } };
    }
    if (res.statusCode === 429) {
      return { success: false, error: { code: 'RATE_LIMIT_REACHED', message: 'Rate limit reached', statusCode: 429 } };
    }
    return {
      success: false,
      error: { code: 'PROVIDER_UNAVAILABLE', message: 'Railway provider temporarily unavailable', statusCode: res.statusCode || 503 },
    };
  }

  const rawPayload = res.data as Record<string, unknown> | null;
  if (!rawPayload || !rawPayload.success || !rawPayload.data) {
    return {
      success: true,
      data: {
        trainNumber: trainNo,
        source: srcCode,
        destination: dstCode,
        journeyDate,
        classCode: cls,
        quotaCode: quota,
        availability: [],
        dataSource: 'real',
      },
    };
  }

  const payloadData = rawPayload.data as Record<string, unknown>;
  const rawCal = Array.isArray(payloadData.calendar) ? payloadData.calendar : [];
  const normalizedCal: NormalizedAvailabilityItem[] = rawCal.map((item: Record<string, unknown>) => ({
    date: String(item.date || item.rawDate || journeyDate),
    status: item.status !== undefined ? String(item.status) : null,
    statusCode: (item.statusCode as string) || null,
    isAvailable: typeof item.isAvailable === 'boolean' ? item.isAvailable : false,
    availableSeats: typeof item.availableSeats === 'number' ? item.availableSeats : undefined,
    waitlistNumber: typeof item.waitlistNumber === 'number' ? item.waitlistNumber : undefined,
  }));

  return {
    success: true,
    data: {
      trainNumber: trainNo,
      source: srcCode,
      destination: dstCode,
      journeyDate,
      classCode: cls,
      quotaCode: quota,
      availability: normalizedCal,
      dataSource: 'real',
    },
  };
};

export const getRealFareService = async (params: {
  trainNumber: string;
  from: string;
  to: string;
  date: string;
  classCode?: string;
  quotaCode?: string;
}): Promise<{
  success: boolean;
  data?: NormalizedFareResponse;
  error?: { code: string; message: string; statusCode: number };
}> => {
  const trainNo = params.trainNumber.trim();
  const resolvedFrom = resolveStationCode(params.from);
  const resolvedTo = resolveStationCode(params.to);

  const srcCode = resolvedFrom ? resolvedFrom.code : params.from.trim().toUpperCase();
  const dstCode = resolvedTo ? resolvedTo.code : params.to.trim().toUpperCase();
  const journeyDate = params.date.trim();
  const cls = (params.classCode || '3A').trim().toUpperCase();
  const quota = (params.quotaCode || 'GN').trim().toUpperCase();

  if (!trainNo || !srcCode || !dstCode || !journeyDate) {
    return {
      success: false,
      error: { code: 'INVALID_JOURNEY_DETAILS', message: 'Invalid journey details', statusCode: 400 },
    };
  }

  const apiClient = new RailwayApiClient({
    baseUrl: config.railwayApiBaseUrl,
    apiKey: config.railwayApiKey,
    timeoutMs: config.railwayApiTimeoutMs,
    cacheTtlMs: config.railwayCacheTtlMs,
  });

  if (!config.railwayApiEnabled || !apiClient.isConfigured()) {
    return {
      success: true,
      data: {
        trainNumber: trainNo,
        source: srcCode,
        destination: dstCode,
        journeyDate,
        classCode: cls,
        quotaCode: quota,
        totalFare: null,
        dataSource: 'real',
        fareUnavailable: true,
        message: 'Fare unavailable',
      },
    };
  }

  const res = await apiClient.fetchRawFare(trainNo, srcCode, dstCode, journeyDate, cls, quota);

  if (!res.success) {
    if (res.statusCode === 400) {
      return { success: false, error: { code: 'INVALID_JOURNEY_DETAILS', message: 'Invalid journey details', statusCode: 400 } };
    }
    if (res.statusCode === 401) {
      return { success: false, error: { code: 'AUTHENTICATION_ERROR', message: 'Authentication/provider error', statusCode: 401 } };
    }
    if (res.statusCode === 404) {
      return { success: false, error: { code: 'TRAIN_NOT_FOUND', message: `Train not found: ${trainNo}`, statusCode: 404 } };
    }
    if (res.statusCode === 429) {
      return { success: false, error: { code: 'RATE_LIMIT_REACHED', message: 'Rate limit reached', statusCode: 429 } };
    }
    return {
      success: true,
      data: {
        trainNumber: trainNo,
        source: srcCode,
        destination: dstCode,
        journeyDate,
        classCode: cls,
        quotaCode: quota,
        totalFare: null,
        dataSource: 'real',
        fareUnavailable: true,
        message: 'Fare unavailable',
      },
    };
  }

  const rawPayload = res.data as Record<string, unknown> | null;
  const payloadData = rawPayload && rawPayload.data ? (rawPayload.data as Record<string, unknown>) : null;
  if (!rawPayload || !rawPayload.success || !payloadData || !payloadData.breakdown) {
    return {
      success: true,
      data: {
        trainNumber: trainNo,
        source: srcCode,
        destination: dstCode,
        journeyDate,
        classCode: cls,
        quotaCode: quota,
        totalFare: null,
        dataSource: 'real',
        fareUnavailable: true,
        message: 'Fare unavailable',
      },
    };
  }

  const bd = payloadData.breakdown as Record<string, number>;
  const totalFare = typeof bd.totalFare === 'number' ? bd.totalFare : null;

  return {
    success: true,
    data: {
      trainNumber: trainNo,
      source: srcCode,
      destination: dstCode,
      journeyDate,
      classCode: cls,
      quotaCode: quota,
      totalFare,
      breakdown: {
        baseFare: bd.baseFare ?? 0,
        reservationCharge: bd.reservationCharge ?? 0,
        superfastCharge: bd.superfastCharge ?? 0,
        tatkalFare: bd.tatkalFare ?? 0,
        goodsServiceTax: bd.goodsServiceTax ?? 0,
        cateringCharge: bd.cateringCharge ?? 0,
        dynamicFare: bd.dynamicFare ?? 0,
        otherCharge: bd.otherCharge ?? 0,
        totalFare: totalFare ?? 0,
      },
      dataSource: 'real',
    },
  };
};



