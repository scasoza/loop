# Your Rhythm

A Next.js (React + TypeScript) implementation of the Your Rhythm habit/protocol coach. The UI mirrors the provided mockups and persists data to a free Supabase (hosted Postgres) backend so it can be deployed easily on Vercel. The backup/download feature is intentionally omitted per request.

## Features
- Protocol overview with streak, progress bar, and day completion summary
- Habit list grouped by tier (base/floor/bonus) with completion toggles
- Add new habits with Supabase-backed persistence keyed to an anonymous session id
- Habit history stored per day (so completions persist beyond “today”)
- Adjustable tracking periods (30/45/60 days) to recommit to a block of habits
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
  start_date date default now(),
  end_date date default (now() + interval '29 days'),
  created_at timestamptz default now()
);

create table habits (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  protocol_id uuid references protocols(id) on delete cascade,
  name text not null,
  tier text default 'base',
  created_at timestamptz default now()
);

create table habit_entries (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  protocol_id uuid references protocols(id) on delete cascade,
  habit_id uuid references habits(id) on delete cascade,
  entry_date date not null,
  completed boolean default false,
  inserted_at timestamptz default now(),
  unique (session_id, habit_id, entry_date)
);

create index on protocols(session_id);
create index on habits(session_id);
create index on habit_entries(session_id);
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

### Supabase setup cheatsheet
- In the [Supabase dashboard](https://supabase.com/), create a new project (free tier works).
- Visit **Table editor → New query** and paste the SQL above to create tables.
- Copy the project URL and anon key from **Project Settings → API** and set them in `.env.local` / Vercel env vars.
- If you want to start fresh, use the in-app “Hard reset” button to delete the current session’s rows.

## Deploying to Vercel
- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as project environment variables
- Deploy normally with the Vercel dashboard or `vercel --prod`
- The UI uses client-side Supabase calls and requires no extra serverless functions

## Notes
- If Supabase env vars are missing, the app falls back to demo data so the UI still works.
- A lightweight session id is stored in `localStorage` to scope Supabase rows per visitor; removing site data will create a new session with fresh rows.
