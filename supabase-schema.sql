-- The Domin Inn Orders database setup
-- Run this once in Supabase SQL Editor.
-- It creates proper tables for stock, drafts, submitted orders, and order lines.

create table if not exists public.stock_items (
  id text primary key,
  name text not null,
  sku text default '',
  category text not null default 'Bottles',
  supplier text default '',
  pack_size text not null default 'Regular',
  on_hand integer not null default 0,
  reorder_point integer not null default 1,
  reorder_quantity integer not null default 1,
  par_level integer not null default 2,
  unit_cost numeric(10, 2) not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  order_number text not null,
  status text not null check (status in ('draft', 'submitted')),
  needed_by date,
  notes text default '',
  source_order_id text,
  source_order_number text,
  supplier_pdf_name text,
  priced_pdf_name text,
  subtotal numeric(10, 2) not null default 0,
  vat_total numeric(10, 2) not null default 0,
  grand_total numeric(10, 2) not null default 0,
  submitted_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  stock_item_id text,
  name text not null,
  sku text default '',
  supplier text default '',
  category text default '',
  pack_size text default '',
  quantity integer not null default 1,
  unit_cost numeric(10, 2) not null default 0,
  vat_rate numeric(4, 3) not null default 0.2,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists stock_items_category_name_idx on public.stock_items (category, name);
create index if not exists stock_items_hidden_idx on public.stock_items (hidden);
create index if not exists orders_status_updated_idx on public.orders (status, deleted_at, updated_at desc);
create index if not exists order_lines_order_id_idx on public.order_lines (order_id, sort_order);

alter table public.stock_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;

-- The Render app uses the Supabase secret/server key, so it can read/write
-- these tables even with RLS enabled. Do not put the secret key in browser code.

insert into public.stock_items (
  id, name, sku, category, supplier, pack_size,
  on_hand, reorder_point, reorder_quantity, par_level, unit_cost, hidden
)
select
  item.id,
  item.name,
  coalesce(item.sku, ''),
  coalesce(item.category, 'Bottles'),
  coalesce(item.supplier, ''),
  coalesce(item."packSize", 'Regular'),
  coalesce(item."onHand", 0),
  coalesce(item."reorderPoint", 1),
  coalesce(item."reorderQuantity", 1),
  coalesce(item."parLevel", 2),
  coalesce(item."unitCost", 0),
  false
from public.stock_orders catalogue
cross join lateral jsonb_to_recordset(catalogue.items::jsonb) as item(
  id text,
  name text,
  sku text,
  category text,
  supplier text,
  "packSize" text,
  "onHand" integer,
  "reorderPoint" integer,
  "reorderQuantity" integer,
  "parLevel" integer,
  "unitCost" numeric
)
where catalogue.id = 'stock-catalogue-v1'
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  category = excluded.category,
  supplier = excluded.supplier,
  pack_size = excluded.pack_size,
  on_hand = excluded.on_hand,
  reorder_point = excluded.reorder_point,
  reorder_quantity = excluded.reorder_quantity,
  par_level = excluded.par_level,
  unit_cost = excluded.unit_cost,
  hidden = excluded.hidden,
  updated_at = now();

insert into public.orders (
  id, order_number, status, needed_by, notes,
  source_order_id, source_order_number,
  supplier_pdf_name, priced_pdf_name,
  subtotal, vat_total, grand_total,
  submitted_at, deleted_at, created_at, updated_at
)
select
  so.id,
  so.order_number,
  so.status,
  so.needed_by,
  coalesce(so.notes, ''),
  nullif(so.totals->>'sourceOrderId', ''),
  nullif(so.totals->>'sourceOrderNumber', ''),
  so.supplier_pdf_name,
  so.priced_pdf_name,
  coalesce((so.totals->>'net')::numeric, 0),
  coalesce((so.totals->>'vat')::numeric, 0),
  coalesce((so.totals->>'gross')::numeric, 0),
  so.submitted_at,
  so.deleted_at,
  so.created_at,
  so.updated_at
from public.stock_orders so
where so.status in ('draft', 'submitted')
on conflict (id) do update set
  order_number = excluded.order_number,
  status = excluded.status,
  needed_by = excluded.needed_by,
  notes = excluded.notes,
  source_order_id = excluded.source_order_id,
  source_order_number = excluded.source_order_number,
  supplier_pdf_name = excluded.supplier_pdf_name,
  priced_pdf_name = excluded.priced_pdf_name,
  subtotal = excluded.subtotal,
  vat_total = excluded.vat_total,
  grand_total = excluded.grand_total,
  submitted_at = excluded.submitted_at,
  deleted_at = excluded.deleted_at,
  updated_at = excluded.updated_at;

delete from public.order_lines
where order_id in (
  select id from public.stock_orders where status in ('draft', 'submitted')
);

insert into public.order_lines (
  order_id, stock_item_id, name, sku, supplier, category,
  pack_size, quantity, unit_cost, vat_rate, sort_order
)
select
  so.id,
  line.value->>'id',
  line.value->>'name',
  coalesce(line.value->>'sku', ''),
  coalesce(line.value->>'supplier', ''),
  coalesce(line.value->>'category', ''),
  coalesce(line.value->>'packSize', ''),
  coalesce((line.value->>'quantity')::integer, 1),
  coalesce((line.value->>'unitCost')::numeric, 0),
  coalesce((line.value->>'vatRate')::numeric, 0.2),
  line.ordinality - 1
from public.stock_orders so
cross join lateral jsonb_array_elements(so.items::jsonb) with ordinality as line(value, ordinality)
where so.status in ('draft', 'submitted');
