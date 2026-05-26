-- ═══════════════════════════════════════════════════════════════
-- Conectando Sonhos · Views de Análise (v2)
--
-- Views alimentam dashboards e o mural público sem expor PII nem
-- estrutura interna. security_invoker = true para que as políticas
-- RLS do usuário chamador sejam respeitadas.
-- ═══════════════════════════════════════════════════════════════

-- ═══ Mural público de cartinhas ════════════════════════════════
-- Expõe apenas primeiro nome e idade da criança (sem data de nascimento
-- completa) para preservar privacidade, sem abrir dados sensíveis.
create or replace view public.vw_cartinhas_publicas
with (security_invoker = true) as
select
  c.id,
  c.texto,
  c.foto_url,
  c.status,
  c.enviada_em,
  c.adotada_em,
  c.entregue_em,

  -- Criança: somente primeiro nome + idade calculada
  split_part(cr.nome, ' ', 1)              as crianca_nome,
  date_part('year', age(cr.data_nasc))::int as crianca_idade,
  cr.genero                                as crianca_genero,

  -- Categoria
  cat.id    as categoria_id,
  cat.slug  as categoria_slug,
  cat.nome  as categoria_nome,
  cat.grupo as categoria_grupo,
  cat.icone as categoria_icone,

  -- Instituição
  i.id      as inst_id,
  i.nome    as inst_nome,
  i.cidade  as inst_cidade
from      public.cartinhas          c
join      public.criancas           cr  on cr.id  = c.crianca_id
join      public.categorias_presente cat on cat.id = c.categoria_id
join      public.instituicoes       i   on i.id   = c.inst_id
where c.status in ('disponivel', 'adotada', 'entregue')
  and i.ativa
  and i.verificada;

comment on view public.vw_cartinhas_publicas is
  'Cartinhas visíveis no mural público; sem PII completo da criança';

-- ═══ KPIs de impacto ═══════════════════════════════════════════
create or replace view public.vw_impacto
with (security_invoker = true) as
select
  (select count(*)           from public.cartinhas
   where status <> 'cancelada')                                             as total,
  (select count(*)           from public.cartinhas
   where status in ('adotada','entregue'))                                  as adotadas,
  (select count(*)           from public.cartinhas
   where status = 'entregue')                                               as entregues,
  (select count(distinct doador_id) from public.cartinhas
   where doador_id is not null)                                             as doadores,
  (select count(*)           from public.instituicoes
   where verificada and ativa)                                              as instituicoes,
  (select count(*)           from public.pontos_coleta
   where ativo)                                                             as pontos_coleta,
  (select count(*)           from public.cartinhas
   where status = 'disponivel')                                             as aguardando;

comment on view public.vw_impacto is 'KPIs agregados para o painel de impacto';

-- ═══ Distribuição por categoria (donut chart) ══════════════════
create or replace view public.vw_distribuicao_categoria
with (security_invoker = true) as
select
  cat.id                                                                as categoria_id,
  cat.slug,
  cat.nome,
  cat.grupo,
  count(c.id)                                                           as quantidade,
  round(
    100.0 * count(c.id)
    / nullif(
        (select count(*) from public.cartinhas
         where status in ('adotada','entregue')),
        0
      ),
    1
  )                                                                     as percentual
from      public.categorias_presente cat
left join public.cartinhas c
       on c.categoria_id = cat.id
      and c.status in ('adotada','entregue')
group by cat.id, cat.slug, cat.nome, cat.grupo, cat.ordem
order by cat.ordem;

-- ═══ Trajetória histórica anual (bar chart) ════════════════════
create or replace view public.vw_trajetoria_anual
with (security_invoker = true) as
select
  date_part('year', enviada_em)::int                              as ano,
  count(*) filter (where status in ('adotada','entregue'))        as adotadas,
  count(*) filter (where status = 'entregue')                     as entregues,
  count(*)                                                        as total_enviadas
from public.cartinhas
where status <> 'cancelada'
group by date_part('year', enviada_em)
order by ano;

-- ═══ Volume de entregas por ponto de coleta ════════════════════
create or replace view public.vw_volume_pontos
with (security_invoker = true) as
select
  p.id,
  p.nome,
  p.endereco,
  p.bairro,
  p.cidade,
  p.uf,
  p.lat,
  p.lng,
  count(c.id) filter (where c.status = 'entregue') as entregas,
  count(c.id) filter (where c.status = 'adotada')  as em_rota
from      public.pontos_coleta p
left join public.cartinhas     c on c.ponto_id = p.id
where p.ativo
group by p.id
order by p.ordem;

-- ═══ Permissões de leitura (anon + authenticated) ══════════════
grant select on public.vw_cartinhas_publicas     to anon, authenticated;
grant select on public.vw_impacto                to anon, authenticated;
grant select on public.vw_distribuicao_categoria to anon, authenticated;
grant select on public.vw_trajetoria_anual       to anon, authenticated;
grant select on public.vw_volume_pontos          to anon, authenticated;
