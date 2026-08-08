import { Request, Response } from 'express';
import { sendSuccess } from '../utils/response';

export const listStockMovements = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] List stock movements — All roles', { stub: true });
};

export const createStockMovement = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] Create stock movement — ADMIN, WAREHOUSE', { stub: true }, 201);
};

export const getLowStockAlerts = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] Low stock alerts — All roles', { stub: true });
};
