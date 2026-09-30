import { Response } from 'express';

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export const sendSuccess = <T>(res: Response, data: T, statusCode = 200): Response => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};


export const sendError = (
  res: Response,
  code: string,
  message: string,
  statusCode = 400
): Response => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
};
