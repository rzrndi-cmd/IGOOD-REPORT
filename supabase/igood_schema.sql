-- IGOOD Supabase schema
-- Jalankan di Supabase SQL Editor.
--
-- Catatan keamanan:
-- Aplikasi saat ini belum memakai Supabase Auth, jadi policy anon di bawah
-- dibuat agar APK internal bisa membaca/menulis data memakai publishable/anon key.
-- Untuk distribusi publik, ganti policy anon dengan authenticated atau Edge Function.

create table if not exists public.igood_device_stock (
  code text primary key,
  category text not null default 'iphone',
  brand text,
  model text not null,
  storage text,
  color text,
  condition text,
  acquisition text,
  warranty text,
  supplier text,
  purchase_date date,
  cost numeric not null default 0,
  status text not null default 'Available',
  sold_date date,
  sold_price numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.igood_acc_stock (
  code text primary key,
  category text,
  brand text,
  name text not null,
  qty integer not null default 0,
  cost numeric not null default 0,
  sell numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.igood_technicians (
  name text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.igood_service_catalog (
  code text primary key,
  name text not null,
  cost numeric not null default 0,
  sell numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.igood_service_orders (
  code text primary key,
  date_in date not null,
  shift text,
  buyer_name text,
  buyer_wa text,
  item_name text not null,
  complaint text not null,
  note text,
  technician text,
  status text not null default 'Masuk',
  payment_status text not null default 'Belum dibayar',
  paid_amount numeric not null default 0,
  payment_method text,
  split_cash numeric not null default 0,
  split_transfer numeric not null default 0,
  split_credit numeric not null default 0,
  paid_date date,
  process_date date,
  cancel_amount numeric not null default 0,
  cancel_date date,
  technician_cost numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.igood_preorder_requests (
  code text primary key,
  date date not null,
  shift text,
  buyer_name text,
  buyer_wa text,
  sales_name text,
  requested_item text not null,
  note text,
  dp_amount numeric not null default 0,
  payment_method text not null default 'cash',
  split_cash numeric not null default 0,
  split_transfer numeric not null default 0,
  split_credit numeric not null default 0,
  cost numeric not null default 0,
  status text not null default 'Preorder',
  ready_date date,
  done_date date,
  cancel_date date,
  linked_unit_code text,
  linked_transaction_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.igood_other_catalog (
  code text primary key,
  name text not null,
  sell numeric not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.igood_transactions (
  id text primary key,
  date date not null,
  shift text,
  category text not null,
  code text,
  item_name text not null,
  condition text,
  buyer_name text,
  buyer_wa text,
  sales_name text,
  quantity integer not null default 1,
  sell numeric not null default 0,
  cost numeric not null default 0,
  bonus_cost numeric not null default 0,
  bonus_accessories jsonb not null default '[]'::jsonb,
  fee numeric not null default 0,
  payment_method text not null default 'cash',
  split_cash numeric not null default 0,
  split_transfer numeric not null default 0,
  split_credit numeric not null default 0,
  technician text,
  stock_ref_code text,
  preorder_code text,
  service_order_code text,
  service_status text,
  jasa_metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.igood_transactions add column if not exists sales_name text;
alter table public.igood_transactions add column if not exists bonus_cost numeric not null default 0;
alter table public.igood_transactions add column if not exists bonus_accessories jsonb not null default '[]'::jsonb;
alter table public.igood_transactions add column if not exists preorder_code text;
alter table public.igood_transactions add column if not exists service_order_code text;
alter table public.igood_transactions add column if not exists service_status text;
alter table public.igood_transactions add column if not exists jasa_metadata jsonb;
alter table public.igood_service_orders add column if not exists process_date date;
alter table public.igood_service_orders add column if not exists cancel_amount numeric not null default 0;
alter table public.igood_service_orders add column if not exists cancel_date date;
alter table public.igood_acc_stock add column if not exists total_cost numeric not null default 0;

create index if not exists igood_transactions_date_idx on public.igood_transactions(date);
create index if not exists igood_transactions_category_idx on public.igood_transactions(category);
create index if not exists igood_device_stock_status_idx on public.igood_device_stock(status);
create index if not exists igood_service_orders_date_in_idx on public.igood_service_orders(date_in);
create index if not exists igood_service_orders_status_idx on public.igood_service_orders(status);
create index if not exists igood_preorder_requests_status_idx on public.igood_preorder_requests(status);
create index if not exists igood_preorder_requests_date_idx on public.igood_preorder_requests(date);

alter table public.igood_device_stock enable row level security;
alter table public.igood_acc_stock enable row level security;
alter table public.igood_technicians enable row level security;
alter table public.igood_service_catalog enable row level security;
alter table public.igood_service_orders enable row level security;
alter table public.igood_preorder_requests enable row level security;
alter table public.igood_other_catalog enable row level security;
alter table public.igood_transactions enable row level security;

drop policy if exists "igood anon all device stock" on public.igood_device_stock;
drop policy if exists "igood anon all accessories" on public.igood_acc_stock;
drop policy if exists "igood anon all technicians" on public.igood_technicians;
drop policy if exists "igood anon all service catalog" on public.igood_service_catalog;
drop policy if exists "igood anon all service orders" on public.igood_service_orders;
drop policy if exists "igood anon all preorder requests" on public.igood_preorder_requests;
drop policy if exists "igood anon all other catalog" on public.igood_other_catalog;
drop policy if exists "igood anon all transactions" on public.igood_transactions;

create policy "igood anon all device stock"
on public.igood_device_stock for all
to anon
using (true)
with check (true);

create policy "igood anon all accessories"
on public.igood_acc_stock for all
to anon
using (true)
with check (true);

create policy "igood anon all technicians"
on public.igood_technicians for all
to anon
using (true)
with check (true);

create policy "igood anon all service catalog"
on public.igood_service_catalog for all
to anon
using (true)
with check (true);

create policy "igood anon all service orders"
on public.igood_service_orders for all
to anon
using (true)
with check (true);

create policy "igood anon all preorder requests"
on public.igood_preorder_requests for all
to anon
using (true)
with check (true);

create policy "igood anon all other catalog"
on public.igood_other_catalog for all
to anon
using (true)
with check (true);

create policy "igood anon all transactions"
on public.igood_transactions for all
to anon
using (true)
with check (true);

create table if not exists public.igood_operational_expenses (
  id text primary key,
  date date not null,
  month text not null,
  category text not null,
  description text,
  amount numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.igood_operational_expenses enable row level security;

create policy "igood anon all expenses"
on public.igood_operational_expenses for all
to anon
using (true)
with check (true);


create table if not exists public.igood_employees (
  id text primary key,
  name text not null,
  job_title text,
  role text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.igood_employees enable row level security;

drop policy if exists "igood anon all employees" on public.igood_employees;

create policy "igood anon all employees"
on public.igood_employees for all
to anon
using (true)
with check (true);


