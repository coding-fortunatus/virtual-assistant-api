import { Router } from 'express';
import { handleAssistantPrompt } from '../controllers/assistant.controller';
import { validate } from '../validators/validate.middleware';
import { assistantRequestSchema } from '../validators/validators';

const router = Router();

// POST /api/assistant
router.post('/', validate(assistantRequestSchema), handleAssistantPrompt);

export default router;