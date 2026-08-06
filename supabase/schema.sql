-- ============================================================
-- INGAFERT ORÇAMENTOS — SCHEMA COMPLETO (Supabase / PostgreSQL)
-- ============================================================
-- Execute este arquivo no SQL Editor do Supabase (Project > SQL Editor)
-- Ordem de criação respeita as dependências de chave estrangeira.

create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm; -- busca por similaridade (nome, código)

-- ============================================================
-- USUÁRIOS (vinculado ao auth.users do Supabase)
-- ============================================================
create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  role text not null default 'vendedor' check (role in ('administrador','vendedor','financeiro')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- CLIENTES
-- ============================================================
create table if not exists public.clientes (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  empresa text,
  cpf_cnpj text,
  inscricao_estadual text,
  telefone text,
  whatsapp text,
  email text,
  cep text,
  endereco text,
  numero text,
  cidade text,
  estado text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_clientes_nome on public.clientes using gin (nome gin_trgm_ops);
create index if not exists idx_clientes_cpf_cnpj on public.clientes (cpf_cnpj);

-- ============================================================
-- MARCAS, CATEGORIAS, MÁQUINAS, TRANSPORTADORAS
-- ============================================================
create table if not exists public.marcas (
  id uuid primary key default uuid_generate_v4(),
  nome text not null unique,
  tipo text not null check (tipo in ('peca','maquina')),
  created_at timestamptz not null default now()
);

create table if not exists public.categorias (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  categoria_pai_id uuid references public.categorias(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.maquinas (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  marca_id uuid references public.marcas(id) on delete set null,
  modelo text,
  tipo text check (tipo in ('trator','plantadeira','colheitadeira','pulverizador','outro')),
  created_at timestamptz not null default now()
);

create table if not exists public.transportadoras (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  codigo text unique,
  ativo boolean not null default true
);

-- ============================================================
-- PRODUTOS
-- ============================================================
create table if not exists public.produtos (
  id uuid primary key default uuid_generate_v4(),
  codigo_ingafert text not null unique,
  codigo_industria text,
  codigo_erp text,
  sku text,
  nome text not null,
  descricao text,
  marca_peca_id uuid references public.marcas(id) on delete set null,
  marca_maquina_id uuid references public.marcas(id) on delete set null,
  modelo text,
  categoria_id uuid references public.categorias(id) on delete set null,
  subcategoria_id uuid references public.categorias(id) on delete set null,
  preco_custo numeric(12,2) default 0,
  preco_venda numeric(12,2) not null default 0,
  peso numeric(10,3) default 0,
  ncm text,
  estoque integer not null default 0,
  imagem_url text,
  seo_url text unique,
  meta_title text,
  meta_description text,
  palavras_chave text,
  alt_imagem text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_produtos_codigo_ingafert on public.produtos (codigo_ingafert);
create index if not exists idx_produtos_codigo_industria on public.produtos (codigo_industria);
create index if not exists idx_produtos_nome on public.produtos using gin (nome gin_trgm_ops);
create index if not exists idx_produtos_estoque on public.produtos (estoque);

-- Compatibilidade produto <-> máquina (N:N)
create table if not exists public.produto_compatibilidade (
  produto_id uuid references public.produtos(id) on delete cascade,
  maquina_id uuid references public.maquinas(id) on delete cascade,
  primary key (produto_id, maquina_id)
);

-- ============================================================
-- ORÇAMENTOS
-- ============================================================
create table if not exists public.orcamentos (
  id uuid primary key default uuid_generate_v4(),
  numero serial,
  cliente_id uuid references public.clientes(id) on delete restrict,
  vendedor_id uuid references public.usuarios(id) on delete set null,
  subtotal numeric(12,2) not null default 0,
  desconto_percentual numeric(5,2) not null default 0,
  desconto_valor numeric(12,2) not null default 0,
  frete_valor numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  observacoes text,
  status text not null default 'aberto' check (status in ('aberto','enviado','aprovado','recusado','expirado','convertido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orcamentos_numero on public.orcamentos (numero);
create index if not exists idx_orcamentos_cliente on public.orcamentos (cliente_id);

create table if not exists public.orcamento_itens (
  id uuid primary key default uuid_generate_v4(),
  orcamento_id uuid references public.orcamentos(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete restrict,
  quantidade numeric(10,2) not null default 1,
  preco_unitario numeric(12,2) not null,
  desconto_percentual numeric(5,2) not null default 0,
  total numeric(12,2) not null
);
create index if not exists idx_orcamento_itens_orcamento on public.orcamento_itens (orcamento_id);

-- ============================================================
-- PEDIDOS
-- ============================================================
create table if not exists public.pedidos (
  id uuid primary key default uuid_generate_v4(),
  numero serial,
  orcamento_id uuid references public.orcamentos(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete restrict,
  vendedor_id uuid references public.usuarios(id) on delete set null,
  valor_total numeric(12,2) not null default 0,
  status text not null default 'separacao' check (status in ('separacao','faturado','enviado','entregue','cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_pedidos_numero on public.pedidos (numero);
create index if not exists idx_pedidos_status on public.pedidos (status);

create table if not exists public.pedido_itens (
  id uuid primary key default uuid_generate_v4(),
  pedido_id uuid references public.pedidos(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete restrict,
  quantidade numeric(10,2) not null default 1,
  preco_unitario numeric(12,2) not null,
  total numeric(12,2) not null
);

-- ============================================================
-- ESTOQUE — MOVIMENTAÇÕES
-- ============================================================
create table if not exists public.estoque_movimentos (
  id uuid primary key default uuid_generate_v4(),
  produto_id uuid references public.produtos(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','saida','ajuste')),
  quantidade numeric(10,2) not null,
  saldo_resultante numeric(10,2) not null,
  motivo text,
  usuario_id uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_estoque_produto on public.estoque_movimentos (produto_id);

-- ============================================================
-- COTAÇÕES DE FRETE (estrutura preparada para integração futura)
-- ============================================================
create table if not exists public.fretes_cotacoes (
  id uuid primary key default uuid_generate_v4(),
  orcamento_id uuid references public.orcamentos(id) on delete cascade,
  transportadora_id uuid references public.transportadoras(id) on delete set null,
  prazo_dias integer,
  valor numeric(12,2),
  selecionado boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- LOGS
-- ============================================================
create table if not exists public.logs (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid references public.usuarios(id) on delete set null,
  acao text not null,
  detalhes jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TRIGGERS: updated_at automático
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_clientes_updated on public.clientes;
create trigger trg_clientes_updated before update on public.clientes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_produtos_updated on public.produtos;
create trigger trg_produtos_updated before update on public.produtos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orcamentos_updated on public.orcamentos;
create trigger trg_orcamentos_updated before update on public.orcamentos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_pedidos_updated on public.pedidos;
create trigger trg_pedidos_updated before update on public.pedidos
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS (Row Level Security) — habilita e restringe a usuários autenticados
-- ============================================================
alter table public.clientes enable row level security;
alter table public.produtos enable row level security;
alter table public.orcamentos enable row level security;
alter table public.orcamento_itens enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_itens enable row level security;
alter table public.estoque_movimentos enable row level security;
alter table public.usuarios enable row level security;
alter table public.marcas enable row level security;
alter table public.categorias enable row level security;
alter table public.maquinas enable row level security;
alter table public.transportadoras enable row level security;
alter table public.fretes_cotacoes enable row level security;
alter table public.logs enable row level security;

-- Política padrão: qualquer usuário autenticado (vendedor/admin/financeiro) pode ler e escrever.
-- Ajuste depois por role, se quiser restringir financeiro/admin em telas específicas.
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'clientes','produtos','orcamentos','orcamento_itens','pedidos','pedido_itens',
    'estoque_movimentos','usuarios','marcas','categorias','maquinas','transportadoras',
    'fretes_cotacoes','logs'
  ])
  loop
    execute format('drop policy if exists "auth_all_%1$s" on public.%1$s;', t);
    execute format('create policy "auth_all_%1$s" on public.%1$s for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ============================================================
-- SEED mínimo (opcional) — remova se não quiser dados de exemplo
-- ============================================================
insert into public.transportadoras (nome, codigo) values
  ('Correios','CORREIOS'), ('Jadlog','JADLOG'), ('J&T Express','JT'), ('Loggi','LOGGI')
on conflict (codigo) do nothing;
