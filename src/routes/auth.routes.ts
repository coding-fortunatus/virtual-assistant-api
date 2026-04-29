import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../validators/validate.middleware';
import { registerSchema, loginSchema } from '../validators/validators';

const router = Router();

// POST /api/auth/register
router.post('/register', validate(registerSchema), register);
// POST /api/auth/login
router.post('/login', validate(loginSchema), login);
// GET /api/auth/me  (protected)
router.get('/me', authenticate, getMe);

export default router;