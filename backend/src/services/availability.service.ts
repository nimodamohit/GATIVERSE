import { TrainAvailability } from '../models/TrainAvailability.js';
import { isDbConnected } from '../config/db.js';

export interface AvailabilityQuery {
  trainNumber?: string;
  source?: string;
  destination?: string;
  journeyDate?: string;
}

export const FALLBACK_DEMO_AVAILABILITY = [
  { trainNumber: '12952', journeyDate: '2026-10-30', source: 'BPL', destination: 'NDLS', classType: '3A', availableSeats: 18, statusText: 'Available: 18 seats', fare: 1450 },
  { trainNumber: '12952', journeyDate: '2026-10-30', source: 'BPL', destination: 'NDLS', classType: '2A', availableSeats: 7, statusText: 'Available: 7 seats', fare: 2100 },
  { trainNumber: '12952', journeyDate: '2026-10-30', source: 'BPL', destination: 'NDLS', classType: '1A', availableSeats: 0, statusText: 'WL 3', fare: 3450 },
  { trainNumber: '12002', journeyDate: '2026-10-30', source: 'NDLS', destination: 'RKMP', classType: 'CC', availableSeats: 52, statusText: 'Available: 52 seats', fare: 1165 },
  { trainNumber: '12002', journeyDate: '2026-10-30', source: 'NDLS', destination: 'RKMP', classType: 'EC', availableSeats: 12, statusText: 'Available: 12 seats', fare: 2280 },
  { trainNumber: '12626', journeyDate: '2026-10-30', source: 'NDLS', destination: 'TVC', classType: 'SL', availableSeats: 45, statusText: 'Available: 45 seats', fare: 540 },
  { trainNumber: '12626', journeyDate: '2026-10-30', source: 'NDLS', destination: 'TVC', classType: '3A', availableSeats: 22, statusText: 'Available: 22 seats', fare: 1380 },
  { trainNumber: '12138', journeyDate: '2026-10-30', source: 'FZR', destination: 'CSMT', classType: 'SL', availableSeats: 68, statusText: 'Available: 68 seats', fare: 495 },
];

export const getAvailabilityService = async (query: AvailabilityQuery): Promise<unknown[]> => {
  if (isDbConnected()) {
    const mongoQuery: Record<string, unknown> = {};
    if (query.trainNumber) mongoQuery.trainNumber = query.trainNumber.trim();
    if (query.journeyDate) mongoQuery.journeyDate = query.journeyDate.trim();
    if (query.source) mongoQuery.source = new RegExp(query.source.trim(), 'i');
    if (query.destination) mongoQuery.destination = new RegExp(query.destination.trim(), 'i');

    const results = await TrainAvailability.find(mongoQuery).exec();
    if (results && results.length > 0) {
      return results;
    }
  }

  // Fallback demo filtering
  return FALLBACK_DEMO_AVAILABILITY.filter((item) => {
    let matches = true;
    if (query.trainNumber && query.trainNumber.trim()) {
      matches = matches && item.trainNumber === query.trainNumber.trim();
    }
    if (query.journeyDate && query.journeyDate.trim()) {
      matches = matches && item.journeyDate === query.journeyDate.trim();
    }
    if (query.source && query.source.trim()) {
      const src = query.source.trim().toLowerCase();
      matches = matches && (item.source.toLowerCase().includes(src) || src.includes(item.source.toLowerCase()));
    }
    if (query.destination && query.destination.trim()) {
      const dest = query.destination.trim().toLowerCase();
      matches = matches && (item.destination.toLowerCase().includes(dest) || dest.includes(item.destination.toLowerCase()));
    }
    return matches;
  });
};
