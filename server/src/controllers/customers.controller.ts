import { Request, Response } from 'express';
import { sendSuccess } from '../utils/response';

export const listCustomers = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] List customers — All roles', { stub: true });
};

export const getCustomerById = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] Get customer — All roles', { stub: true });
};

export const createCustomer = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] Create customer — ADMIN, SALES', { stub: true }, 201);
};

export const updateCustomer = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] Update customer — ADMIN, SALES', { stub: true });
};

export const deleteCustomer = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] Delete customer — ADMIN only', { stub: true });
};

export const listFollowups = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] List customer followups — ADMIN, SALES, ACCOUNTS', { stub: true });
};

export const createFollowup = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] Create followup — ADMIN, SALES', { stub: true }, 201);
};

export const updateFollowup = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] Update followup — ADMIN, SALES', { stub: true });
};
