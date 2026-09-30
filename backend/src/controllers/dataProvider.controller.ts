import { Request, Response } from 'express';
import { railwayDataProvider } from '../providers/index.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getDataProviderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const providerStatus = await railwayDataProvider.getProviderStatus();
    sendSuccess(res, providerStatus, 200);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Failed to retrieve data provider status';
    sendError(res, 'INTERNAL_SERVER_ERROR', errMessage, 500);
  }
};

export const verifyDataProvider = async (req: Request, res: Response): Promise<void> => {
  try {
    if (typeof railwayDataProvider.verifyConnection === 'function') {
      const verificationResult = await railwayDataProvider.verifyConnection();
      sendSuccess(res, verificationResult, 200);
      return;
    }

    const providerStatus = await railwayDataProvider.getProviderStatus();
    sendSuccess(res, {
      status: 'verified',
      provider: providerStatus.provider,
      liveDataAvailable: providerStatus.available,
      apiEnabled: providerStatus.apiEnabled,
      apiConfigured: providerStatus.apiConfigured,
      verificationTimestamp: new Date().toISOString(),
    }, 200);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Provider verification failed';
    sendError(res, 'VERIFICATION_ERROR', errMessage, 500);
  }
};
