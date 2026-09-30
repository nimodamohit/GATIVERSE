import { Request, Response } from 'express';
import { getRoutesService } from '../services/route.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getRoutes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { source, destination } = req.query;

    const routes = await getRoutesService({
      source: typeof source === 'string' ? source : undefined,
      destination: typeof destination === 'string' ? destination : undefined,
    });

    sendSuccess(res, routes, 200);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch railway routes';
    sendError(res, 'INTERNAL_SERVER_ERROR', errMessage, 500);
  }
};

