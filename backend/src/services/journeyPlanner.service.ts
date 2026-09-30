import { searchTrainsService, FALLBACK_DEMO_TRAINS } from './train.service.js';
import { getAvailabilityService } from './availability.service.js';

export interface JourneyPlannerSearchParams {
  from: string;
  to: string;
  date: string;
  classType?: string;
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

export interface JourneyPlannerResponseData {
  from: string;
  to: string;
  date: string;
  trains: PlannerTrainResult[];
  alternativeTrains: PlannerTrainResult[];
}

// Generate deterministic demo availability when not explicitly stored
function getDeterministicClassAvailability(
  trainNumber: string,
  journeyDate: string,
  classCode: string,
  baseFare: number
): PlannerClassOption {
  let hash = 0;
  const str = `${trainNumber}-${journeyDate}-${classCode}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const posHash = Math.abs(hash);

  const classNames: Record<string, string> = {
    SL: 'Sleeper Class',
    '3A': 'AC 3 Tier',
    '2A': 'AC 2 Tier',
    '1A': 'AC First Class',
    '3E': 'AC 3 Economy',
    CC: 'AC Chair Car',
    EC: 'Executive Chair',
  };

  const mod = posHash % 10;
  let availableSeats = 0;
  let statusText = 'AVAILABLE';
  let isAvailable = true;
  let statusType: PlannerClassOption['statusType'] = 'AVAILABLE';

  if (mod >= 2) {
    // Available
    availableSeats = (posHash % 45) + 6;
    statusText = `Available: ${availableSeats} seats`;
    isAvailable = true;
    statusType = 'AVAILABLE';
  } else if (mod === 1) {
    // RAC
    availableSeats = (posHash % 8) + 1;
    statusText = `RAC ${availableSeats}`;
    isAvailable = true;
    statusType = 'RAC';
  } else {
    // Waitlist
    const wl = (posHash % 12) + 1;
    statusText = `WL ${wl}`;
    isAvailable = false;
    statusType = 'WAITLIST';
  }

  return {
    classCode,
    className: classNames[classCode] || `${classCode} Class`,
    fare: baseFare,
    availableSeats,
    statusText,
    isAvailable,
    statusType,
  };
}

export const searchJourneyPlannerService = async (
  params: JourneyPlannerSearchParams
): Promise<JourneyPlannerResponseData> => {
  const fromClean = (params.from || '').trim().toLowerCase();
  const toClean = (params.to || '').trim().toLowerCase();
  const dateClean = (params.date || '').trim() || new Date().toISOString().split('T')[0];

  // 1. Fetch all candidate trains (from MongoDB or fallback)
  const allTrainsRaw = (await searchTrainsService({})) as Array<typeof FALLBACK_DEMO_TRAINS[0]>;
  const allTrains = (allTrainsRaw && allTrainsRaw.length > 0) ? allTrainsRaw : FALLBACK_DEMO_TRAINS;

  const directMatches: PlannerTrainResult[] = [];
  const altCandidates: PlannerTrainResult[] = [];

  for (const t of allTrains) {
    const stations = t.stations || [];
    let fromIndex = -1;
    let toIndex = -1;

    // Check train top-level endpoints
    const srcName = (t.source || '').toLowerCase();
    const srcCode = (t.sourceCode || '').toLowerCase();
    const dstName = (t.destination || '').toLowerCase();
    const dstCode = (t.destinationCode || '').toLowerCase();

    const matchesTopSrc = fromClean && (srcName.includes(fromClean) || srcCode.includes(fromClean) || fromClean.includes(srcCode));
    const matchesTopDst = toClean && (dstName.includes(toClean) || dstCode.includes(toClean) || toClean.includes(dstCode));

    // Check intermediate stations
    for (let i = 0; i < stations.length; i++) {
      const sName = (stations[i].stationName || '').toLowerCase();
      const sCode = (stations[i].stationCode || '').toLowerCase();

      if (fromClean && fromIndex === -1 && (sName.includes(fromClean) || sCode.includes(fromClean) || fromClean.includes(sCode))) {
        fromIndex = i;
      }
      if (toClean && toIndex === -1 && (sName.includes(toClean) || sCode.includes(toClean) || toClean.includes(sCode))) {
        toIndex = i;
      }
    }

    const isDirectMatch = (matchesTopSrc || fromIndex !== -1) &&
      (matchesTopDst || toIndex !== -1) &&
      ((fromIndex !== -1 && toIndex !== -1) ? fromIndex < toIndex : true);

    // Compute departure, arrival, duration for this route segment
    const startStop = fromIndex >= 0 ? stations[fromIndex] : stations[0];
    const endStop = toIndex >= 0 ? stations[toIndex] : stations[stations.length - 1];

    const departureTime = startStop?.scheduledDeparture || t.departureTime;
    const arrivalTime = endStop?.scheduledArrival || t.arrivalTime;
    const segFrom = startStop?.stationName || t.source;
    const segTo = endStop?.stationName || t.destination;
    const segFromCode = startStop?.stationCode || t.sourceCode;
    const segToCode = endStop?.stationCode || t.destinationCode;

    // Build class availability
    const classOptions: PlannerClassOption[] = [];
    const availList = (await getAvailabilityService({
      trainNumber: t.trainNumber,
      journeyDate: dateClean,
    })) as Array<{ classType: string; availableSeats: number; statusText?: string; fare: number }>;

    for (const cls of t.classes || []) {
      const dbAvail = availList.find((a) => a.classType === cls.classCode);
      if (dbAvail) {
        classOptions.push({
          classCode: cls.classCode,
          className: cls.className,
          fare: dbAvail.fare || cls.fare,
          availableSeats: dbAvail.availableSeats,
          statusText: dbAvail.statusText || (dbAvail.availableSeats > 0 ? `Available: ${dbAvail.availableSeats} seats` : 'WL 5'),
          isAvailable: dbAvail.availableSeats > 0,
          statusType: dbAvail.availableSeats > 0 ? 'AVAILABLE' : 'WAITLIST',
        });
      } else {
        classOptions.push(getDeterministicClassAvailability(t.trainNumber, dateClean, cls.classCode, cls.fare));
      }
    }

    const minFare = classOptions.length > 0 ? Math.min(...classOptions.map((c) => c.fare)) : 500;
    const hasAvailable = classOptions.some((c) => c.isAvailable);

    const plannerItem: PlannerTrainResult = {
      trainNumber: t.trainNumber,
      trainName: t.trainName,
      from: segFrom,
      to: segTo,
      fromCode: segFromCode,
      toCode: segToCode,
      departureTime,
      arrivalTime,
      duration: t.duration,
      classes: classOptions,
      availability: hasAvailable ? 'AVAILABLE' : 'WAITLIST',
      fare: minFare,
    };

    if (isDirectMatch) {
      directMatches.push(plannerItem);
    } else if (matchesTopSrc || fromIndex !== -1 || matchesTopDst || toIndex !== -1) {
      altCandidates.push({
        ...plannerItem,
        isAlternative: true,
        alternativeReason: (matchesTopSrc || fromIndex !== -1)
          ? `Departs from ${segFrom} towards nearby corridor`
          : `Connects to destination region ${segTo}`,
      });
    }
  }

  // Filter by classType if requested
  let finalTrains = directMatches;
  if (params.classType && params.classType !== 'ALL') {
    const desiredClass = params.classType.toUpperCase();
    finalTrains = finalTrains.filter((t) => t.classes.some((c) => c.classCode.toUpperCase() === desiredClass));
  }

  return {
    from: params.from,
    to: params.to,
    date: dateClean,
    trains: finalTrains,
    alternativeTrains: directMatches.length < 3 ? altCandidates.slice(0, 3) : [],
  };
};
