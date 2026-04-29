import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Returns Express middleware that validates req[part] against the given Zod schema.
 * On failure it responds with 400 and a structured list of field errors.
 * On success it replaces req[part] with the parsed (coerced) value and calls next().
 */
export function validate(schema: ZodSchema, part: RequestPart = 'body') {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req[part]);

        if (!result.success) {
            const errors = formatZodError(result.error);
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors,
            });
            return;
        }

        // Replace with the parsed value so downstream handlers get coerced types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any)[part] = result.data;
        next();
    };
}

function formatZodError(error: ZodError): Record<string, string> {
    return error.errors.reduce((acc, err) => {
        const key = err.path.join('.') || 'value';
        acc[key] = err.message;
        return acc;
    },
        {} as Record<string, string>
    );
}