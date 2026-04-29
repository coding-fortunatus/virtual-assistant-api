import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/db';
import { createError } from '../middleware/error.middleware';
import { JwtPayload } from '../types';
import { RegisterInput, LoginInput } from '../validators/validators';

interface UserRow {
    id: string;
    username: string;
    email: string;
    password: string;
    created_at: string;
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { username, email, password } = req.body as RegisterInput;

        const existing = db
            .prepare('SELECT id FROM users WHERE email = ? OR username = ?')
            .get(email, username) as UserRow | undefined;

        if (existing) {
            return next(createError('A user with that email or username already exists', 409));
        }

        const hashed = await bcrypt.hash(password, 10);
        const id = uuidv4();
        const now = new Date().toISOString();

        db.prepare(
            'INSERT INTO users (id, username, email, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(id, username, email, hashed, now, now);

        const token = signToken({ userId: id, email });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { id, username, email, token },
        });
    } catch (err) {
        next(err);
    }
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { email, password } = req.body as LoginInput;

        const user = db
            .prepare('SELECT * FROM users WHERE email = ?')
            .get(email) as UserRow | undefined;

        if (!user) {
            return next(createError('Invalid credentials', 401));
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return next(createError('Invalid credentials', 401));
        }

        const token = signToken({ userId: user.id, email: user.email });

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: { id: user.id, username: user.username, email: user.email, token },
        });
    } catch (err) {
        next(err);
    }
}

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

export function getMe(req: Request, res: Response, next: NextFunction): void {
    try {
        const { userId } = (req as Request & { user: JwtPayload }).user;

        const user = db
            .prepare('SELECT id, username, email, created_at FROM users WHERE id = ?')
            .get(userId) as UserRow | undefined;

        if (!user) {
            return next(createError('User not found', 404));
        }

        res.status(200).json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signToken(payload: JwtPayload): string {
    return jwt.sign(payload, process.env.JWT_SECRET as string, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    } as jwt.SignOptions);
}