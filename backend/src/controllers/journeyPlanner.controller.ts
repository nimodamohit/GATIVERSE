import { Request, Response } from 'express';
import { searchJourneyPlannerService } from '../services/journeyPlanner.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const searchJourneyPlanner = async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to, date, class: classType } = req.query;

    if (!from || typeof from !== 'string' || !from.trim()) {
      sendError(res, 'INVALID_QUERY', 'Origin station (from) is required', 400);
      return;
    }

    if (!to || typeof to !== 'string' || !to.trim()) {
      sendError(res, 'INVALID_QUERY', 'Destination station (to) is required', 400);
      return;
    }

    if (from.trim().toLowerCase() === to.trim().toLowerCase()) {
      sendError(res, 'SAME_STATION', 'Origin and destination cannot be identical', 400);
      return;
    }

    const searchDate = (typeof date === 'string' && date.trim()) ? date.trim() : new Date().toISOString().split('T')[0];

    const results = await searchJourneyPlannerService({
      from: from.trim(),
      to: to.trim(),
      date: searchDate,
      classType: typeof classType === 'string' ? classType.trim() : undefined,
    });

    sendSuccess(res, results, 200);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Failed to search journey planner';
    sendError(res, 'INTERNAL_SERVER_ERROR', errMessage, 500);
  }
};
