import { Request, Response } from 'express';
import { sendSuccess } from '../utils/response';

export const listUsers = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] List all users — ADMIN only', { stub: true });
};

export const getUserById = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] Get user by ID — ADMIN only', { stub: true });
};

export const createUser = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] Create user — ADMIN only', { stub: true }, 201);
};

export const updateUser = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] Update user — ADMIN only', { stub: true });
};

export const deleteUser = (_req: Request, res: Response): void => {
  sendSuccess(res, '[STUB] Delete user — ADMIN only', { stub: true });
};
