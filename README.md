# Your Rhythm

A Next.js (React + TypeScript) implementation of the Your Rhythm habit/protocol coach. The UI mirrors the provided mockups and persists data to a free Supabase (hosted Postgres) backend so it can be deployed easily on Vercel. The backup/download feature is intentionally omitted per request.

## Features
- Protocol overview with streak, progress bar, and day completion summary
- Habit list grouped by tier (base/floor/bonus) with completion toggles
- Add new habits with Supabase-backed persistence keyed to an anonymous session id
- Calendar and system/rules views plus a placeholder Coach panel
- Hard reset control that clears Supabase records for the current session

## Running locally
1. Install dependencies

```bash
npm install
```

2. Create a Supabase project (free tier is fine) and add the following tables via SQL:

```sql
create table protocols (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  name text not null,
  status text default 'active',
  day_number int default 1,
  total_days int default 30,
  streak int default 1,
  theme text default 'system',
  created_at timestamptz default now()
);

create table habits (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  protocol_id uuid references protocols(id) on delete cascade,
  name text not null,
  tier text default 'base',
  completed boolean default false,
  created_at timestamptz default now()
);

create index on protocols(session_id);
create index on habits(session_id);
```

3. Copy `.env.example` to `.env.local` and add your Supabase details:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000 to view the app.

## Deploying to Vercel
- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as project environment variables
- Deploy normally with the Vercel dashboard or `vercel --prod`
- The UI uses client-side Supabase calls and requires no extra serverless functions

## Notes
- If Supabase env vars are missing, the app falls back to demo data so the UI still works.
- A lightweight session id is stored in `localStorage` to scope Supabase rows per visitor; removing site data will create a new session with fresh rows.
