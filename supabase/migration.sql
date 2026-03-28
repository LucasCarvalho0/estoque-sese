-- ============================================================
-- 🚀 ESTOQUE SESÉ - SCRIPT ÚNICO E DEFINITIVO
-- Cole APENAS ESTE BLOCO no SQL Editor do Supabase e clique Run
-- ============================================================

-- 1. LIMPEZA TOTAL
drop table if exists public.movements cascade;
drop table if exists public.employees cascade;
drop table if exists public.tools cascade;
drop table if exists public.inventories cascade;

create extension if not exists pgcrypto;

-- 2. CRIAÇÃO DAS TABELAS (com coluna de turno nos funcionários e ferramentas)

create table public.employees (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  matricula text default '',
  active boolean not null default true,
  shift text not null default '1' check (shift in ('1', '2')),
  created_at timestamp with time zone default now()
);

create table public.tools (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  code text not null,
  total_quantity integer default 0,
  available_quantity integer default 0,
  description text default '',
  shift text not null default '1' check (shift in ('1', '2')),
  created_at timestamp with time zone default now()
);

create table public.movements (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references public.employees(id) on delete cascade,
  tool_id uuid references public.tools(id) on delete cascade,
  quantity integer not null,
  signature text,
  shift text check (shift in ('1', '2')),
  date timestamp with time zone default now(),
  status text check (status in ('retirada', 'devolvido', 'falta', 'parcial')),
  return_quantity integer,
  return_signature text,
  return_date timestamp with time zone,
  observation text
);

create table public.inventories (
  id uuid default gen_random_uuid() primary key,
  date timestamp with time zone default now(),
  shift text check (shift in ('1', '2')),
  type text check (type in ('quinzenal', 'mensal')),
  items jsonb default '[]'::jsonb,
  notes text default '',
  created_by text default ''
);

-- 3. DESABILITAR RLS E DAR PERMISSÕES COMPLETAS
alter table public.employees  disable row level security;
alter table public.tools       disable row level security;
alter table public.movements   disable row level security;
alter table public.inventories disable row level security;

grant all on all tables in schema public to anon, authenticated, postgres;
grant all on all sequences in schema public to anon, authenticated, postgres;
grant all on all functions in schema public to anon, authenticated, postgres;

-- 4. RECRIAR USUÁRIOS DE TURNO (login garantido)
delete from auth.users where email in ('turno1@sese.com', 'turno2@sese.com');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token)
values 
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'turno1@sese.com', crypt('Kiezen.turno1', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"shift":"1"}', now(), now(), ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'turno2@sese.com', crypt('Kaizenturno.2', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"shift":"2"}', now(), now(), '');

insert into auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
select id, id, format('{"sub":"%s","email":"%s"}', id::text, email)::jsonb, 'email', now(), now(), now(), id::text
from auth.users where email in ('turno1@sese.com', 'turno2@sese.com');
