import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/db';
import { CustomerFields } from '../types';

export interface Conversation {
    id: string;
    sessionId: string;
    lastPrompt: string;
    lastResponse: string;
    pendingData: CustomerFields | null;
    createdAt: string;
    updatedAt: string;
}

interface RawConversation {
    id: string;
    session_id: string;
    last_prompt: string;
    last_response: string;
    pending_data: string | null;
    created_at: string;
    updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapRow(row: RawConversation): Conversation {
    return {
        id: row.id,
        sessionId: row.session_id,
        lastPrompt: row.last_prompt,
        lastResponse: row.last_response,
        pendingData: row.pending_data ? (JSON.parse(row.pending_data) as CustomerFields) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getConversation(sessionId: string): Conversation | null {
    const stmt = db.prepare(`SELECT * FROM conversations WHERE session_id = ?`);
    const row = stmt.get(sessionId) as RawConversation | undefined;
    return row ? mapRow(row) : null;
}

export function upsertConversation(sessionId: string, lastPrompt: string, lastResponse: string, pendingData: CustomerFields | null): Conversation {
    const existing = getConversation(sessionId);
    const now = new Date().toISOString();
    const pendingJson = pendingData ? JSON.stringify(pendingData) : null;

    if (existing) {
        const stmt = db.prepare(`UPDATE conversations SET last_prompt = ?, last_response = ?, pending_data = ?, updated_at = ? WHERE session_id = ?`);
        stmt.run(lastPrompt, lastResponse, pendingJson, now, sessionId);
    } else {
        const id = uuidv4();
        const stmt = db.prepare(`INSERT INTO conversations(id, session_id, last_prompt, last_response, pending_data, created_at, updated_at)
                                VALUES(?, ?, ?, ?, ?, ?, ?)`);
        stmt.run(id, sessionId, lastPrompt, lastResponse, pendingJson, now, now);
    }

    return getConversation(sessionId) as Conversation;
}

export function clearPendingData(sessionId: string): void {
    const stmt = db.prepare(`UPDATE conversations SET pending_data = NULL, updated_at = ? WHERE session_id = ?`);
    stmt.run(new Date().toISOString(), sessionId);
}

export function generateSessionId(): string {
    return uuidv4();
}
