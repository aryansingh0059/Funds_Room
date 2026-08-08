import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/requireRole.middleware';
import { ROLES } from '../config/roles';
import {
  getInventoryOverview,
  getLowStockInventory,
} from '../controllers/inventory.controller';

const inventoryRouter = Router();

// Inventory overview: all roles can view warehouse inventory & low stock
inventoryRouter.get('/', authenticateJWT, requireRole(...ROLES.ALL), getInventoryOverview);
inventoryRouter.get('/low-stock', authenticateJWT, requireRole(...ROLES.ALL), getLowStockInventory);

export default inventoryRouter;
