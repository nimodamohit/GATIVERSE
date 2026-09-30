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

export interface StationOption {
  code: string;
  name: string;
}
