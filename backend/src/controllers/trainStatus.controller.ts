import { Request, Response } from 'express';
import { getTrainStatusService } from '../services/trainStatus.service.js';
import { getETAPredictionService } from '../services/etaPrediction.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { railwayDataProvider } from '../providers/index.js';

export const getTrainStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trainNumber } = req.params;

    if (!trainNumber || !trainNumber.trim()) {
      sendError(res, 'INVALID_TRAIN_NUMBER', 'Train number parameter is required', 400);
      return;
    }

    const status = await getTrainStatusService(trainNumber);

    if (!status) {
      sendError(res, 'STATUS_NOT_FOUND', `Train status for ${trainNumber} was not found`, 404);
      return;
    }

    sendSuccess(res, status, 200);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch train status';
    sendError(res, 'INTERNAL_SERVER_ERROR', errMessage, 500);
  }
};

export const getAllLiveTrains = async (req: Request, res: Response): Promise<void> => {
  try {
    const liveStatuses = await railwayDataProvider.getAllLiveStatuses();
    sendSuccess(res, liveStatuses, 200);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch live trains';
    sendError(res, 'INTERNAL_SERVER_ERROR', errMessage, 500);
  }
};

export const getTrainETA = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trainNumber } = req.params;

    if (!trainNumber || !trainNumber.trim()) {
      sendError(res, 'INVALID_TRAIN_NUMBER', 'Train number parameter is required', 400);
      return;
    }

    const etaResult = await getETAPredictionService(trainNumber);

    if (!etaResult) {
      sendError(res, 'PREDICTION_UNAVAILABLE', `AI ETA prediction for train ${trainNumber} is temporarily unavailable`, 503);
      return;
    }

    const modelSource = process.env.ETA_MODEL_SOURCE === 'real-xgboost-v1' ? 'real-railway-telemetry' : 'synthetic-demo';
    const responseBody = {
      prediction: etaResult,
      modelSource,
      modelVersion: etaResult.modelVersion || '1.0.0',
      dataSource: 'real',
      dataAgeSeconds: 0,
      confidence: null, // Uncalibrated statistical confidence returns null per Phase 17 rules
    };

    sendSuccess(res, responseBody, 200);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Failed to generate ETA prediction';
    sendError(res, 'INTERNAL_SERVER_ERROR', errMessage, 500);
  }
};



