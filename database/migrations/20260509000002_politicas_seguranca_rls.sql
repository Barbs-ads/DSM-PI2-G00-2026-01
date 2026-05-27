-- ═══════════════════════════════════════════════════════════════
-- Conectando Sonhos · Row Level Security (v2)
--
-- Princípios:
--   • Default-deny: RLS habilitado em todas as tabelas; sem policy = sem acesso
--   • auth.uid() retorna UUID (auth.users); resolução para BIGINT via current_user_id()
--   • Helper functions security_definer para policies legíveis e auditáveis
--   • Leitura pública apenas onde não há PII
--   • Mutações sempre filtradas pelo contexto do usuário autenticado
-- ═══════════════════════════════════════════════════════════════

-- ── Helpers de autorização ──────────────────────────────────────
-- Retorna o BIGINT id do usuário logado (usuarios.id, não auth.uid)
create or replace function public.current_user_id()
returns bigint language sql stable security definer
set search_path = public, auth
as $$
  select id from public.usuarios where auth_id = auth.uid();
$$;

-- Retorna o tipo do usuário logado (doador | instituicao | admin)
create or replace function public.current_user_tipo()
returns text language sql stable security definer
set search_path = public, auth
as $$
  select tipo from public.usuarios where auth_id = auth.uid();
$$;

-- Verdadeiro se o usuário logado é admin
create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public, auth
as $$
  select coalesce(public.current_user_tipo() = 'admin', false);
$$;

-- Verdadeiro se o usuário logado é operador da instituição _inst_id
create or replace function public.owns_instituicao(_inst_id bigint)
returns boolean language sql stable security definer
set search_path = public, auth
as $$
  select exists(
    select 1 from public.usuarios u
    where u.auth_id = auth.uid()
      and u.tipo     = 'instituicao'
      and u.inst_id  = _inst_id
  );
$$;

-- ═══ INSTITUIÇÕES ═══════════════════════════════════════════════
alter table public.instituicoes enable row level security;

-- Qualquer visitante vê as instituições verificadas e ativas (parceiros no site)
create policy inst_select_public on public.instituicoes
  for select using (verificada and ativa);

-- Operador vê a sua própria instituição mesmo que não verificada
create policy inst_select_self on public.instituicoes
  for select using (public.owns_instituicao(id));

-- Admin lê e escreve em qualquer instituição
create policy inst_admin_all on public.instituicoes
  for all using (public.is_admin()) with check (public.is_admin());

-- Operador pode editar dados da sua instituição (campos limitados pela UI/RPC)
create policy inst_update_self on public.instituicoes
  for update using  (public.owns_instituicao(id))
  with check        (public.owns_instituicao(id));

-- ═══ USUÁRIOS ═══════════════════════════════════════════════════
alter table public.usuarios enable row level security;

-- Cada usuário lê e altera apenas o próprio perfil
create policy user_select_self on public.usuarios
  for select using (auth_id = auth.uid());

create policy user_insert_self on public.usuarios
  for insert with check (auth_id = auth.uid());

create policy user_update_self on public.usuarios
  for update using  (auth_id = auth.uid())
  with check        (auth_id = auth.uid());

-- Admin acessa todos os perfis
create policy user_admin_all on public.usuarios
  for all using (public.is_admin()) with check (public.is_admin());

-- ═══ PONTOS DE COLETA ═══════════════════════════════════════════
alter table public.pontos_coleta enable row level security;

-- Pontos ativos são informação pública (endereços de entrega)
create policy pc_select_public on public.pontos_coleta
  for select using (ativo);

create policy pc_admin_all on public.pontos_coleta
  for all using (public.is_admin()) with check (public.is_admin());

-- ═══ CATEGORIAS DE PRESENTE ═════════════════════════════════════
alter table public.categorias_presente enable row level security;

-- Categorias ativas são públicas (usado no filtro do mural)
create policy cat_select_public on public.categorias_presente
  for select using (ativa);

create policy cat_admin_all on public.categorias_presente
  for all using (public.is_admin()) with check (public.is_admin());

-- ═══ CRIANÇAS (PII sensível) ════════════════════════════════════
alter table public.criancas enable row level security;

-- Apenas a instituição dona e o admin veem dados das crianças
create policy crc_select_inst on public.criancas
  for select using (public.owns_instituicao(inst_id));

create policy crc_insert_inst on public.criancas
  for insert with check (public.owns_instituicao(inst_id));

create policy crc_update_inst on public.criancas
  for update using  (public.owns_instituicao(inst_id))
  with check        (public.owns_instituicao(inst_id));

create policy crc_admin_all on public.criancas
  for all using (public.is_admin()) with check (public.is_admin());

-- ═══ CARTINHAS ══════════════════════════════════════════════════
alter table public.cartinhas enable row level security;

-- Mural público: apenas status publicados (aguardando e cancelada ficam ocultos)
create policy crt_select_public on public.cartinhas
  for select using (status in ('disponivel','adotada','entregue'));

-- Doador vê todas as cartinhas que adotou (qualquer status)
create policy crt_select_doador on public.cartinhas
  for select using (doador_id = public.current_user_id());

-- Instituição vê todas as suas cartinhas (inclusive aguardando e canceladas)
create policy crt_select_inst on public.cartinhas
  for select using (public.owns_instituicao(inst_id));

-- Criação: instituição cria cartinha vinculada a criança que ela cadastrou
create policy crt_insert_inst on public.cartinhas
  for insert with check (
    public.owns_instituicao(inst_id)
    and exists (
      select 1 from public.criancas c
      where c.id = crianca_id and c.inst_id = inst_id
    )
  );

-- Edição: instituição dona altera suas cartinhas (texto, foto, aprovação)
create policy crt_update_inst on public.cartinhas
  for update using  (public.owns_instituicao(inst_id))
  with check        (public.owns_instituicao(inst_id));

-- Adoção: doador só pode atualizar cartinha disponível e sem dono
-- (validação fina feita no RPC adotar_cartinha)
create policy crt_update_doador on public.cartinhas
  for update using (
    status = 'disponivel'
    and (doador_id is null or doador_id = public.current_user_id())
  )
  with check (doador_id = public.current_user_id());

create policy crt_admin_all on public.cartinhas
  for all using (public.is_admin()) with check (public.is_admin());

-- ═══ EVENTOS DE CARTINHA (audit log) ════════════════════════════
alter table public.eventos_cartinha enable row level security;

-- Leitura: admin vê tudo; doador e instituição veem eventos das suas cartinhas
create policy evt_select on public.eventos_cartinha
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.cartinhas c
      where c.id = cartinha_id
        and (
          c.doador_id = public.current_user_id()
          or public.owns_instituicao(c.inst_id)
        )
    )
  );

-- Inserção: apenas via triggers com security_definer (nunca diretamente pelo cliente)
create policy evt_insert_sistema on public.eventos_cartinha
  for insert with check (public.is_admin());

-- ═══ DOAÇÕES DIRETAS ════════════════════════════════════════════
alter table public.doacoes_diretas enable row level security;

-- Formulário aberto: qualquer pessoa (inclusive anônimo) registra doação direta
create policy dd_insert_any on public.doacoes_diretas
  for insert with check (true);

-- Doador autenticado lê suas próprias doações diretas
create policy dd_select_self on public.doacoes_diretas
  for select using (doador_id = public.current_user_id());

create policy dd_admin_all on public.doacoes_diretas
  for all using (public.is_admin()) with check (public.is_admin());
