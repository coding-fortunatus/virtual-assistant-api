interface RequiredEnvVar {
    key: string;
    description: string;
}

const REQUIRED_VARS: RequiredEnvVar[] = [
    { key: 'JWT_SECRET', description: 'Secret key for signing JWT tokens' },
    { key: 'OLLAMA_BASE_URL', description: 'Base URL for the Ollama API (e.g. http://localhost:11434)' },
    { key: 'OLLAMA_MODEL', description: 'Ollama model to use (e.g. llama3.2:latest)' },
    { key: 'DATABASE_URL', description: 'SQLite file path (e.g. file:./dev.db)' },
];

export function validateEnv(): void {
    const missing: string[] = [];

    for (const { key, description } of REQUIRED_VARS) {
        if (!process.env[key]) {
            missing.push(`  - ${key}: ${description}`);
        }
    }

    if (missing.length > 0) {
        console.error('\n Missing required environment variables:\n');
        missing.forEach((m) => console.error(m));
        console.error('\nCopy .env.example to .env and fill in the values.\n');
        process.exit(1);
    }

    // Warn if JWT_SECRET looks like the default placeholder
    if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
        console.warn('  Warning: JWT_SECRET is still the default placeholder. Change it before deploying.');
    }

    console.log(' Environment variables validated');
}