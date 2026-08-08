import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: unknown;
}

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200,
): Response => {
  const responsePayload: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined ? { data } : {}),
  };
  return res.status(statusCode).json(responsePayload);
};

export const sendError = (
  res: Response,
  message: string,
  error: unknown = null,
  statusCode = 400,
): Response => {
  const responsePayload: ApiResponse = {
    success: false,
    message,
    ...(error !== null && error !== undefined ? { error } : {}),
  };
  return res.status(statusCode).json(responsePayload);
};
