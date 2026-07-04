-- Run this once in your Supabase project's SQL Editor.
-- Free tier is enough for MVP-scale usage.

create table if not exists usage_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  channel text,
  complaint_length int,
  issue_category text,
  urgency_level text,
  legal_threat boolean,
  viral_risk boolean,
  safety_concern boolean,
  vip_flag boolean,
  had_error boolean default false,
  error_message text
);

-- Row Level Security: block all public access. Only the service_role key
-- (used server-side in your edge functions) can read/write this table.
alter table usage_logs enable row level security;
