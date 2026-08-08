import { Request, Response } from 'express';
import { sendSuccess } from '../utils/response';

export const getDashboard = (_req: Request, res: Response): void => {
  sendSuccess(res, 'Dashboard data retrieved', {
    stub: true,
    message: 'Dashboard metrics coming in a future phase',
  });
};
