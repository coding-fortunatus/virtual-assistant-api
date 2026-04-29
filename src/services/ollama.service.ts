import axios from 'axios';
import { CustomerFields, ExtractedData } from '../types';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:latest';

// ─── Prompt Templates ────────────────────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `
You are a virtual assistant that helps create and query customers and users.
Your job is to extract structured data from the user's free-text input.

You MUST respond ONLY with a valid JSON object — no explanation, no markdown, no extra text.

The JSON must follow this exact shape:
{
  "intent": "<one of: create_customer | query_customer | create_user | query_user | confirm | deny | unknown>",
  "customer": {
    "name": "<string or null>",
    "email": "<string or null>",
    "phone": "<string or null>",
    "categoryId": "<string or null>"
  },
  "missingFields": ["<list of missing required field names>"],
  "rawMessage": "<optional clarifying message to show the user>"
}

Rules:
- intent "confirm" means the user said yes/okay/proceed to a previous confirmation prompt.
- intent "deny" means the user said no/cancel/stop.
- intent "create_customer" requires: name, email, phone, categoryId.
- intent "create_user" requires: username, email, password.
- If a required field is missing, include it in "missingFields".
- For phone numbers, preserve the original format (e.g. 08012345678).
- For categoryId, accept any string (UUID or label like "sales", "support").
- Never invent data that was not provided by the user.
`.trim();

const buildExtractionPrompt = (userPrompt: string, pendingData?: CustomerFields | null): string => {
    let prompt = userPrompt;

    if (pendingData) {
        prompt = `Context: The user previously started creating a customer with these partial details:
        ${JSON.stringify(pendingData, null, 2)}

        New user message: "${userPrompt}"

        Merge any new information from the message with the existing context above.`.trim();
    }

    return prompt;
};

// ─── Ollama API Call ──────────────────────────────────────────────────────────

async function callOllama(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await axios.post(
        `${OLLAMA_BASE_URL}/api/chat`,
        {
            model: OLLAMA_MODEL,
            stream: false,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
        },
        { timeout: 30000 }
    );

    return response.data?.message?.content ?? '';
}

// ─── Parse LLM Response ───────────────────────────────────────────────────────

function parseExtractedData(raw: string): ExtractedData {
    try {
        // Strip any accidental markdown fences the model might add
        const cleaned = raw.replace(/```json|```/gi, '').trim();
        const parsed = JSON.parse(cleaned);

        // Normalise missingFields: compute it ourselves to be safe
        const customer: CustomerFields = {
            name: parsed.customer?.name || undefined,
            email: parsed.customer?.email || undefined,
            phone: parsed.customer?.phone || undefined,
            categoryId: parsed.customer?.categoryId || undefined,
        };

        const REQUIRED: (keyof CustomerFields)[] = ['name', 'email', 'phone', 'categoryId'];
        const missingFields =
            parsed.intent === 'create_customer' ? REQUIRED.filter((f) => !customer[f]) : (parsed.missingFields ?? []);

        return {
            intent: parsed.intent ?? 'unknown',
            customer,
            missingFields,
            rawMessage: parsed.rawMessage,
        };
    } catch {
        // If the model hallucinated non-JSON, return unknown intent
        return {
            intent: 'unknown',
            missingFields: [],
            rawMessage: raw,
        };
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function extractFromPrompt(userPrompt: string, pendingData?: CustomerFields | null): Promise<ExtractedData> {
    const builtPrompt = buildExtractionPrompt(userPrompt, pendingData ?? null);
    const raw = await callOllama(EXTRACTION_SYSTEM_PROMPT, builtPrompt);
    return parseExtractedData(raw);
}

export async function checkOllamaHealth(): Promise<boolean> {
    try {
        await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 5000 });
        return true;
    } catch {
        return false;
    }
}
