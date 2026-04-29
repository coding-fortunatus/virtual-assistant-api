# Virtual Assistant API

A RESTful API that integrates with **Ollama** to process natural language input, extract structured customer/user data, and persist records to a SQLite database.

Built with **Node.js**, **Express**, and **TypeScript**.

---

## Table of Contents

- [Requirements](#requirements)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Ollama Setup](#ollama-setup)
- [API Reference](#api-reference)
- [Conversation Flow](#conversation-flow)
- [Authentication](#authentication)
- [Example Requests](#example-requests)

---

## Requirements

- **Node.js v22+** (uses the built-in `node:sqlite` module)
- **Ollama** running locally

---

## Tech Stack

| Layer        | Technology                         |
|--------------|------------------------------------|
| Runtime      | Node.js 22                         |
| Framework    | Express.js                         |
| Language     | TypeScript                         |
| Database     | SQLite via Node 22 `node:sqlite`   |
| LLM          | Ollama (local)                     |
| Validation   | Zod                                |
| Auth         | JWT (jsonwebtoken + bcryptjs)      |

---

## Project Structure

```
src/
├── controllers/
│   ├── assistant.controller.ts   # Conversation state machine
│   ├── auth.controller.ts        # Register, login, me
│   ├── customer.controller.ts    # GET customers
│   └── user.controller.ts        # GET users
├── services/
│   ├── ollama.service.ts         # Ollama API calls & prompt engineering
│   ├── customer.service.ts       # Customer DB operations
│   ├── conversation.service.ts   # Session & pending data management
│   └── user.service.ts           # User DB operations
├── routes/
│   ├── api.routes.ts             # Main API router
│   ├── assistant.routes.ts
│   ├── auth.routes.ts
│   ├── customer.routes.ts
│   └── user.routes.ts
├── middleware/
│   ├── auth.middleware.ts        # JWT guard
│   └── error.middleware.ts       # Global error handler
├── validators/
│   ├── env.ts                    # Startup environment validation
│   ├── validate.middleware.ts    # Zod request validation
│   └── validators.ts             # Zod schemas
├── utils/
│   └── db.ts                     # SQLite connection & schema init
├── types/
│   └── index.ts                  # Shared TypeScript types
├── app.ts
└── server.ts
```

---

## Getting Started

### 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd virtual-assistant-api
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and update the values (see [Environment Variables](#environment-variables)).

### 3. Start Ollama

Make sure Ollama is installed and running. See [Ollama Setup](#ollama-setup).

### 4. Run the development server

```bash
npm run dev
```

The server starts at `http://localhost:3000`.

### 5. Build for production

```bash
npm run build
npm start
```

---

## Environment Variables

| Variable          | Required | Default                        | Description                                 |
|-------------------|----------|--------------------------------|---------------------------------------------|
| `PORT`            | No       | `3000`                         | Port the server listens on                  |
| `DATABASE_URL`    | Yes      | `file:./dev.db`                | SQLite file path                            |
| `OLLAMA_BASE_URL` | Yes      | `http://localhost:11434`       | Base URL of your Ollama instance            |
| `OLLAMA_MODEL`    | Yes      | `llama3.2`                     | Ollama model to use for extraction          |
| `JWT_SECRET`      | Yes      | *(must be set)*                | Secret used to sign JWT tokens              |
| `JWT_EXPIRES_IN`  | No       | `7d`                           | JWT expiry duration                         |
| `NODE_ENV`        | No       | `development`                  | `development` or `production`               |

> ⚠️ The server will **exit on startup** if any required variable is missing.

---

## Ollama Setup

### Install Ollama

Visit [https://ollama.com](https://ollama.com) and follow the install instructions for your OS.

### Pull the model

```bash
ollama pull llama3.2
```

### Start the Ollama server

```bash
ollama serve
```

Ollama runs on `http://localhost:11434` by default.

### Using a different model

Update `OLLAMA_MODEL` in your `.env` file to any model you have pulled, e.g.:

```
OLLAMA_MODEL=mistral
OLLAMA_MODEL=llama3.1
OLLAMA_MODEL=gemma2
```

---

## API Reference

### Health Check

```
GET /health
```

**Response:**
```json
{ "status": "ok", "timestamp": "2026-04-28T10:00:00.000Z" }
```

---

### Assistant

#### `POST /api/assistant`

Accepts a free-text prompt, processes it via Ollama, and returns the assistant's response. Handles multi-turn conversation via `sessionId`.

**Request body:**
```json
{
  "prompt": "Add customer John Doe, email john@example.com, phone 08012345678, category sales",
  "sessionId": "optional-uuid-from-previous-response"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Would you like me to create a customer with these details?\n...",
    "sessionId": "a1b2c3d4-..."
  }
}
```

> **Important:** Always pass back the `sessionId` from the previous response in follow-up messages so the assistant can remember context.

---

### Customers

#### `GET /api/customers`

Returns all customers. Optionally filter by name, email, or phone.

| Query param | Type   | Description              |
|-------------|--------|--------------------------|
| `search`    | string | Filter across name/email/phone |

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "08012345678",
      "categoryId": "sales",
      "createdAt": "2026-04-28T10:00:00.000Z",
      "updatedAt": "2026-04-28T10:00:00.000Z"
    }
  ]
}
```

#### `GET /api/customers/:id`

Returns a single customer by ID.

---

### Users

All user endpoints require a valid `Authorization: Bearer <token>` header.

#### `GET /api/users`

Returns all users (passwords excluded).

| Query param | Type   | Description                     |
|-------------|--------|---------------------------------|
| `search`    | string | Filter by username or email     |

#### `GET /api/users/:id`

Returns a single user by ID.

---

### Authentication

#### `POST /api/auth/register`

**Request body:**
```json
{
  "username": "fortunatus",
  "email": "fortunatus@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "uuid",
    "username": "fortunatus",
    "email": "fortunatus@example.com",
    "token": "eyJhbGci..."
  }
}
```

#### `POST /api/auth/login`

**Request body:**
```json
{
  "email": "fortunatus@example.com",
  "password": "securepassword"
}
```

#### `GET /api/auth/me`

Returns the currently authenticated user. Requires `Authorization: Bearer <token>`.

---

## Conversation Flow

The assistant uses a **session-based state machine** to handle multi-turn conversations.

```
User prompt
    │
    ▼
Ollama extracts intent + fields
    │
    ├─► create_customer
    │       │
    │       ├─ Missing fields? → Ask user for missing info (saves partial data)
    │       │
    │       └─ All fields present? → Ask for confirmation
    │               │
    │               ├─ User says "Yes" (confirm) → Create record in DB
    │               └─ User says "No"  (deny)    → Cancel, clear session
    │
    ├─► query_customer / query_user → Return endpoint guidance
    ├─► create_user                 → Return registration endpoint
    └─► unknown                     → Return help message
```

**Session persistence:** The last prompt, response, and any partially collected fields are stored per `sessionId`. On the next request with the same `sessionId`, the assistant merges the new input with previously collected data.

---

## Example Requests

### Full customer creation flow (with missing fields)

**Turn 1 — partial info:**
```bash
curl -X POST http://localhost:3000/api/assistant \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a customer called Jane Smith, email jane@example.com"}'
```
```json
{
  "data": {
    "message": "I need a few more details. Please provide: phone, categoryId.",
    "sessionId": "abc-123"
  }
}
```

**Turn 2 — provide missing fields:**
```bash
curl -X POST http://localhost:3000/api/assistant \
  -H "Content-Type: application/json" \
  -d '{"prompt": "phone is 08098765432, category is support", "sessionId": "abc-123"}'
```
```json
{
  "data": {
    "message": "Would you like me to create a customer with these details?\n- Name: Jane Smith\n- Email: jane@example.com\n- Phone: 08098765432\n- Category: support\n\nReply \"Yes\" to confirm or \"No\" to cancel.",
    "sessionId": "abc-123"
  }
}
```

**Turn 3 — confirm:**
```bash
curl -X POST http://localhost:3000/api/assistant \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Yes", "sessionId": "abc-123"}'
```
```json
{
  "data": {
    "message": "Customer created successfully!\n- ID: uuid\n- Name: Jane Smith\n...",
    "sessionId": "abc-123"
  }
}
```

### Register and use JWT

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "fortunatus", "email": "me@example.com", "password": "secret123"}'

# Use the token to fetch users
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer <token>"
```

---

## Notes

- **JWT authentication** is implemented as a bonus on the `/api/users` and `/api/auth/me` endpoints.
- The assistant endpoint (`POST /api/assistant`) is intentionally **public** so it can be tested without auth overhead.
- The database file (`dev.db`) is created automatically in the project root on first run.
- This project uses **Node 22's built-in `node:sqlite`** (experimental) instead of a native ORM binary, which means zero OS-level compilation is required.