// Uses Node 22's built-in SQLite (node:sqlite) — no external binary needed
// Run with: NODE_OPTIONS="--experimental-sqlite" node ...

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — node:sqlite is experimental; types not yet in @types/node
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') ?? './dev.db';
const resolvedPath = path.resolve(DB_PATH);

// Ensure parent directory exists
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

export const db = new DatabaseSync(resolvedPath);

export function initDb(): void {
    db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      phone       TEXT NOT NULL,
      category_id TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id         TEXT PRIMARY KEY,
      username   TEXT NOT NULL UNIQUE,
      email      TEXT NOT NULL UNIQUE,
      password   TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id            TEXT PRIMARY KEY,
      session_id    TEXT NOT NULL UNIQUE,
      last_prompt   TEXT NOT NULL,
      last_response TEXT NOT NULL,
      pending_data  TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
    console.info('Database initialised at', resolvedPath);
}
