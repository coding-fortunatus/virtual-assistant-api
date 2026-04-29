import { Router } from 'express';
import assistantRoutes from './assistant.routes';
import customerRoutes from './customer.routes';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';

const ROUTE = Router();

ROUTE.use('/assistant', assistantRoutes);
ROUTE.use('/customers', customerRoutes);
ROUTE.use('/auth', authRoutes);
ROUTE.use('/users', userRoutes);

export default ROUTE;