# Loop

Starter Next.js project with Prisma, Vercel configuration, and CI checks.

## Local development

1. Copy `.env.example` to `.env` and adjust values if needed.
2. Start Postgres with Docker Compose:
   ```bash
   docker compose up -d
   ```
3. Install dependencies and generate Prisma client:
   ```bash
   npm install
   npm run prisma:generate
   npm run prisma:migrate:check
   npm run prisma:seed
   ```
4. Run the dev server:
   ```bash
   npm run dev
   ```

The seed script mirrors the production schema and populates a baseline `Project` record when the database is empty.

## CI

GitHub Actions runs linting, type-checking, and Prisma migrate diff validation on pull requests.

## Vercel configuration

- Environment variables are defined via `.env.example` (e.g., `DATABASE_URL`).
- Public assets are cached aggressively at the edge via `next.config.ts` headers.
- API routes run on the Node.js serverless runtime (`src/app/api/health/route.ts`).
- Static pages use Incremental Static Regeneration (`src/app/page.tsx` sets `revalidate = 60`).
- `vercel.json` configures project settings for deployment.
