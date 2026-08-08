import { Router } from 'express';
import { login, getMe } from '../controllers/auth.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const authRouter = Router();

authRouter.post('/auth/login', login);
authRouter.get('/auth/me', authenticateJWT, getMe);

export default authRouter;
