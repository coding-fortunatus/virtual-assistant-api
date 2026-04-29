import { Router } from 'express';
import { getCustomers, getCustomer } from '../controllers/customer.controller';
import { validate } from '../validators/validate.middleware';
import { customerQuerySchema } from '../validators/validators';

const router = Router();

// GET /api/customers?search=
router.get('/', validate(customerQuerySchema, 'query'), getCustomers);
// GET /api/customers/:id
router.get('/:id', getCustomer);

export default router;