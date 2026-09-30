export interface RecentRoute {
  from: string;
  to: string;
}

export interface LastJourneySearch {
  from: string;
  to: string;
  date: string;
  classType?: string;
}

export interface TrackedRouteUsage {
  from: string;
  to: string;
  count: number;
  lastUsed: number;
}

const KEYS = {
  LAST_CHECKED_TRAIN: 'smartrail_last_checked_train',
  RECENT_ROUTE: 'smartrail_recent_route',
  ROUTE_USAGE: 'smartrail_route_usage',
  LAST_JOURNEY_SEARCH: 'lastJourneySearch',
};

export const DEFAULT_TRAIN_NUMBER = '12952';

export const getLastCheckedTrain = (): string => {
  if (typeof window === 'undefined') return DEFAULT_TRAIN_NUMBER;
  try {
    const value = localStorage.getItem(KEYS.LAST_CHECKED_TRAIN);
    return value && value.trim() ? value.trim() : DEFAULT_TRAIN_NUMBER;
  } catch {
    return DEFAULT_TRAIN_NUMBER;
  }
};

export const setLastCheckedTrain = (trainNumber: string): void => {
  if (typeof window === 'undefined') return;
  try {
    if (trainNumber && trainNumber.trim()) {
      localStorage.setItem(KEYS.LAST_CHECKED_TRAIN, trainNumber.trim());
    }
  } catch (e) {
    console.error('Error saving last checked train:', e);
  }
};

export const getRecentRoute = (): RecentRoute | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEYS.RECENT_ROUTE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.from === 'string' && typeof parsed.to === 'string') {
      return { from: parsed.from.trim(), to: parsed.to.trim() };
    }
    return null;
  } catch {
    return null;
  }
};

export const recordRouteUsage = (from: string, to: string): void => {
  if (typeof window === 'undefined') return;
  const cleanFrom = from ? from.trim() : '';
  const cleanTo = to ? to.trim() : '';
  if (!cleanFrom || !cleanTo) return;

  try {
    // 1. Record as recent route
    localStorage.setItem(
      KEYS.RECENT_ROUTE,
      JSON.stringify({ from: cleanFrom, to: cleanTo })
    );

    // 2. Increment usage count
    const rawMap = localStorage.getItem(KEYS.ROUTE_USAGE);
    const usageMap: Record<string, TrackedRouteUsage> = rawMap ? JSON.parse(rawMap) : {};

    const key = `${cleanFrom.toLowerCase()}__${cleanTo.toLowerCase()}`;
    const existing = usageMap[key] || {
      from: cleanFrom,
      to: cleanTo,
      count: 0,
      lastUsed: Date.now(),
    };

    usageMap[key] = {
      from: cleanFrom,
      to: cleanTo,
      count: existing.count + 1,
      lastUsed: Date.now(),
    };

    localStorage.setItem(KEYS.ROUTE_USAGE, JSON.stringify(usageMap));
  } catch (e) {
    console.error('Error recording route usage:', e);
  }
};

export const getRouteUsageMap = (): Record<string, TrackedRouteUsage> => {
  if (typeof window === 'undefined') return {};
  try {
    const rawMap = localStorage.getItem(KEYS.ROUTE_USAGE);
    return rawMap ? JSON.parse(rawMap) : {};
  } catch {
    return {};
  }
};

export const getLastJourneySearch = (): LastJourneySearch | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEYS.LAST_JOURNEY_SEARCH);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setLastJourneySearch = (search: LastJourneySearch): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEYS.LAST_JOURNEY_SEARCH, JSON.stringify(search));
  } catch (e) {
    console.error('Error saving last journey search:', e);
  }
};

