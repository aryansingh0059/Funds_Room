import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/requireRole.middleware';
import { ROLES } from '../config/roles';
import {
  listChallans,
  getChallanById,
  createChallan,
  updateChallan,
  updateChallanStatus,
  cancelChallan,
} from '../controllers/challans.controller';

const challansRouter = Router();

// Challan reads: all roles can view challans
challansRouter.get('/', authenticateJWT, requireRole(...ROLES.ALL), listChallans);
challansRouter.get('/:id', authenticateJWT, requireRole(...ROLES.ALL), getChallanById);

// Challan creation & draft editing: ADMIN + SALES (WAREHOUSE & ACCOUNTS cannot create)
challansRouter.post(
  '/',
  authenticateJWT,
  requireRole(...ROLES.ADMIN_SALES),
  createChallan,
);
challansRouter.patch(
  '/:id',
  authenticateJWT,
  requireRole(...ROLES.ADMIN_SALES),
  updateChallan,
);

// Challan status update (approve/dispatch): ADMIN + WAREHOUSE
challansRouter.patch(
  '/:id/status',
  authenticateJWT,
  requireRole(...ROLES.ADMIN_WAREHOUSE),
  updateChallanStatus,
);

// Challan cancellation: ADMIN only
challansRouter.patch(
  '/:id/cancel',
  authenticateJWT,
  requireRole(...ROLES.ADMIN_ONLY),
  cancelChallan,
);

export default challansRouter;
