import { Router } from 'express';
import healthRouter from './health.routes';
import authRouter from './auth.routes';

const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);

export default apiRouter;
