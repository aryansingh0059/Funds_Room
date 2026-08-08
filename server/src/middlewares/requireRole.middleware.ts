import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { sendError } from '../utils/response';

/**
 * Middleware factory: requires the authenticated user to have one of the
 * specified roles. Must be used AFTER authenticateJWT.
 *
 * Returns 403 Forbidden (with standard envelope) if the user's role is
 * not in the allowed list. ADMIN always passes.
 */
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', null, 401);
      return;
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      sendError(
        res,
        `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${userRole}`,
        null,
        403,
      );
      return;
    }

    next();
  };
};
