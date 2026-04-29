import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/db';
import { CustomerFields } from '../types';

export interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    categoryId: string;
    createdAt: string;
    updatedAt: string;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export function createCustomer(fields: Required<CustomerFields>): Customer {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
    INSERT INTO customers (id, name, email, phone, category_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

    stmt.run(id, fields.name, fields.email, fields.phone, fields.categoryId, now, now);

    return getCustomerById(id) as Customer;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export function getAllCustomers(): Customer[] {
    const stmt = db.prepare(`
    SELECT id, name, email, phone, category_id as categoryId, created_at as createdAt, updated_at as updatedAt
    FROM customers
    ORDER BY created_at DESC
  `);

    return stmt.all() as unknown as Customer[];
}

export function getCustomerById(id: string): Customer | null {
    const stmt = db.prepare(`
    SELECT id, name, email, phone, category_id as categoryId, created_at as createdAt, updated_at as updatedAt
    FROM customers
    WHERE id = ?
  `);

    return (stmt.get(id) as unknown as Customer) ?? null;
}

export function getCustomerByEmail(email: string): Customer | null {
    const stmt = db.prepare(`
    SELECT id, name, email, phone, category_id as categoryId, created_at as createdAt, updated_at as updatedAt
    FROM customers
    WHERE email = ?
  `);

    return (stmt.get(email) as unknown as Customer) ?? null;
}

export function searchCustomers(query: string): Customer[] {
    const like = `%${query}%`;
    const stmt = db.prepare(`
    SELECT id, name, email, phone, category_id as categoryId, created_at as createdAt, updated_at as updatedAt
    FROM customers
    WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?
    ORDER BY created_at DESC
  `);

    return stmt.all(like, like, like) as unknown as Customer[];
}
