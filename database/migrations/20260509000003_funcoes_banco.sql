-- ═══════════════════════════════════════════════════════════════
-- Conectando Sonhos · Funções RPC + Triggers (v2)
--
-- Todos os parâmetros de entidade usam BIGINT (PK da tabela).
-- Triggers mantêm audit log e consistência referencial.
-- RPCs são security_definer: encapsulam regras de negócio e evitam
-- que o cliente precise de permissões diretas nas tabelas.
-- ═══════════════════════════════════════════════════════════════

-- ═══ Trigger: cria perfil em public.usuarios após signup ════════
-- Supabase dispara auth.users INSERT → este trigger replica em public.usuarios.
-- Nota: auth_id recebe o UUID do auth.users; id é gerado pelo IDENTITY.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public, auth
as $$
begin
  insert into public.usuarios (auth_id, email, nome, tipo)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'tipo', 'doador')
  )
  on conflict (auth_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══ Trigger: registra evento a cada mudança de status ══════════
-- Grava em eventos_cartinha sempre que uma cartinha é criada ou
-- tem seu status alterado. Roda como sistema (sem auth.uid() explícito).
create or replace function public.log_cartinha_event()
returns trigger language plpgsql security definer
set search_path = public, auth
as $$
declare
  evt_tipo  text;
  ator_tipo text;
begin
  if tg_op = 'INSERT' then
    evt_tipo := 'criada';
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    evt_tipo := case new.status
      when 'disponivel' then 'aprovada'
      when 'adotada'    then 'adotada'
      when 'entregue'   then 'entregue'
      when 'cancelada'  then 'cancelada'
      else 'editada'
    end;
  else
    return new;  -- UPDATE sem mudança de status: não registra evento
  end if;

  ator_tipo := coalesce(public.current_user_tipo(), 'sistema');

  insert into public.eventos_cartinha (cartinha_id, tipo, ator_id, ator_tipo, payload)
  values (
    new.id,
    evt_tipo,
    public.current_user_id(),
    ator_tipo,
    jsonb_build_object(
      'status_anterior', case when tg_op = 'UPDATE' then old.status else null end,
      'status_novo',     new.status
    )
  );

  return new;
end $$;

drop trigger if exists trg_cart_event on public.cartinhas;
create trigger trg_cart_event
  after insert or update on public.cartinhas
  for each row execute function public.log_cartinha_event();

-- ═══ Trigger: garante que cartinha.inst_id = crianca.inst_id ════
-- Evita inconsistência onde uma cartinha aponta para criança de outra inst.
create or replace function public.cartinha_inst_consistency()
returns trigger language plpgsql as $$
declare
  c_inst bigint;
begin
  select inst_id into c_inst from public.criancas where id = new.crianca_id;

  if c_inst is null then
    raise exception 'Criança % não encontrada', new.crianca_id;
  end if;

  if new.inst_id <> c_inst then
    raise exception
      'inst_id da cartinha (%) não corresponde à inst_id da criança (%)',
      new.inst_id, c_inst;
  end if;

  return new;
end $$;

drop trigger if exists trg_cart_inst on public.cartinhas;
create trigger trg_cart_inst
  before insert or update on public.cartinhas
  for each row execute function public.cartinha_inst_consistency();

-- ═══ RPC: adotar_cartinha ═══════════════════════════════════════
-- Doador autenticado adota uma cartinha com status 'disponivel'.
-- Seta doador_id, ponto_id (opcional) e adotada_em atomicamente.
create or replace function public.adotar_cartinha(
  _cartinha_id bigint,
  _ponto_id    bigint default null
)
returns public.cartinhas
language plpgsql security definer
set search_path = public, auth
as $$
declare
  resultado public.cartinhas%rowtype;
  uid_int   bigint := public.current_user_id();
begin
  if uid_int is null then
    raise exception 'Login obrigatório para adotar uma cartinha';
  end if;

  if (select tipo from public.usuarios where id = uid_int) <> 'doador' then
    raise exception 'Apenas doadores podem adotar cartinhas';
  end if;

  update public.cartinhas
  set
    status    = 'adotada',
    doador_id = uid_int,
    ponto_id  = coalesce(_ponto_id, ponto_id),
    adotada_em = now()
  where id     = _cartinha_id
    and status = 'disponivel'
  returning * into resultado;

  if not found then
    raise exception 'Cartinha % não está disponível para adoção', _cartinha_id;
  end if;

  return resultado;
end $$;

-- ═══ RPC: marcar_entregue ═══════════════════════════════════════
-- Instituição dona (ou admin) confirma que o presente chegou à criança.
create or replace function public.marcar_entregue(_cartinha_id bigint)
returns public.cartinhas
language plpgsql security definer
set search_path = public, auth
as $$
declare
  resultado public.cartinhas%rowtype;
  c_inst    bigint;
begin
  select inst_id into c_inst from public.cartinhas where id = _cartinha_id;

  if c_inst is null then
    raise exception 'Cartinha % não encontrada', _cartinha_id;
  end if;

  if not (public.owns_instituicao(c_inst) or public.is_admin()) then
    raise exception 'Apenas a instituição responsável pode marcar como entregue';
  end if;

  update public.cartinhas
  set status = 'entregue', entregue_em = now()
  where id     = _cartinha_id
    and status = 'adotada'
  returning * into resultado;

  if not found then
    raise exception 'Cartinha % não está adotada (status atual inválido)', _cartinha_id;
  end if;

  return resultado;
end $$;

-- ═══ RPC: aprovar_cartinha ══════════════════════════════════════
-- Instituição (ou admin) aprova a cartinha → fica disponível no mural.
create or replace function public.aprovar_cartinha(_cartinha_id bigint)
returns public.cartinhas
language plpgsql security definer
set search_path = public, auth
as $$
declare
  resultado public.cartinhas%rowtype;
  c_inst    bigint;
begin
  select inst_id into c_inst from public.cartinhas where id = _cartinha_id;

  if c_inst is null then
    raise exception 'Cartinha % não encontrada', _cartinha_id;
  end if;

  if not (public.owns_instituicao(c_inst) or public.is_admin()) then
    raise exception 'Sem permissão para aprovar esta cartinha';
  end if;

  update public.cartinhas
  set status = 'disponivel', aprovada_em = now()
  where id     = _cartinha_id
    and status = 'aguardando'
  returning * into resultado;

  if not found then
    raise exception 'Cartinha % não está aguardando análise', _cartinha_id;
  end if;

  return resultado;
end $$;

-- ═══ RPC: cancelar_cartinha ═════════════════════════════════════
-- Cancela uma cartinha em qualquer estado não-terminal.
create or replace function public.cancelar_cartinha(
  _cartinha_id bigint,
  _motivo      text default null
)
returns public.cartinhas
language plpgsql security definer
set search_path = public, auth
as $$
declare
  resultado public.cartinhas%rowtype;
  c_inst    bigint;
begin
  select inst_id into c_inst from public.cartinhas where id = _cartinha_id;

  if c_inst is null then
    raise exception 'Cartinha % não encontrada', _cartinha_id;
  end if;

  if not (public.owns_instituicao(c_inst) or public.is_admin()) then
    raise exception 'Sem permissão para cancelar esta cartinha';
  end if;

  update public.cartinhas
  set
    status        = 'cancelada',
    cancelada_em  = now(),
    motivo_cancel = _motivo
  where id     = _cartinha_id
    and status not in ('entregue', 'cancelada')
  returning * into resultado;

  if not found then
    raise exception 'Cartinha % já foi entregue ou cancelada — não pode ser alterada', _cartinha_id;
  end if;

  return resultado;
end $$;

-- ═══ RPC: cadastrar_cartinha ════════════════════════════════════
-- Cria criança + cartinha numa única transação atômica.
-- Garante que a inst_id da cartinha bate com a da criança recém-criada.
create or replace function public.cadastrar_cartinha(
  _inst_id       bigint,
  _nome_crianca  text,
  _data_nasc     date,
  _genero        text,
  _categoria_id  bigint,
  _texto         text,
  _foto_url      text default null
)
returns public.cartinhas
language plpgsql security definer
set search_path = public, auth
as $$
declare
  nova_crianca_id bigint;
  nova            public.cartinhas%rowtype;
begin
  if not (public.owns_instituicao(_inst_id) or public.is_admin()) then
    raise exception 'Sem permissão para cadastrar cartinha nesta instituição';
  end if;

  insert into public.criancas (inst_id, nome, data_nasc, genero)
  values (_inst_id, _nome_crianca, _data_nasc, coalesce(_genero, 'nao-informado'))
  returning id into nova_crianca_id;

  insert into public.cartinhas (crianca_id, inst_id, categoria_id, texto, foto_url, status)
  values (nova_crianca_id, _inst_id, _categoria_id, _texto, _foto_url, 'aguardando')
  returning * into nova;

  return nova;
end $$;

-- ═══ Permissões: usuários autenticados chamam os RPCs ═══════════
grant execute on function public.adotar_cartinha(bigint, bigint)              to authenticated;
grant execute on function public.marcar_entregue(bigint)                      to authenticated;
grant execute on function public.aprovar_cartinha(bigint)                     to authenticated;
grant execute on function public.cancelar_cartinha(bigint, text)              to authenticated;
grant execute on function public.cadastrar_cartinha(bigint,text,date,text,bigint,text,text) to authenticated;
