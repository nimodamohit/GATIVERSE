import { Request, Response } from 'express';
import {
  searchTrainsService,
  getTrainByNumberService,
  searchRealTrainsBetweenService,
  searchRealStationsService,
  getRealSeatAvailabilityService,
  getRealFareService,
} from '../services/train.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getTrains = async (req: Request, res: Response): Promise<void> => {
  try {
    const { source, destination, date, trainNumber } = req.query;

    const trains = await searchTrainsService({
      source: typeof source === 'string' ? source : undefined,
      destination: typeof destination === 'string' ? destination : undefined,
      date: typeof date === 'string' ? date : undefined,
      trainNumber: typeof trainNumber === 'string' ? trainNumber : undefined,
    });

    sendSuccess(res, trains, 200);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch trains';
    sendError(res, 'INTERNAL_SERVER_ERROR', errMessage, 500);
  }
};

export const getTrainByNumber = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trainNumber } = req.params;

    if (!trainNumber || !trainNumber.trim()) {
      sendError(res, 'INVALID_TRAIN_NUMBER', 'Train number parameter is required', 400);
      return;
    }

    const train = await getTrainByNumberService(trainNumber);

    if (!train) {
      sendError(res, 'TRAIN_NOT_FOUND', `Train with number ${trainNumber} was not found`, 404);
      return;
    }

    sendSuccess(res, train, 200);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch train details';
    sendError(res, 'INTERNAL_SERVER_ERROR', errMessage, 500);
  }
};

export const searchTrainsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    const to = typeof req.query.to === 'string' ? req.query.to : '';
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const live = req.query.live !== 'false';

    if (!from.trim() || !to.trim()) {
      sendError(res, 'INVALID_STATION', 'From and To station parameters are required', 400);
      return;
    }

    const result = await searchRealTrainsBetweenService(from, to, date, live);

    if (!result.success || !result.data) {
      const err = result.error || { code: 'PROVIDER_UNAVAILABLE', message: 'Real railway search is temporarily unavailable.', statusCode: 503 };
      sendError(res, err.code, err.message, err.statusCode);
      return;
    }

    sendSuccess(res, result.data, 200);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Failed to execute real train search';
    sendError(res, 'INTERNAL_SERVER_ERROR', errMessage, 500);
  }
};

export const searchStationsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    if (!q.trim()) {
      sendSuccess(res, [], 200);
      return;
    }

    const stations = await searchRealStationsService(q);
    sendSuccess(res, stations, 200);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Failed to execute station search';
    sendError(res, 'INTERNAL_SERVER_ERROR', errMessage, 500);
  }
};

export const getSeatAvailabilityController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trainNumber } = req.params;
    const from = typeof req.query.from === 'string' ? req.query.from : (typeof req.query.source === 'string' ? req.query.source : '');
    const to = typeof req.query.to === 'string' ? req.query.to : (typeof req.query.destination === 'string' ? req.query.destination : '');
    const date = typeof req.query.date === 'string' ? req.query.date : (typeof req.query.journeyDate === 'string' ? req.query.journeyDate : '');
    const classCode = typeof req.query.class === 'string' ? req.query.class : (typeof req.query.classCode === 'string' ? req.query.classCode : '3A');
    const quotaCode = typeof req.query.quota === 'string' ? req.query.quota : (typeof req.query.quotaCode === 'string' ? req.query.quotaCode : 'GN');

    if (!trainNumber || !from.trim() || !to.trim() || !date.trim()) {
      sendError(res, 'INVALID_JOURNEY_DETAILS', 'Invalid journey details', 400);
      return;
    }

    const result = await getRealSeatAvailabilityService({
      trainNumber,
      from,
      to,
      date,
      classCode,
      quotaCode,
    });

    if (!result.success || !result.data) {
      const err = result.error || { code: 'PROVIDER_UNAVAILABLE', message: 'Railway provider temporarily unavailable', statusCode: 503 };
      sendError(res, err.code, err.message, err.statusCode);
      return;
    }

    sendSuccess(res, result.data, 200);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch seat availability';
    sendError(res, 'INTERNAL_SERVER_ERROR', errMessage, 500);
  }
};

export const getTrainFareController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trainNumber } = req.params;
    const from = typeof req.query.from === 'string' ? req.query.from : (typeof req.query.source === 'string' ? req.query.source : '');
    const to = typeof req.query.to === 'string' ? req.query.to : (typeof req.query.destination === 'string' ? req.query.destination : '');
    const date = typeof req.query.date === 'string' ? req.query.date : (typeof req.query.journeyDate === 'string' ? req.query.journeyDate : '');
    const classCode = typeof req.query.class === 'string' ? req.query.class : (typeof req.query.classCode === 'string' ? req.query.classCode : '3A');
    const quotaCode = typeof req.query.quota === 'string' ? req.query.quota : (typeof req.query.quotaCode === 'string' ? req.query.quotaCode : 'GN');

    if (!trainNumber || !from.trim() || !to.trim() || !date.trim()) {
      sendError(res, 'INVALID_JOURNEY_DETAILS', 'Invalid journey details', 400);
      return;
    }

    const result = await getRealFareService({
      trainNumber,
      from,
      to,
      date,
      classCode,
      quotaCode,
    });

    if (!result.success || !result.data) {
      const err = result.error || { code: 'PROVIDER_UNAVAILABLE', message: 'Railway provider temporarily unavailable', statusCode: 503 };
      sendError(res, err.code, err.message, err.statusCode);
      return;
    }

    sendSuccess(res, result.data, 200);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch train fare';
    sendError(res, 'INTERNAL_SERVER_ERROR', errMessage, 500);
  }
};



