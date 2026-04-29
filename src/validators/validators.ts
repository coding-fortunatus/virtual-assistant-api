import { z } from 'zod';

// ─── Assistant ────────────────────────────────────────────────────────────────

export const assistantRequestSchema = z.object({
    prompt: z
        .string({ required_error: 'prompt is required' })
        .min(1, 'prompt cannot be empty')
        .max(2000, 'prompt must be under 2000 characters'),
    sessionId: z.string().uuid('sessionId must be a valid UUID').optional(),
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
    username: z
        .string({ required_error: 'username is required' })
        .min(3, 'username must be at least 3 characters')
        .max(50, 'username must be under 50 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'username can only contain letters, numbers and underscores'),
    email: z
        .string({ required_error: 'email is required' })
        .email('invalid email address'),
    password: z
        .string({ required_error: 'password is required' })
        .min(6, 'password must be at least 6 characters')
        .max(100, 'password must be under 100 characters'),
});

export const loginSchema = z.object({
    email: z
        .string({ required_error: 'email is required' })
        .email('invalid email address'),
    password: z
        .string({ required_error: 'password is required' })
        .min(1, 'password cannot be empty'),
});

// ─── Customer query params ────────────────────────────────────────────────────

export const customerQuerySchema = z.object({
    search: z.string().max(100, 'search term must be under 100 characters').optional(),
});

// ─── Types inferred from schemas ─────────────────────────────────────────────

export type AssistantRequestInput = z.infer<typeof assistantRequestSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;