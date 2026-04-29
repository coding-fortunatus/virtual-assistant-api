import { Router } from 'express';
import { getUsers, getUser } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../validators/validate.middleware';
import { customerQuerySchema } from '../validators/validators';

const route = Router();

// All user routes are protected
route.use(authenticate);
// GET /api/users?search=
route.get('/', validate(customerQuerySchema, 'query'), getUsers);
// GET /api/users/:id
route.get('/:id', getUser);

export default route;