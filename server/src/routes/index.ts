import { Router } from 'express';
import healthRouter from './health.routes';
import authRouter from './auth.routes';
import dashboardRouter from './dashboard.routes';
import usersRouter from './users.routes';
import customersRouter from './customers.routes';
import productsRouter from './products.routes';
import stockRouter from './stock.routes';
import challansRouter from './challans.routes';

const apiRouter = Router();

// Public routes
apiRouter.use(healthRouter);

// Auth routes
apiRouter.use(authRouter);

// Protected feature routes
apiRouter.use(dashboardRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/customers', customersRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/stock', stockRouter);
apiRouter.use('/challans', challansRouter);

export default apiRouter;
