# Project Implementation Plan

This document outlines the implementation approach to meet the requested security and observability requirements for the application.

## Authentication and Data Scoping
- Integrate NextAuth.js using passwordless email links (magic links) and optional OAuth providers such as Google. Configure an adapter (e.g., Prisma + PostgreSQL) to persist sessions and verification tokens.
- Require successful authentication for all API routes and pages that access user data. Use Next.js middleware to protect routes and enrich the request with the authenticated `userId` from the session.
- Scope all database queries by `user_id`, and ensure schema indexes on `(user_id, created_at)` for time-series queries.
- Store the user identifier in signed JWT sessions (NextAuth default) and verify it server-side before running any query.

## Encryption of Sensitive Columns
- For health/mood notes and other sensitive free-form text, encrypt before storing:
  - Prefer client-side encryption (e.g., using Web Crypto API with a per-user key derived from a passphrase or device-kept key). Store only ciphertext and required nonces/IVs in the database.
  - Alternatively, use PostgreSQL `pgcrypto` with `pgp_sym_encrypt`/`pgp_sym_decrypt` and rotate the symmetric key via environment variables stored in a secrets manager.
- Add migrations to create encrypted columns and avoid storing plaintext backups. Ensure backups are encrypted at rest (e.g., managed by the cloud provider).
- Implement data access helpers that decrypt on read and strictly redact ciphertext from logs.

## Ingestion Endpoint Safeguards
- Add API route handlers for audio/text ingestion that enforce:
  - Authentication and user scoping (reject unauthenticated requests).
  - Rate limiting using middleware (e.g., Upstash Redis, Vercel KV, or Postgres-based leaky bucket) keyed by `user_id` and IP. Include sensible defaults (e.g., 60 requests/5 minutes) and return HTTP 429 on exhaustion.
  - Payload validation via zod or a similar schema validator:
    - Text: maximum length (e.g., 10,000 characters) and content-type check.
    - Audio: maximum size (e.g., 10 MB), supported MIME types, and duration extraction if available.
  - Streaming uploads should be buffered to a safe limit; reject oversize payloads early.
- Maintain audit logs for rate-limit hits and rejected payloads (without PII).

## Logging and Observability
- Enable Vercel Analytics for page-level metrics and correlate with server logs via request IDs.
- Implement structured server-side logging (e.g., pino) with a transport that removes PII before emission. Redact fields such as emails, notes content, and tokens.
- Include request/response size, user ID (hashed), and timing metadata. Forward logs to a centralized sink (e.g., Logflare, Datadog, or OpenTelemetry collector) with sampling for high-volume endpoints.
- Add health checks for ingestion routes and set up alerts on elevated 4xx/5xx rates or rate-limit saturation.

## Next Steps
1. Scaffold Next.js app with NextAuth.js and database adapter.
2. Add Prisma schema with `User`, `Session`, `Account`, `VerificationToken`, and domain models that reference `user_id`.
3. Implement encryption utilities and update ingestion APIs with validation and rate limiting.
4. Wire structured logging and analytics, ensuring PII scrubbing across all transports.
