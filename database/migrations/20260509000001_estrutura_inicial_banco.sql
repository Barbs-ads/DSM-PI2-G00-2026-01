-- ═══════════════════════════════════════════════════════════════
-- Conectando Sonhos · Schema (v2)
-- PostgreSQL 15 / Supabase
--
-- Decisões de modelagem:
--   • PKs BIGINT GENERATED ALWAYS AS IDENTITY — sequenciais, compactos,
--     legíveis em logs e URLs; sem custo de geração aleatória de UUID
--   • usuarios.auth_id UUID referencia auth.users.id (Supabase Auth)
--     separado da PK para manter integridade sem expor UUID publicamente
--   • snake_case em tabelas (plural) e colunas
--   • created_at / updated_at em todas as tabelas mutáveis
--   • CHECK constraints nomeados para enums (tipo, status, genero…)
--   • Índices estratégicos com nomes descritivos
--   • Soft-delete via flag `ativo` — DELETE físico nunca
--   • Comentários em todas as tabelas e colunas (auto-doc)
-- ═══════════════════════════════════════════════════════════════

-- ── Helper: atualiza updated_at automaticamente ─────────────────
-- ── Helper: atualiza updated_at automaticamente ─────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql 
set search_path = public, pg_temp    -- <── A correção entra aqui!
as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ═══ INSTITUIÇÕES ═══════════════════════════════════════════════
create table public.instituicoes (
  id              bigint generated always as identity primary key,
  nome            text    not null,
  tipo            text    not null,
  cnpj            text    unique,
  email           text    not null unique,
  telefone        text,
  endereco        text,
  bairro          text,
  cidade          text    not null default 'Franca',
  uf              text    not null default 'SP',
  responsavel_nome     text not null,
  responsavel_email    text,
  responsavel_telefone text,
  verificada      boolean not null default false,
  ativa           boolean not null default true,
  observacoes     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint chk_inst_tipo check (tipo in ('ong','abrigo','projeto-social','escola','igreja','outro')),
  constraint chk_inst_uf   check (length(uf) = 2)
);
comment on table  public.instituicoes              is 'Organizações parceiras que cadastram crianças e cartinhas';
comment on column public.instituicoes.verificada   is 'true somente após validação manual pela equipe Conectando Sonhos';
comment on column public.instituicoes.tipo         is 'ong | abrigo | projeto-social | escola | igreja | outro';

create trigger trg_inst_upd
  before update on public.instituicoes
  for each row execute function public.set_updated_at();

create index idx_inst_ativa  on public.instituicoes(ativa)           where ativa = true;
create index idx_inst_verif  on public.instituicoes(verificada)      where verificada = true;
create index idx_inst_cidade on public.instituicoes(cidade, uf);

-- ═══ USUÁRIOS (perfil público · 1:1 com auth.users) ══════════════
-- auth_id é o UUID do Supabase Auth; id é o PK interno BIGINT.
-- Separar os dois evita expor UUIDs de autenticação em FKs de negócio.
create table public.usuarios (
  id              bigint generated always as identity primary key,
  auth_id         uuid    not null unique references auth.users(id) on delete cascade,
  nome            text    not null,
  email           text    not null unique,
  telefone        text,
  tipo            text    not null default 'doador',
  inst_id         bigint  references public.instituicoes(id) on delete set null,
  cep             text,
  uf              text,
  cidade          text,
  bairro          text,
  endereco        text,
  avatar_url      text,
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint chk_user_tipo check (tipo in ('doador','instituicao','admin')),
  constraint chk_user_uf   check (uf is null or length(uf) = 2)
);
comment on table  public.usuarios          is 'Perfil de usuário (doador, operador de instituição, admin)';
comment on column public.usuarios.auth_id  is 'FK para auth.users.id (UUID do Supabase Auth) — não usar como PK de negócio';
comment on column public.usuarios.inst_id  is 'Preenchido apenas para tipo = instituicao; indica qual organização o usuário opera';
comment on column public.usuarios.tipo     is 'doador | instituicao | admin';

create trigger trg_user_upd
  before update on public.usuarios
  for each row execute function public.set_updated_at();

create index idx_user_auth  on public.usuarios(auth_id);
create index idx_user_tipo  on public.usuarios(tipo);
create index idx_user_inst  on public.usuarios(inst_id) where inst_id is not null;

-- ═══ PONTOS DE COLETA ═══════════════════════════════════════════
create table public.pontos_coleta (
  id              bigint generated always as identity primary key,
  nome            text    not null,
  endereco        text    not null,
  bairro          text    not null,
  cidade          text    not null default 'Franca',
  uf              text    not null default 'SP',
  cep             text,
  lat             double precision,
  lng             double precision,
  horario         text,
  responsavel     text,
  telefone        text,
  ativo           boolean not null default true,
  ordem           integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint chk_pc_uf check (length(uf) = 2)
);
comment on table  public.pontos_coleta        is 'Locais físicos onde doadores entregam os presentes';
comment on column public.pontos_coleta.ordem  is 'Posição de exibição no mapa/lista; menor número aparece primeiro';

create trigger trg_pc_upd
  before update on public.pontos_coleta
  for each row execute function public.set_updated_at();

create index idx_pc_ativo on public.pontos_coleta(ativo, ordem) where ativo = true;
create index idx_pc_geo   on public.pontos_coleta(cidade, bairro);

-- ═══ CATEGORIAS DE PRESENTE ═════════════════════════════════════
create table public.categorias_presente (
  id              bigint generated always as identity primary key,
  slug            text    not null unique,
  nome            text    not null,
  grupo           text    not null,
  icone           text,
  ordem           integer not null default 0,
  ativa           boolean not null default true,

  constraint chk_cat_grupo  check (grupo in ('brinquedos','esportes','escola','roupas','outros')),
  constraint chk_cat_slug   check (slug ~ '^[a-z0-9-]+$')
);
comment on table  public.categorias_presente       is 'Catálogo de categorias de presente disponíveis para as cartinhas';
comment on column public.categorias_presente.slug  is 'Identificador URL-friendly imutável (ex: kit-escolar)';
comment on column public.categorias_presente.grupo is 'Agrupamento para filtro/donut: brinquedos | esportes | escola | roupas | outros';

create index idx_cat_grupo_ordem on public.categorias_presente(grupo, ordem) where ativa = true;

-- ═══ CRIANÇAS ═══════════════════════════════════════════════════
-- Dados pessoais sensíveis — acesso restrito por RLS (inst dona + admin)
create table public.criancas (
  id              bigint generated always as identity primary key,
  inst_id         bigint  not null references public.instituicoes(id) on delete restrict,
  nome            text    not null,
  data_nasc       date    not null,
  genero          text    not null default 'nao-informado',
  observacoes     text,
  ativa           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint chk_crc_genero    check (genero in ('F','M','outro','nao-informado')),
  constraint chk_crc_data_nasc check (data_nasc <= current_date)
);
comment on table  public.criancas           is 'Crianças cadastradas pelas instituições (PII sensível — RLS estrita)';
comment on column public.criancas.data_nasc is 'Usado para calcular idade na view pública sem expor a data exata';

create trigger trg_crc_upd
  before update on public.criancas
  for each row execute function public.set_updated_at();

create index idx_crc_inst on public.criancas(inst_id);
create index idx_crc_ativa on public.criancas(ativa) where ativa = true;

-- ═══ CARTINHAS ══════════════════════════════════════════════════
-- Entidade central: pedido de presente de uma criança.
-- Máquina de estados: aguardando → disponivel → adotada → entregue
--                     qualquer estado não-terminal → cancelada
create table public.cartinhas (
  id              bigint generated always as identity primary key,
  crianca_id      bigint  not null references public.criancas(id)           on delete restrict,
  inst_id         bigint  not null references public.instituicoes(id)        on delete restrict,
  categoria_id    bigint  not null references public.categorias_presente(id) on delete restrict,
  texto           text    not null,
  foto_url        text,

  -- Máquina de estados
  status          text    not null default 'aguardando',

  -- Quem adotou e onde será entregue
  doador_id       bigint  references public.usuarios(id) on delete set null,
  ponto_id        bigint  references public.pontos_coleta(id) on delete set null,

  -- Timestamps de cada transição de estado
  enviada_em      timestamptz not null default now(),
  aprovada_em     timestamptz,
  adotada_em      timestamptz,
  entregue_em     timestamptz,
  cancelada_em    timestamptz,
  motivo_cancel   text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint chk_crt_status check (status in ('aguardando','disponivel','adotada','entregue','cancelada')),
  constraint chk_crt_texto  check (length(texto) between 20 and 2000),
  -- Consistência temporal das transições
  constraint chk_crt_aprovada   check (aprovada_em  is null or aprovada_em  >= enviada_em),
  constraint chk_crt_adotada    check (adotada_em   is null or adotada_em   >= aprovada_em),
  constraint chk_crt_entregue   check (entregue_em  is null or entregue_em  >= adotada_em)
);
comment on table  public.cartinhas        is 'Pedido de presente escrito por uma criança; entidade central com máquina de estados';
comment on column public.cartinhas.status is
  'aguardando: aguarda revisão da inst · disponivel: publicada no mural · adotada: doador comprometeu · entregue: presente chegou · cancelada: removida';

create trigger trg_crt_upd
  before update on public.cartinhas
  for each row execute function public.set_updated_at();

-- Índices para filtros do mural público e dashboards
create index idx_crt_status    on public.cartinhas(status, enviada_em desc);
create index idx_crt_inst      on public.cartinhas(inst_id, status);
create index idx_crt_doador    on public.cartinhas(doador_id) where doador_id is not null;
create index idx_crt_categoria on public.cartinhas(categoria_id);
create index idx_crt_ponto     on public.cartinhas(ponto_id)   where ponto_id  is not null;

-- Índice de busca textual em português (mural com pesquisa livre)
create index idx_crt_busca on public.cartinhas
  using gin (to_tsvector('portuguese', coalesce(texto, '')));

-- ═══ EVENTOS DE CARTINHA (audit log imutável) ════════════════════
-- Registra cada transição de estado; nunca é atualizado, só inserido.
create table public.eventos_cartinha (
  id              bigint generated always as identity primary key,
  cartinha_id     bigint  not null references public.cartinhas(id) on delete cascade,
  tipo            text    not null,
  ator_id         bigint  references public.usuarios(id) on delete set null,
  ator_tipo       text,
  payload         jsonb,
  created_at      timestamptz not null default now(),

  constraint chk_evt_tipo      check (tipo      in ('criada','aprovada','adotada','entregue','cancelada','editada')),
  constraint chk_evt_ator_tipo check (ator_tipo in ('doador','instituicao','admin','sistema'))
);
comment on table  public.eventos_cartinha             is 'Audit log das transições de estado das cartinhas (somente insert)';
comment on column public.eventos_cartinha.payload     is 'JSONB com contexto da transição (status anterior, novo, etc.)';

create index idx_evt_cartinha on public.eventos_cartinha(cartinha_id, created_at desc);
create index idx_evt_tipo     on public.eventos_cartinha(tipo, created_at desc);

-- ═══ DOAÇÕES DIRETAS (sem vínculo com cartinha específica) ════════
create table public.doacoes_diretas (
  id              bigint generated always as identity primary key,
  doador_id       bigint  references public.usuarios(id)            on delete set null,
  doador_nome     text,
  doador_email    text,
  categoria_id    bigint  not null references public.categorias_presente(id),
  ponto_id        bigint  not null references public.pontos_coleta(id),
  status          text    not null default 'pendente',
  observacoes     text,
  created_at      timestamptz not null default now(),
  recebida_em     timestamptz,

  constraint chk_dd_status        check (status in ('pendente','recebida','redirecionada','cancelada')),
  -- Pelo menos uma identificação do doador (logado ou anônimo com e-mail)
  constraint chk_dd_doador_ident  check (doador_id is not null or doador_email is not null)
);
comment on table  public.doacoes_diretas is 'Doações sem vínculo a cartinha; aceita doadores anônimos (com e-mail)';

create index idx_dd_status on public.doacoes_diretas(status);
create index idx_dd_ponto  on public.doacoes_diretas(ponto_id);
create index idx_dd_doador on public.doacoes_diretas(doador_id) where doador_id is not null;
