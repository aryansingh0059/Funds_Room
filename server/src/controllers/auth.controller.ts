import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { loginSchema } from '../validations/auth.validation';
import { comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issueMessage = parseResult.error.errors.map((e) => e.message).join(', ');
      sendError(res, issueMessage, parseResult.error.format(), 400);
      return;
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      sendError(res, 'Invalid email or password', null, 401);
      return;
    }

    if (!user.isActive) {
      sendError(res, 'User account is deactivated. Contact administrator.', null, 403);
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      sendError(res, 'Invalid email or password', null, 401);
      return;
    }

    const token = signToken({
      userId: user.id,
      role: user.role,
    });

    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    sendSuccess(
      res,
      'Login successful',
      {
        token,
        user: userResponse,
      },
      200,
    );
  } catch (error) {
    sendError(res, 'Login processing error', (error as Error).message, 500);
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.userId) {
      sendError(res, 'Unauthorized request: missing user context', null, 401);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      sendError(res, 'User profile not found', null, 404);
      return;
    }

    sendSuccess(res, 'User profile retrieved successfully', { user }, 200);
  } catch (error) {
    sendError(res, 'Failed to fetch user profile', (error as Error).message, 500);
  }
};
