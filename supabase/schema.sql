-- Ejecutar en: Supabase Dashboard > SQL Editor > New query > Run
-- Crea la tabla que guarda el estado completo de la app (1 fila por usuario)
-- y activa RLS para que cada usuario solo pueda leer/escribir su propia fila.

create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

create policy "select own state"
  on public.app_state for select
  using (auth.uid() = user_id);

create policy "insert own state"
  on public.app_state for insert
  with check (auth.uid() = user_id);

create policy "update own state"
  on public.app_state for update
  using (auth.uid() = user_id);
