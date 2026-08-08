import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/requireRole.middleware';
import { ROLES } from '../config/roles';
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/users.controller';

const usersRouter = Router();

// All user management is ADMIN only — no other role may even read the user list
usersRouter.get('/', authenticateJWT, requireRole(...ROLES.ADMIN_ONLY), listUsers);
usersRouter.get('/:id', authenticateJWT, requireRole(...ROLES.ADMIN_ONLY), getUserById);
usersRouter.post('/', authenticateJWT, requireRole(...ROLES.ADMIN_ONLY), createUser);
usersRouter.patch('/:id', authenticateJWT, requireRole(...ROLES.ADMIN_ONLY), updateUser);
usersRouter.delete('/:id', authenticateJWT, requireRole(...ROLES.ADMIN_ONLY), deleteUser);

export default usersRouter;
