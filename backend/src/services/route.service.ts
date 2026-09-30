import { Route } from '../models/Route.js';
import { isDbConnected } from '../config/db.js';

export interface RouteSearchQuery {
  source?: string;
  destination?: string;
}

export const FALLBACK_DEMO_ROUTES = [
  { source: 'Bhopal', destination: 'Mumbai', sourceCode: 'BPL', destinationCode: 'MMCT', routeKey: 'BPL-MMCT', distance: 830, estimatedDuration: '11h 45m', popularTrainCount: 14 },
  { source: 'Delhi', destination: 'Bhopal', sourceCode: 'NDLS', destinationCode: 'BPL', routeKey: 'NDLS-BPL', distance: 706, estimatedDuration: '7h 50m', popularTrainCount: 22 },
  { source: 'Mumbai', destination: 'Delhi', sourceCode: 'MMCT', destinationCode: 'NDLS', routeKey: 'MMCT-NDLS', distance: 1386, estimatedDuration: '15h 30m', popularTrainCount: 18 },
  { source: 'Bhopal', destination: 'Delhi', sourceCode: 'BPL', destinationCode: 'NDLS', routeKey: 'BPL-NDLS', distance: 706, estimatedDuration: '8h 10m', popularTrainCount: 20 },
];

export const getRoutesService = async (query: RouteSearchQuery): Promise<unknown[]> => {
  if (isDbConnected()) {
    const mongoQuery: Record<string, unknown> = {};
    if (query.source && query.source.trim()) {
      mongoQuery.source = new RegExp(query.source.trim(), 'i');
    }
    if (query.destination && query.destination.trim()) {
      mongoQuery.destination = new RegExp(query.destination.trim(), 'i');
    }
    const results = await Route.find(mongoQuery).exec();
    if (results && results.length > 0) {
      return results;
    }
  }

  // Fallback filtering
  return FALLBACK_DEMO_ROUTES.filter((r) => {
    let matches = true;
    if (query.source && query.source.trim()) {
      const src = query.source.trim().toLowerCase();
      matches = matches && (r.source.toLowerCase().includes(src) || r.sourceCode.toLowerCase().includes(src));
    }
    if (query.destination && query.destination.trim()) {
      const dest = query.destination.trim().toLowerCase();
      matches = matches && (r.destination.toLowerCase().includes(dest) || r.destinationCode.toLowerCase().includes(dest));
    }
    return matches;
  });
};
