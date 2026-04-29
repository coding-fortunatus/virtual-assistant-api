import { db } from '../utils/db';

export interface User {
    id: string;
    username: string;
    email: string;
    createdAt: string;
    updatedAt: string;
}

interface RawUser {
    id: string;
    username: string;
    email: string;
    password: string;
    created_at: string;
    updated_at: string;
}

// Strip password before returning to callers
function mapRow(row: RawUser): User {
    return {
        id: row.id,
        username: row.username,
        email: row.email,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export function getAllUsers(): User[] {
    const stmt = db.prepare(`
    SELECT id, username, email, created_at, updated_at
    FROM users
    ORDER BY created_at DESC
  `);
    return (stmt.all() as unknown as RawUser[]).map(mapRow);
}

export function getUserById(id: string): User | null {
    const stmt = db.prepare(`
    SELECT id, username, email, created_at, updated_at
    FROM users WHERE id = ?
  `);
    const row = stmt.get(id) as RawUser | undefined;
    return row ? mapRow(row) : null;
}

export function getUserByEmail(email: string): User | null {
    const stmt = db.prepare(`SELECT id, username, email, created_at, updated_at FROM users WHERE email = ? `);
    const row = stmt.get(email) as RawUser | undefined;
    return row ? mapRow(row) : null;
}

export function searchUsers(query: string): User[] {
    const like = `%${query}%`;
    const stmt = db.prepare(`
    SELECT id, username, email, created_at, updated_at
    FROM users
    WHERE username LIKE ? OR email LIKE ?
    ORDER BY created_at DESC
  `);
    return (stmt.all(like, like) as unknown as RawUser[]).map(mapRow);
}