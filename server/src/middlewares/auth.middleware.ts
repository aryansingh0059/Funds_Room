import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { sendError } from '../utils/response';
import prisma from '../config/prisma';

export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Authentication required: missing or invalid authorization header', null, 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      sendError(res, 'Authentication required: token missing', null, 401);
      return;
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      sendError(res, 'Invalid or expired authentication token', null, 401);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      sendError(res, 'User account not found', null, 401);
      return;
    }

    if (!user.isActive) {
      sendError(res, 'User account is deactivated. Contact administrator.', null, 403);
      return;
    }

    req.user = {
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    };

    next();
  } catch (error) {
    sendError(res, 'Authentication internal error', (error as Error).message, 500);
  }
};
