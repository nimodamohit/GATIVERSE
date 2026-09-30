import { Request, Response } from 'express';
import { getHealthStatus } from '../services/health.service.js';
import { sendSuccess } from '../utils/response.js';

export const getHealth = (_req: Request, res: Response): void => {
  const healthInfo = getHealthStatus();
  sendSuccess(res, healthInfo, 200);
};
