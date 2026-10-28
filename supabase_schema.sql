-- Supabase table schema for events

create table if not exists public.events (
  id uuid primary key,
  created_at timestamptz default now(),
  event_type text not null,
  doc_type text,
  language text
);

-- Recommended row-level security and an insert policy for your service role key.
