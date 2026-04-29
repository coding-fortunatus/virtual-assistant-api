import { Request, Response, NextFunction } from 'express';
import { getAllUsers, getUserById, searchUsers } from '../services/user.service';
import { createError } from '../middleware/error.middleware';

// ─── GET /api/users ───────────────────────────────────────────────────────────

export function getUsers(req: Request, res: Response, next: NextFunction): void {
    try {
        const { search } = req.query;

        const users = search ? searchUsers(String(search)) : getAllUsers();

        res.status(200).json({ success: true, count: users.length, data: users, });
    } catch (err) {
        next(err);
    }
}

// ─── GET /api/users/:id ───────────────────────────────────────────────────────

export function getUser(req: Request, res: Response, next: NextFunction): void {
    try {
        const { id } = req.params;
        const user = getUserById(String(id));

        if (!user) {
            return next(createError(`User with ID ${id} not found`, 404));
        }

        res.status(200).json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
}