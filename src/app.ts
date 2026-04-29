import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
// Load env first — before anything else reads process.env
import { validateEnv } from './validators/env';
import { initDb } from './utils/db';
import { warnIfOllamaUnreachable } from './controllers/assistant.controller';
import apiRoutes from './routes/api.routes';
import { errorHandler } from './middleware/error.middleware';

// ── Startup checks ────────────────────────────────────────────────────────────
validateEnv();   // exits with helpful message if required vars are missing
initDb();        // creates SQLite tables if they don't exist

// Non-blocking Ollama reachability check
warnIfOllamaUnreachable();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

export default app;