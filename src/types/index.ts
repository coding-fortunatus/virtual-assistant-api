export interface CustomerFields {
    name?: string;
    email?: string;
    phone?: string;
    categoryId?: string;
}

export interface ExtractedData {
    intent: | 'create_customer' | 'query_customer' | 'create_user' | 'query_user' | 'confirm' | 'deny' | 'unknown';
    customer?: CustomerFields;
    missingFields?: string[];
    rawMessage?: string;
}

export interface AssistantRequest {
    prompt: string;
    sessionId?: string;
}

export interface AssistantResponse {
    message: string;
    sessionId: string;
    data?: unknown;
}

export interface JwtPayload {
    userId: string;
    email: string;
}

// Re-export validator inferred types for convenience
export type { RegisterInput, LoginInput } from '../validators/validators';