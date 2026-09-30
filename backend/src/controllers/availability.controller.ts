import { Request, Response } from 'express';
import { getAvailabilityService } from '../services/availability.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trainNumber, source, destination, journeyDate } = req.query;

    const results = await getAvailabilityService({
      trainNumber: typeof trainNumber === 'string' ? trainNumber : undefined,
      source: typeof source === 'string' ? source : undefined,
      destination: typeof destination === 'string' ? destination : undefined,
      journeyDate: typeof journeyDate === 'string' ? journeyDate : undefined,
    });

    sendSuccess(res, results, 200);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch seat availability';
    sendError(res, 'INTERNAL_SERVER_ERROR', errMessage, 500);
  }
};

