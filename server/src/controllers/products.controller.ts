import { Request, Response } from 'express';
import { sendSuccess } from '../utils/response';

export const listProducts = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] List products — All roles', { stub: true });
};

export const getProductById = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] Get product — All roles', { stub: true });
};

export const createProduct = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] Create product — ADMIN, WAREHOUSE', { stub: true }, 201);
};

export const updateProduct = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] Update product — ADMIN, WAREHOUSE', { stub: true });
};

export const deleteProduct = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] Delete product — ADMIN, WAREHOUSE', { stub: true });
};
