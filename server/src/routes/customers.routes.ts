import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/requireRole.middleware';
import { ROLES } from '../config/roles';
import {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  listFollowups,
  createFollowup,
  updateFollowup,
} from '../controllers/customers.controller';

const customersRouter = Router();

// Customer reads: all roles
customersRouter.get('/', authenticateJWT, requireRole(...ROLES.ALL), listCustomers);
customersRouter.get('/:id', authenticateJWT, requireRole(...ROLES.ALL), getCustomerById);

// Customer writes: ADMIN + SALES only
customersRouter.post('/', authenticateJWT, requireRole(...ROLES.ADMIN_SALES), createCustomer);
customersRouter.patch(
  '/:id',
  authenticateJWT,
  requireRole(...ROLES.ADMIN_SALES),
  updateCustomer,
);

// Customer delete: ADMIN only
customersRouter.delete(
  '/:id',
  authenticateJWT,
  requireRole(...ROLES.ADMIN_ONLY),
  deleteCustomer,
);

// Followup reads: ADMIN, SALES, ACCOUNTS (WAREHOUSE cannot see follow-ups)
customersRouter.get(
  '/:id/followups',
  authenticateJWT,
  requireRole(...ROLES.NO_WAREHOUSE),
  listFollowups,
);

// Followup creates & updates: ADMIN + SALES
customersRouter.post(
  '/:id/followups',
  authenticateJWT,
  requireRole(...ROLES.ADMIN_SALES),
  createFollowup,
);
customersRouter.patch(
  '/:id/followups/:followupId',
  authenticateJWT,
  requireRole(...ROLES.ADMIN_SALES),
  updateFollowup,
);

export default customersRouter;
