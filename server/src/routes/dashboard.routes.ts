import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { ROLES } from '../config/roles';
import { requireRole } from '../middlewares/requireRole.middleware';
import { getDashboard } from '../controllers/dashboard.controller';

const dashboardRouter = Router();

// All 4 roles can view the dashboard
dashboardRouter.get(
  '/dashboard',
  authenticateJWT,
  requireRole(...ROLES.ALL),
  getDashboard,
);

export default dashboardRouter;
