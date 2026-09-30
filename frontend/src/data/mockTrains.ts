export interface StationStop {
  stationCode: string;
  stationName: string;
  scheduledArrival: string;
  scheduledDeparture: string;
  actualArrival?: string;
  actualDeparture?: string;
  status: 'passed' | 'current' | 'upcoming';
  platform?: string;
}

export interface ClassAvailability {
  classCode: string; // e.g., 'SL', '3A', '2A', '1A', 'CC'
  className: string; // e.g., 'Sleeper', 'AC 3 Tier', 'AC 2 Tier', 'AC First Class'
  status: string;    // e.g., 'Available: 18 seats', 'Available: 7 seats', 'WL 3'
  isAvailable: boolean;
  fare: number;      // e.g., 1450
  seatCount: number;
}

export interface PlannerClassOption {
  classCode: string;
  className: string;
  fare: number;
  availableSeats: number;
  statusText: string;
  isAvailable: boolean;
  statusType: 'AVAILABLE' | 'RAC' | 'WAITLIST' | 'NOT AVAILABLE';
}

export interface PlannerTrainResult {
  trainNumber: string;
  trainName: string;
  from: string;
  to: string;
  fromCode: string;
  toCode: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  classes: PlannerClassOption[];
  availability: string;
  fare: number;
  isAlternative?: boolean;
  alternativeReason?: string;
}

export interface TrainDetails {
  trainNumber: string;
  trainName: string;
  source: string;
  destination: string;
  sourceCode: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  runsOn: string[];
  currentStatus: 'On Time' | 'Delayed' | 'Early' | 'Cancelled';
  delayMinutes: number;
  currentStation: string;
  nextStation: string;
  currentSpeedKmH: number;
  lastUpdated: string;
  distanceCoveredKm: number;
  totalDistanceKm: number;
  stations: StationStop[];
  classes: ClassAvailability[];
}


export interface PopularRoute {
  id: string;
  from: string;
  to: string;
  fromCode: string;
  toCode: string;
  popularTrainCount: number;
  avgDuration: string;
}

export const MOCK_POPULAR_ROUTES: PopularRoute[] = [
  {
    id: 'route-1',
    from: 'Bhopal',
    to: 'Mumbai',
    fromCode: 'BPL',
    toCode: 'MMCT',
    popularTrainCount: 14,
    avgDuration: '11h 45m',
  },
  {
    id: 'route-2',
    from: 'Delhi',
    to: 'Bhopal',
    fromCode: 'NDLS',
    toCode: 'BPL',
    popularTrainCount: 22,
    avgDuration: '7h 50m',
  },
  {
    id: 'route-3',
    from: 'Mumbai',
    to: 'Delhi',
    fromCode: 'MMCT',
    toCode: 'NDLS',
    popularTrainCount: 18,
    avgDuration: '15h 30m',
  },
  {
    id: 'route-4',
    from: 'Bhopal',
    to: 'Delhi',
    fromCode: 'BPL',
    toCode: 'NDLS',
    popularTrainCount: 20,
    avgDuration: '8h 10m',
  },
];

export const MOCK_TRAINS: TrainDetails[] = [
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
    runsOn: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    currentStatus: 'Delayed',
    delayMinutes: 35,
    currentStation: 'Near Bhopal Junction',
    nextStation: 'Itarsi Junction',
    currentSpeedKmH: 95,
    lastUpdated: '2 mins ago',
    distanceCoveredKm: 704,
    totalDistanceKm: 1386,
    stations: [
      {
        stationCode: 'NDLS',
        stationName: 'New Delhi',
        scheduledArrival: '05:00 PM',
        scheduledDeparture: '05:00 PM',
        actualArrival: '05:00 PM',
        actualDeparture: '05:05 PM',
        status: 'passed',
        platform: 'Platform 16',
      },
      {
        stationCode: 'AGC',
        stationName: 'Agra Cantt',
        scheduledArrival: '06:55 PM',
        scheduledDeparture: '06:57 PM',
        actualArrival: '07:08 PM',
        actualDeparture: '07:10 PM',
        status: 'passed',
        platform: 'Platform 1',
      },
      {
        stationCode: 'GWL',
        stationName: 'Gwalior Junction',
        scheduledArrival: '08:28 PM',
        scheduledDeparture: '08:30 PM',
        actualArrival: '08:48 PM',
        actualDeparture: '08:50 PM',
        status: 'passed',
        platform: 'Platform 2',
      },
      {
        stationCode: 'VGLJ',
        stationName: 'VGL Jhansi Junction',
        scheduledArrival: '09:45 PM',
        scheduledDeparture: '09:50 PM',
        actualArrival: '10:15 PM',
        actualDeparture: '10:20 PM',
        status: 'passed',
        platform: 'Platform 1',
      },
      {
        stationCode: 'BPL',
        stationName: 'Bhopal Junction',
        scheduledArrival: '07:15 PM',
        scheduledDeparture: '07:20 PM',
        actualArrival: '07:50 PM',
        actualDeparture: '07:55 PM',
        status: 'current',
        platform: 'Platform 3',
      },
      {
        stationCode: 'ET',
        stationName: 'Itarsi Junction',
        scheduledArrival: '08:50 PM',
        scheduledDeparture: '08:55 PM',
        actualArrival: '09:25 PM',
        actualDeparture: '09:30 PM',
        status: 'upcoming',
        platform: 'Platform 1',
      },
      {
        stationCode: 'ST',
        stationName: 'Surat',
        scheduledArrival: '04:55 AM',
        scheduledDeparture: '05:00 AM',
        actualArrival: '05:30 AM',
        actualDeparture: '05:35 AM',
        status: 'upcoming',
        platform: 'Platform 2',
      },
      {
        stationCode: 'MMCT',
        stationName: 'Mumbai Central',
        scheduledArrival: '08:35 AM',
        scheduledDeparture: '08:35 AM',
        actualArrival: '09:10 AM',
        actualDeparture: '09:10 AM',
        status: 'upcoming',
        platform: 'Platform 1',
      },
    ],
    classes: [
      { classCode: '3A', className: 'AC 3 Tier', status: 'Available: 18 seats', isAvailable: true, fare: 1450, seatCount: 18 },
      { classCode: '2A', className: 'AC 2 Tier', status: 'Available: 7 seats', isAvailable: true, fare: 2100, seatCount: 7 },
      { classCode: '1A', className: 'AC First Class', status: 'WL 3', isAvailable: false, fare: 3450, seatCount: 0 },
      { classCode: '3E', className: 'AC 3 Economy', status: 'Available: 34 seats', isAvailable: true, fare: 1320, seatCount: 34 },
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
    runsOn: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    currentStatus: 'On Time',
    delayMinutes: 0,
    currentStation: 'Agra Cantt',
    nextStation: 'Gwalior Junction',
    currentSpeedKmH: 120,
    lastUpdated: '1 min ago',
    distanceCoveredKm: 200,
    totalDistanceKm: 706,
    stations: [
      {
        stationCode: 'NDLS',
        stationName: 'New Delhi',
        scheduledArrival: '06:00 AM',
        scheduledDeparture: '06:00 AM',
        actualArrival: '06:00 AM',
        actualDeparture: '06:00 AM',
        status: 'passed',
        platform: 'Platform 1',
      },
      {
        stationCode: 'AGC',
        stationName: 'Agra Cantt',
        scheduledArrival: '07:50 AM',
        scheduledDeparture: '07:55 AM',
        actualArrival: '07:50 AM',
        actualDeparture: '07:55 AM',
        status: 'current',
        platform: 'Platform 1',
      },
      {
        stationCode: 'GWL',
        stationName: 'Gwalior Junction',
        scheduledArrival: '09:23 AM',
        scheduledDeparture: '09:28 AM',
        actualArrival: '09:23 AM',
        actualDeparture: '09:28 AM',
        status: 'upcoming',
        platform: 'Platform 1',
      },
      {
        stationCode: 'RKMP',
        stationName: 'Rani Kamlapati (Bhopal)',
        scheduledArrival: '02:05 PM',
        scheduledDeparture: '02:05 PM',
        actualArrival: '02:05 PM',
        actualDeparture: '02:05 PM',
        status: 'upcoming',
        platform: 'Platform 5',
      },
    ],
    classes: [
      { classCode: 'CC', className: 'AC Chair Car', status: 'Available: 52 seats', isAvailable: true, fare: 1165, seatCount: 52 },
      { classCode: 'EC', className: 'Executive Chair', status: 'Available: 12 seats', isAvailable: true, fare: 2280, seatCount: 12 },
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
    runsOn: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    currentStatus: 'Delayed',
    delayMinutes: 15,
    currentStation: 'Mathura Junction',
    nextStation: 'Agra Cantt',
    currentSpeedKmH: 85,
    lastUpdated: 'Just now',
    distanceCoveredKm: 140,
    totalDistanceKm: 3032,
    stations: [
      {
        stationCode: 'NDLS',
        stationName: 'New Delhi',
        scheduledArrival: '08:10 PM',
        scheduledDeparture: '08:10 PM',
        actualArrival: '08:10 PM',
        actualDeparture: '08:15 PM',
        status: 'passed',
        platform: 'Platform 3',
      },
      {
        stationCode: 'MTJ',
        stationName: 'Mathura Junction',
        scheduledArrival: '09:40 PM',
        scheduledDeparture: '09:45 PM',
        actualArrival: '09:55 PM',
        actualDeparture: '10:00 PM',
        status: 'current',
        platform: 'Platform 2',
      },
      {
        stationCode: 'AGC',
        stationName: 'Agra Cantt',
        scheduledArrival: '10:30 PM',
        scheduledDeparture: '10:35 PM',
        actualArrival: '10:45 PM',
        actualDeparture: '10:50 PM',
        status: 'upcoming',
        platform: 'Platform 1',
      },
      {
        stationCode: 'BPL',
        stationName: 'Bhopal Junction',
        scheduledArrival: '05:30 AM',
        scheduledDeparture: '05:35 AM',
        actualArrival: '05:45 AM',
        actualDeparture: '05:50 AM',
        status: 'upcoming',
        platform: 'Platform 2',
      },
      {
        stationCode: 'ET',
        stationName: 'Itarsi Junction',
        scheduledArrival: '07:10 AM',
        scheduledDeparture: '07:15 AM',
        actualArrival: '07:25 AM',
        actualDeparture: '07:30 AM',
        status: 'upcoming',
        platform: 'Platform 1',
      },
      {
        stationCode: 'TVC',
        stationName: 'Trivandrum Central',
        scheduledArrival: '06:00 PM',
        scheduledDeparture: '06:00 PM',
        actualArrival: '06:15 PM',
        actualDeparture: '06:15 PM',
        status: 'upcoming',
        platform: 'Platform 1',
      },
    ],
    classes: [
      { classCode: 'SL', className: 'Sleeper Class', status: 'Available: 45 seats', isAvailable: true, fare: 540, seatCount: 45 },
      { classCode: '3A', className: 'AC 3 Tier', status: 'Available: 22 seats', isAvailable: true, fare: 1380, seatCount: 22 },
      { classCode: '2A', className: 'AC 2 Tier', status: 'Available: 4 seats', isAvailable: true, fare: 1980, seatCount: 4 },
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
    runsOn: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    currentStatus: 'On Time',
    delayMinutes: 0,
    currentStation: 'Khandwa Junction',
    nextStation: 'Bhusaval Junction',
    currentSpeedKmH: 90,
    lastUpdated: '4 mins ago',
    distanceCoveredKm: 1250,
    totalDistanceKm: 1925,
    stations: [
      {
        stationCode: 'FZR',
        stationName: 'Firozpur Cantt',
        scheduledArrival: '09:45 PM',
        scheduledDeparture: '09:45 PM',
        actualArrival: '09:45 PM',
        actualDeparture: '09:45 PM',
        status: 'passed',
      },
      {
        stationCode: 'KNW',
        stationName: 'Khandwa Junction',
        scheduledArrival: '03:15 PM',
        scheduledDeparture: '03:20 PM',
        actualArrival: '03:15 PM',
        actualDeparture: '03:20 PM',
        status: 'current',
      },
      {
        stationCode: 'BSL',
        stationName: 'Bhusaval Junction',
        scheduledArrival: '05:25 PM',
        scheduledDeparture: '05:30 PM',
        actualArrival: '05:25 PM',
        actualDeparture: '05:30 PM',
        status: 'upcoming',
      },
      {
        stationCode: 'CSMT',
        stationName: 'Mumbai CSMT',
        scheduledArrival: '07:35 AM',
        scheduledDeparture: '07:35 AM',
        actualArrival: '07:35 AM',
        actualDeparture: '07:35 AM',
        status: 'upcoming',
      },
    ],
    classes: [
      { classCode: 'SL', className: 'Sleeper Class', status: 'Available: 68 seats', isAvailable: true, fare: 495, seatCount: 68 },
      { classCode: '3A', className: 'AC 3 Tier', status: 'Available: 14 seats', isAvailable: true, fare: 1290, seatCount: 14 },
      { classCode: '2A', className: 'AC 2 Tier', status: 'Available: 9 seats', isAvailable: true, fare: 1850, seatCount: 9 },
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
    runsOn: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    currentStatus: 'On Time',
    delayMinutes: 0,
    currentStation: 'Rani Kamlapati (Bhopal)',
    nextStation: 'Gwalior Junction',
    currentSpeedKmH: 110,
    lastUpdated: '1 min ago',
    distanceCoveredKm: 0,
    totalDistanceKm: 706,
    stations: [
      { stationCode: 'RKMP', stationName: 'Rani Kamlapati (Bhopal)', scheduledArrival: '03:00 PM', scheduledDeparture: '03:00 PM', actualArrival: '03:00 PM', actualDeparture: '03:00 PM', status: 'current', platform: 'Platform 1' },
      { stationCode: 'GWL', stationName: 'Gwalior Junction', scheduledArrival: '06:40 PM', scheduledDeparture: '06:45 PM', actualArrival: '06:40 PM', actualDeparture: '06:45 PM', status: 'upcoming', platform: 'Platform 2' },
      { stationCode: 'AGC', stationName: 'Agra Cantt', scheduledArrival: '08:15 PM', scheduledDeparture: '08:20 PM', actualArrival: '08:15 PM', actualDeparture: '08:20 PM', status: 'upcoming', platform: 'Platform 1' },
      { stationCode: 'NDLS', stationName: 'New Delhi', scheduledArrival: '11:50 PM', scheduledDeparture: '11:50 PM', actualArrival: '11:50 PM', actualDeparture: '11:50 PM', status: 'upcoming', platform: 'Platform 1' },
    ],
    classes: [
      { classCode: 'CC', className: 'AC Chair Car', status: 'Available: 38 seats', isAvailable: true, fare: 1165, seatCount: 38 },
      { classCode: 'EC', className: 'Executive Chair', status: 'Available: 10 seats', isAvailable: true, fare: 2280, seatCount: 10 },
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
    runsOn: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    currentStatus: 'On Time',
    delayMinutes: 0,
    currentStation: 'Mumbai Central',
    nextStation: 'Surat',
    currentSpeedKmH: 95,
    lastUpdated: 'Just now',
    distanceCoveredKm: 0,
    totalDistanceKm: 1386,
    stations: [
      { stationCode: 'MMCT', stationName: 'Mumbai Central', scheduledArrival: '05:00 PM', scheduledDeparture: '05:00 PM', actualArrival: '05:00 PM', actualDeparture: '05:00 PM', status: 'current', platform: 'Platform 1' },
      { stationCode: 'ST', stationName: 'Surat', scheduledArrival: '07:50 PM', scheduledDeparture: '07:55 PM', actualArrival: '07:50 PM', actualDeparture: '07:55 PM', status: 'upcoming', platform: 'Platform 1' },
      { stationCode: 'ET', stationName: 'Itarsi Junction', scheduledArrival: '02:15 AM', scheduledDeparture: '02:20 AM', actualArrival: '02:15 AM', actualDeparture: '02:20 AM', status: 'upcoming', platform: 'Platform 1' },
      { stationCode: 'BPL', stationName: 'Bhopal Junction', scheduledArrival: '03:40 AM', scheduledDeparture: '03:45 AM', actualArrival: '03:40 AM', actualDeparture: '03:45 AM', status: 'upcoming', platform: 'Platform 2' },
      { stationCode: 'VGLJ', stationName: 'VGL Jhansi Junction', scheduledArrival: '05:35 AM', scheduledDeparture: '05:40 AM', actualArrival: '05:35 AM', actualDeparture: '05:40 AM', status: 'upcoming', platform: 'Platform 1' },
      { stationCode: 'GWL', stationName: 'Gwalior Junction', scheduledArrival: '06:45 AM', scheduledDeparture: '06:50 AM', actualArrival: '06:45 AM', actualDeparture: '06:50 AM', status: 'upcoming', platform: 'Platform 2' },
      { stationCode: 'AGC', stationName: 'Agra Cantt', scheduledArrival: '07:55 AM', scheduledDeparture: '08:00 AM', actualArrival: '07:55 AM', actualDeparture: '08:00 AM', status: 'upcoming', platform: 'Platform 1' },
      { stationCode: 'NDLS', stationName: 'New Delhi', scheduledArrival: '08:35 AM', scheduledDeparture: '08:35 AM', actualArrival: '08:35 AM', actualDeparture: '08:35 AM', status: 'upcoming', platform: 'Platform 16' },
    ],
    classes: [
      { classCode: '3A', className: 'AC 3 Tier', status: 'Available: 37 seats', isAvailable: true, fare: 1450, seatCount: 37 },
      { classCode: '2A', className: 'AC 2 Tier', status: 'Available: 23 seats', isAvailable: true, fare: 2100, seatCount: 23 },
      { classCode: '1A', className: 'AC First Class', status: 'Available: 9 seats', isAvailable: true, fare: 3450, seatCount: 9 },
      { classCode: '3E', className: 'AC 3 Economy', status: 'Available: 33 seats', isAvailable: true, fare: 1320, seatCount: 33 },
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
    runsOn: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    currentStatus: 'On Time',
    delayMinutes: 0,
    currentStation: 'Trivandrum Central',
    nextStation: 'Itarsi Junction',
    currentSpeedKmH: 85,
    lastUpdated: 'Just now',
    distanceCoveredKm: 0,
    totalDistanceKm: 3032,
    stations: [
      { stationCode: 'TVC', stationName: 'Trivandrum Central', scheduledArrival: '11:15 AM', scheduledDeparture: '11:15 AM', actualArrival: '11:15 AM', actualDeparture: '11:15 AM', status: 'current', platform: 'Platform 1' },
      { stationCode: 'ET', stationName: 'Itarsi Junction', scheduledArrival: '06:30 AM', scheduledDeparture: '06:35 AM', actualArrival: '06:30 AM', actualDeparture: '06:35 AM', status: 'upcoming', platform: 'Platform 1' },
      { stationCode: 'BPL', stationName: 'Bhopal Junction', scheduledArrival: '08:00 AM', scheduledDeparture: '08:05 AM', actualArrival: '08:00 AM', actualDeparture: '08:05 AM', status: 'upcoming', platform: 'Platform 2' },
      { stationCode: 'AGC', stationName: 'Agra Cantt', scheduledArrival: '12:15 PM', scheduledDeparture: '12:20 PM', actualArrival: '12:15 PM', actualDeparture: '12:20 PM', status: 'upcoming', platform: 'Platform 1' },
      { stationCode: 'MTJ', stationName: 'Mathura Junction', scheduledArrival: '01:05 PM', scheduledDeparture: '01:10 PM', actualArrival: '01:05 PM', actualDeparture: '01:10 PM', status: 'upcoming', platform: 'Platform 2' },
      { stationCode: 'NDLS', stationName: 'New Delhi', scheduledArrival: '01:45 PM', scheduledDeparture: '01:45 PM', actualArrival: '01:45 PM', actualDeparture: '01:45 PM', status: 'upcoming', platform: 'Platform 3' },
    ],
    classes: [
      { classCode: 'SL', className: 'Sleeper Class', status: 'Available: 14 seats', isAvailable: true, fare: 540, seatCount: 14 },
      { classCode: '3A', className: 'AC 3 Tier', status: 'WL 5', isAvailable: false, fare: 1380, seatCount: 0 },
      { classCode: '2A', className: 'AC 2 Tier', status: 'Available: 15 seats', isAvailable: true, fare: 1980, seatCount: 15 },
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
    runsOn: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    currentStatus: 'On Time',
    delayMinutes: 0,
    currentStation: 'Mumbai CSMT',
    nextStation: 'Bhusaval Junction',
    currentSpeedKmH: 90,
    lastUpdated: 'Just now',
    distanceCoveredKm: 0,
    totalDistanceKm: 1925,
    stations: [
      { stationCode: 'CSMT', stationName: 'Mumbai CSMT', scheduledArrival: '07:35 PM', scheduledDeparture: '07:35 PM', actualArrival: '07:35 PM', actualDeparture: '07:35 PM', status: 'current' },
      { stationCode: 'BSL', stationName: 'Bhusaval Junction', scheduledArrival: '02:15 AM', scheduledDeparture: '02:20 AM', actualArrival: '02:15 AM', actualDeparture: '02:20 AM', status: 'upcoming' },
      { stationCode: 'KNW', stationName: 'Khandwa Junction', scheduledArrival: '04:10 AM', scheduledDeparture: '04:15 AM', actualArrival: '04:10 AM', actualDeparture: '04:15 AM', status: 'upcoming' },
      { stationCode: 'FZR', stationName: 'Firozpur Cantt', scheduledArrival: '05:10 AM', scheduledDeparture: '05:10 AM', actualArrival: '05:10 AM', actualDeparture: '05:10 AM', status: 'upcoming' },
    ],
    classes: [
      { classCode: 'SL', className: 'Sleeper Class', status: 'Available: 50 seats', isAvailable: true, fare: 495, seatCount: 50 },
      { classCode: '3A', className: 'AC 3 Tier', status: 'Available: 20 seats', isAvailable: true, fare: 1290, seatCount: 20 },
      { classCode: '2A', className: 'AC 2 Tier', status: 'Available: 10 seats', isAvailable: true, fare: 1850, seatCount: 10 },
    ],
  },
];

export const getTrainByNumber = (trainNumber: string): TrainDetails | undefined => {
  return MOCK_TRAINS.find((train) => train.trainNumber === trainNumber);
};

export const searchTrains = (from?: string, to?: string, trainNum?: string): TrainDetails[] => {
  return MOCK_TRAINS.filter((train) => {
    let matches = true;
    if (trainNum && trainNum.trim()) {
      matches = matches && (train.trainNumber.includes(trainNum.trim()) || train.trainName.toLowerCase().includes(trainNum.trim().toLowerCase()));
    }
    if (from && from.trim()) {
      const fromLower = from.trim().toLowerCase();
      matches = matches && (
        train.source.toLowerCase().includes(fromLower) ||
        train.sourceCode.toLowerCase().includes(fromLower) ||
        train.stations.some(s => s.stationName.toLowerCase().includes(fromLower) || s.stationCode.toLowerCase().includes(fromLower))
      );
    }
    if (to && to.trim()) {
      const toLower = to.trim().toLowerCase();
      matches = matches && (
        train.destination.toLowerCase().includes(toLower) ||
        train.destinationCode.toLowerCase().includes(toLower) ||
        train.stations.some(s => s.stationName.toLowerCase().includes(toLower) || s.stationCode.toLowerCase().includes(toLower))
      );
    }
    return matches;
  });
};

export const getAlternativeTrains = (trainNumber: string): TrainDetails[] => {
  return MOCK_TRAINS.filter((train) => train.trainNumber !== trainNumber);
};


