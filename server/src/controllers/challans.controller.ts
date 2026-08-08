import { Request, Response } from 'express';
import { sendSuccess } from '../utils/response';

export const listChallans = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] List sales challans — All roles', { stub: true });
};

export const getChallanById = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] Get challan — All roles', { stub: true });
};

export const createChallan = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] Create challan — ADMIN, SALES', { stub: true }, 201);
};

export const updateChallanStatus = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] Update challan status — ADMIN, WAREHOUSE', { stub: true });
};

export const cancelChallan = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] Cancel challan — ADMIN only', { stub: true });
};
