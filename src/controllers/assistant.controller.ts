import { Request, Response, NextFunction } from 'express';
import { extractFromPrompt, checkOllamaHealth } from '../services/ollama.service';
import { createCustomer, getCustomerByEmail } from '../services/customer.service';
import {
    getConversation,
    upsertConversation,
    clearPendingData,
    generateSessionId,
} from '../services/conversation.service';
import { AssistantRequest, AssistantResponse, CustomerFields } from '../types';
import { createError } from '../middleware/error.middleware';

// ─── POST /api/assistant ──────────────────────────────────────────────────────

export async function handleAssistantPrompt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { prompt, sessionId: incomingSessionId } = req.body as AssistantRequest;

        // Use existing session or generate a new one
        const sessionId = incomingSessionId || generateSessionId();

        // Load conversation history (last prompt + any pending partial data)
        const conversation = getConversation(sessionId);
        const pendingData = conversation?.pendingData ?? null;

        // ── Step 1: Send prompt + context to Ollama ──────────────────────────────
        const extracted = await extractFromPrompt(prompt.trim(), pendingData);

        // ── Step 2: Route by intent ───────────────────────────────────────────────
        let responseMessage = '';
        let newPendingData: CustomerFields | null = null;

        switch (extracted.intent) {

            // ── User confirms a pending create operation ───────────────────────────
            case 'confirm': {
                if (!pendingData) {
                    responseMessage =
                        "I don't have any pending details to confirm. Please start by providing the customer information.";
                    break;
                }

                const missing = getMissingCustomerFields(pendingData);
                if (missing.length > 0) {
                    responseMessage = `I still need the following before I can proceed: ${formatList(missing)}.`;
                    newPendingData = pendingData;
                    break;
                }

                // Check for duplicate email
                const existing = getCustomerByEmail(pendingData.email!);
                if (existing) {
                    responseMessage =
                        `A customer with the email ${pendingData.email} already exists (ID: ${existing.id}). ` +
                        `No new record was created.`;
                    break;
                }

                const created = createCustomer(pendingData as Required<CustomerFields>);
                responseMessage =
                    `Customer created successfully!\n\n` +
                    `- ID:       ${created.id}\n` +
                    `- Name:     ${created.name}\n` +
                    `- Email:    ${created.email}\n` +
                    `- Phone:    ${created.phone}\n` +
                    `- Category: ${created.categoryId}`;
                break;
            }

            // ── User cancels ───────────────────────────────────────────────────────
            case 'deny': {
                responseMessage = "No problem — the operation has been cancelled. How else can I help you?";
                break;
            }

            // ── Create a new customer ──────────────────────────────────────────────
            case 'create_customer': {
                // Merge newly extracted fields with anything collected in previous turns
                const merged: CustomerFields = { ...pendingData, ...stripNulls(extracted.customer) };
                const missing = getMissingCustomerFields(merged);

                if (missing.length > 0) {
                    responseMessage = `I need a few more details. Please provide: ${formatList(missing)}.`;
                    newPendingData = merged;
                    break;
                }

                // All fields present — ask for explicit confirmation before writing to DB
                const c = merged as Required<CustomerFields>;
                responseMessage =
                    `Would you like me to create a customer with these details?\n\n` +
                    `- Name:     ${c.name}\n` +
                    `- Email:    ${c.email}\n` +
                    `- Phone:    ${c.phone}\n` +
                    `- Category: ${c.categoryId}\n\n` +
                    `Reply "Yes" to confirm or "No" to cancel.`;
                newPendingData = merged;
                break;
            }

            // ── Query customers ────────────────────────────────────────────────────
            case 'query_customer': {
                responseMessage =
                    'To retrieve customers use:\n\n' +
                    '  GET /api/customers            — all customers\n' +
                    '  GET /api/customers?search=X   — filter by name, email or phone\n' +
                    '  GET /api/customers/:id        — single customer by ID';
                break;
            }

            // ── Create user (via auth endpoints) ───────────────────────────────────
            case 'create_user': {
                responseMessage =
                    'To create a user account use:\n\n' +
                    '  POST /api/auth/register\n' +
                    '  Body: { "username": "...", "email": "...", "password": "..." }';
                break;
            }

            // ── Query users ────────────────────────────────────────────────────────
            case 'query_user': {
                responseMessage =
                    'To retrieve users use:\n\n' +
                    '  GET /api/users            — all users (requires Bearer token)\n' +
                    '  GET /api/users?search=X   — filter by username or email\n' +
                    '  GET /api/users/:id        — single user by ID';
                break;
            }

            // ── Fallback ───────────────────────────────────────────────────────────
            default: {
                responseMessage =
                    "I'm not sure what you'd like to do. Here's what I can help with:\n\n" +
                    '- Create a customer: "Add customer John Doe, email john@example.com, phone 08012345678, category sales"\n' +
                    '- Query customers:   "Show me all customers"\n' +
                    '- Create a user:     "Register user jane with email jane@example.com"\n' +
                    '- Query users:       "List all users"';
                break;
            }
        }

        // ── Step 3: Persist conversation ─────────────────────────────────────────
        if (newPendingData === null) {
            clearPendingData(sessionId);
        }
        upsertConversation(sessionId, prompt.trim(), responseMessage, newPendingData);

        const response: AssistantResponse = { message: responseMessage, sessionId };
        res.status(200).json({ success: true, data: response });
    } catch (err) {
        // Give a useful 503 when Ollama is unreachable instead of a generic 500
        if (isAxiosConnectionError(err)) {
            return next(createError('Could not reach the Ollama service. Make sure Ollama is running and OLLAMA_BASE_URL is correct.', 503));
        }
        
        // Handle specific errors returned by Ollama (e.g., out of memory)
        const axiosErr = err as any;
        if (axiosErr.response?.data?.error) {
            return next(createError(`Ollama Error: ${axiosErr.response.data.error}`, 502));
        }

        next(err);
    }
}

// ─── Startup Ollama health check ─────────────────────────────────────────────

export async function warnIfOllamaUnreachable(): Promise<void> {
    const healthy = await checkOllamaHealth();
    if (!healthy) {
        console.warn(
            `\n  Ollama is not reachable at ${process.env.OLLAMA_BASE_URL}.\n` +
            `   The /api/assistant endpoint will return 503 until Ollama is running.\n` +
            `   Start it with: ollama serve\n`
        );
    } else {
        console.info(
            ` Ollama reachable at ${process.env.OLLAMA_BASE_URL} (model: ${process.env.OLLAMA_MODEL})`
        );
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMissingCustomerFields(fields: CustomerFields): string[] {
    const required: (keyof CustomerFields)[] = ['name', 'email', 'phone', 'categoryId'];
    return required.filter((f) => !fields[f]);
}

function formatList(items: string[]): string {
    return items.join(', ');
}

function stripNulls(obj?: CustomerFields): CustomerFields {
    if (!obj) return {};
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null && v !== '')) as CustomerFields;
}

function isAxiosConnectionError(err: unknown): boolean {
    return (typeof err === 'object' && err !== null && 'isAxiosError' in err && (err as { response?: unknown }).response === undefined);
}