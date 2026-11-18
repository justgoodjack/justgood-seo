-- Remembers which stock photos were already shown for a draft, so "try another" never repeats.
alter table articles add column if not exists stock_seen text[] not null default '{}';
