# Conectando Sonhos — Modelagem de Dados (v2)

> **Projeto:** Conectando Sonhos · FATEC DSM 2º Semestre · Equipe QuadCore  
> **SGBD:** PostgreSQL 15 via Supabase  
> **Versão:** 2.0 — IDs numéricos sequenciais (BIGINT IDENTITY)

---

## 1. Modelo Conceitual — DER

### 1.1 Entidades e Atributos Principais

| Entidade | Atributos-chave | Descrição |
|---|---|---|
| **INSTITUIÇÃO** | nome, tipo, cnpj, email | Organização parceira (ONG, abrigo, escola…) |
| **USUÁRIO** | nome, email, tipo | Doador, operador de instituição ou admin |
| **CRIANÇA** | nome, data_nasc, genero | PII sensível; vinculada a uma instituição |
| **CARTINHA** | texto, status, foto_url | Pedido de presente; entidade central |
| **CATEGORIA** | slug, nome, grupo | Catálogo de tipos de presente |
| **PONTO DE COLETA** | nome, endereco, bairro | Local físico de entrega dos presentes |
| **EVENTO DE CARTINHA** | tipo, ator_tipo, payload | Audit log das transições de estado |
| **DOAÇÃO DIRETA** | status, observacoes | Doação sem vínculo a cartinha específica |

### 1.2 Diagrama de Entidades e Relacionamentos

```
                    ┌─────────────────────────────────────────┐
                    │         auth.users (Supabase)           │
                    │  PK: id (UUID)                          │
                    └───────────────────┬─────────────────────┘
                                        │ 1:1 (auth_id)
                    ┌───────────────────▼─────────────────────┐
                    │              USUÁRIO                     │
                    │  PK: id (BIGINT)                         │
                    │  auth_id, nome, email, tipo, inst_id     │
                    └────────┬───────────────────┬────────────┘
                             │ N:1 (inst_id)     │ 1:N (doador_id)
                             │                   │
         ┌───────────────────▼──────┐    ┌───────▼────────────────────┐
         │        INSTITUIÇÃO       │    │         CARTINHA            │
         │  PK: id (BIGINT)         │◄───│  PK: id (BIGINT)           │
         │  nome, tipo, cnpj, email │1:N │  crianca_id, inst_id       │
         └────────────┬─────────────┘    │  categoria_id, ponto_id    │
                      │ 1:N              │  doador_id, status, texto  │
                      │                 └────┬──────────┬─────────────┘
         ┌────────────▼─────────────┐        │ 1:N      │ N:1
         │          CRIANÇA         │        │          │
         │  PK: id (BIGINT)         │        │   ┌──────▼──────────────┐
         │  inst_id, nome           │        │   │  EVENTO CARTINHA    │
         │  data_nasc, genero       │        │   │  PK: id (BIGINT)    │
         └──────────────────────────┘        │   │  tipo, ator_id      │
                                             │   │  payload (JSONB)    │
                                             │   └─────────────────────┘
         ┌───────────────────────────┐       │
         │    CATEGORIA PRESENTE     │       │ N:1 (categoria_id)
         │  PK: id (BIGINT)          ├───────┘
         │  slug, nome, grupo, icone │
         └───────────────────────────┘

         ┌───────────────────────────┐
         │      PONTO DE COLETA      │◄──── cartinhas.ponto_id  (N:1)
         │  PK: id (BIGINT)          │◄──── doacoes_diretas.ponto_id (N:1)
         │  nome, bairro, lat, lng   │
         └───────────────────────────┘

         ┌───────────────────────────┐
         │       DOAÇÃO DIRETA       │
         │  PK: id (BIGINT)          │
         │  doador_id, categoria_id  │
         │  ponto_id, status         │
         └───────────────────────────┘
```

### 1.3 Relacionamentos e Cardinalidades

| De | Para | Cardinalidade | Descrição |
|---|---|---|---|
| auth.users | usuarios | 1:1 obrigatório | Cada conta de autenticação tem exatamente um perfil |
| usuarios | instituicoes | N:1 opcional | Operador de instituição referencia a organização que opera |
| instituicoes | criancas | 1:N obrigatório | Instituição cadastra N crianças |
| instituicoes | cartinhas | 1:N obrigatório | Instituição publica N cartinhas |
| criancas | cartinhas | 1:N obrigatório | Criança pode ter N cartinhas ao longo do tempo |
| categorias_presente | cartinhas | 1:N obrigatório | Cada cartinha pertence a 1 categoria |
| usuarios (doador) | cartinhas | 1:N opcional | Doador adota N cartinhas |
| pontos_coleta | cartinhas | 1:N opcional | Ponto recebe N presentes |
| cartinhas | eventos_cartinha | 1:N obrigatório | Toda transição gera ao menos 1 evento |
| usuarios | doacoes_diretas | 1:N opcional | Doador registra doações diretas |
| categorias_presente | doacoes_diretas | 1:N obrigatório | Doação direta tem categoria |
| pontos_coleta | doacoes_diretas | 1:N obrigatório | Doação direta designa ponto de entrega |

---

## 2. Modelo Lógico

### 2.1 Estrutura das Tabelas

#### `public.instituicoes`
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| **id** | BIGINT | PK, IDENTITY | Identificador sequencial |
| nome | TEXT | NOT NULL | Nome da organização |
| tipo | TEXT | NOT NULL, CHECK | ong \| abrigo \| projeto-social \| escola \| igreja \| outro |
| cnpj | TEXT | UNIQUE | CNPJ formatado |
| email | TEXT | NOT NULL, UNIQUE | E-mail institucional de contato |
| telefone | TEXT | — | Telefone de contato |
| endereco | TEXT | — | Logradouro e número |
| bairro | TEXT | — | Bairro |
| cidade | TEXT | NOT NULL, DEFAULT 'Franca' | Município |
| uf | TEXT | NOT NULL, DEFAULT 'SP', CHECK len=2 | Estado |
| responsavel_nome | TEXT | NOT NULL | Nome do responsável |
| responsavel_email | TEXT | — | E-mail do responsável |
| responsavel_telefone | TEXT | — | Telefone do responsável |
| verificada | BOOLEAN | NOT NULL, DEFAULT false | Aprovada pela equipe CS |
| ativa | BOOLEAN | NOT NULL, DEFAULT true | Soft-delete |
| observacoes | TEXT | — | Notas internas |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | — |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Atualizado por trigger |

#### `public.usuarios`
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| **id** | BIGINT | PK, IDENTITY | Identificador sequencial de negócio |
| auth_id | UUID | NOT NULL, UNIQUE, FK→auth.users(id) CASCADE | Chave do Supabase Auth |
| nome | TEXT | NOT NULL | Nome de exibição |
| email | TEXT | NOT NULL, UNIQUE | E-mail (espelha auth.users) |
| telefone | TEXT | — | — |
| tipo | TEXT | NOT NULL, DEFAULT 'doador', CHECK | doador \| instituicao \| admin |
| inst_id | BIGINT | FK→instituicoes(id) SET NULL | Preenchido só para tipo=instituicao |
| cep | TEXT | — | — |
| uf | TEXT | CHECK len=2 | — |
| cidade | TEXT | — | — |
| bairro | TEXT | — | — |
| endereco | TEXT | — | — |
| avatar_url | TEXT | — | URL do avatar no Storage |
| ativo | BOOLEAN | NOT NULL, DEFAULT true | Soft-delete |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | — |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Atualizado por trigger |

#### `public.pontos_coleta`
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| **id** | BIGINT | PK, IDENTITY | — |
| nome | TEXT | NOT NULL | Nome do ponto |
| endereco | TEXT | NOT NULL | Logradouro e número |
| bairro | TEXT | NOT NULL | Bairro |
| cidade | TEXT | NOT NULL, DEFAULT 'Franca' | — |
| uf | TEXT | NOT NULL, DEFAULT 'SP', CHECK len=2 | — |
| cep | TEXT | — | — |
| lat | DOUBLE PRECISION | — | Latitude (WGS-84) |
| lng | DOUBLE PRECISION | — | Longitude (WGS-84) |
| horario | TEXT | — | Ex: "Seg–Sex · 9h–17h" |
| responsavel | TEXT | — | Nome do responsável |
| telefone | TEXT | — | — |
| ativo | BOOLEAN | NOT NULL, DEFAULT true | Soft-delete |
| ordem | INTEGER | NOT NULL, DEFAULT 0 | Ordenação no mapa/lista |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | — |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | — |

#### `public.categorias_presente`
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| **id** | BIGINT | PK, IDENTITY | — |
| slug | TEXT | NOT NULL, UNIQUE, CHECK regex ^[a-z0-9-]+$ | Identificador imutável |
| nome | TEXT | NOT NULL | Nome de exibição |
| grupo | TEXT | NOT NULL, CHECK | brinquedos \| esportes \| escola \| roupas \| outros |
| icone | TEXT | — | Classe Bootstrap Icons |
| ordem | INTEGER | NOT NULL, DEFAULT 0 | Ordenação no filtro/donut |
| ativa | BOOLEAN | NOT NULL, DEFAULT true | Soft-delete |

#### `public.criancas`
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| **id** | BIGINT | PK, IDENTITY | — |
| inst_id | BIGINT | NOT NULL, FK→instituicoes(id) RESTRICT | Organização responsável |
| nome | TEXT | NOT NULL | Nome completo (PII) |
| data_nasc | DATE | NOT NULL, CHECK ≤ today | Data de nascimento (PII) |
| genero | TEXT | NOT NULL, DEFAULT 'nao-informado', CHECK | F \| M \| outro \| nao-informado |
| observacoes | TEXT | — | Notas da instituição |
| ativa | BOOLEAN | NOT NULL, DEFAULT true | Soft-delete |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | — |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | — |

#### `public.cartinhas`
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| **id** | BIGINT | PK, IDENTITY | — |
| crianca_id | BIGINT | NOT NULL, FK→criancas(id) RESTRICT | Criança autora |
| inst_id | BIGINT | NOT NULL, FK→instituicoes(id) RESTRICT | Deve igualar crianca.inst_id |
| categoria_id | BIGINT | NOT NULL, FK→categorias_presente(id) RESTRICT | Tipo de presente pedido |
| texto | TEXT | NOT NULL, CHECK len 20–2000 | Texto da carta |
| foto_url | TEXT | — | URL da foto (opcional) |
| status | TEXT | NOT NULL, DEFAULT 'aguardando', CHECK | Máquina de estados (ver §2.3) |
| doador_id | BIGINT | FK→usuarios(id) SET NULL | Quem adotou; nulo até adoção |
| ponto_id | BIGINT | FK→pontos_coleta(id) SET NULL | Ponto designado para entrega |
| enviada_em | TIMESTAMPTZ | NOT NULL, DEFAULT now() | — |
| aprovada_em | TIMESTAMPTZ | CHECK ≥ enviada_em | Preenchido ao aprovar |
| adotada_em | TIMESTAMPTZ | CHECK ≥ aprovada_em | Preenchido ao adotar |
| entregue_em | TIMESTAMPTZ | CHECK ≥ adotada_em | Preenchido ao confirmar entrega |
| cancelada_em | TIMESTAMPTZ | — | Preenchido ao cancelar |
| motivo_cancel | TEXT | — | Motivo do cancelamento |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | — |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | — |

#### `public.eventos_cartinha`
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| **id** | BIGINT | PK, IDENTITY | — |
| cartinha_id | BIGINT | NOT NULL, FK→cartinhas(id) CASCADE | Cartinha relacionada |
| tipo | TEXT | NOT NULL, CHECK | criada \| aprovada \| adotada \| entregue \| cancelada \| editada |
| ator_id | BIGINT | FK→usuarios(id) SET NULL | Quem executou a ação |
| ator_tipo | TEXT | CHECK | doador \| instituicao \| admin \| sistema |
| payload | JSONB | — | Contexto JSON (status anterior/novo, etc.) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Imutável — nunca updated_at |

#### `public.doacoes_diretas`
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| **id** | BIGINT | PK, IDENTITY | — |
| doador_id | BIGINT | FK→usuarios(id) SET NULL | Nulo para doadores anônimos |
| doador_nome | TEXT | — | Nome quando anônimo |
| doador_email | TEXT | — | E-mail quando anônimo |
| categoria_id | BIGINT | NOT NULL, FK→categorias_presente(id) | Tipo de item doado |
| ponto_id | BIGINT | NOT NULL, FK→pontos_coleta(id) | Ponto de entrega |
| status | TEXT | NOT NULL, DEFAULT 'pendente', CHECK | pendente \| recebida \| redirecionada \| cancelada |
| observacoes | TEXT | — | — |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | — |
| recebida_em | TIMESTAMPTZ | — | Confirmação de recebimento |

### 2.2 Regras de Negócio

1. **Consistência de instituição**: `cartinhas.inst_id` deve sempre ser igual ao `criancas.inst_id` da criança vinculada (verificado por trigger antes de INSERT/UPDATE).
2. **Doação com identificação**: `doacoes_diretas` exige `doador_id IS NOT NULL OR doador_email IS NOT NULL` — nunca completamente anônimo.
3. **Texto da cartinha**: Entre 20 e 2000 caracteres; tamanho mínimo para garantir conteúdo real.
4. **Soft-delete universal**: Nenhuma entidade é removida fisicamente; utilizar flag `ativo = false`.
5. **Categorias imutáveis por slug**: O `slug` é usado como identificador em integrações; nunca deve ser renomeado.
6. **Audit log obrigatório**: Todo INSERT e toda mudança de `status` em `cartinhas` gera um registro em `eventos_cartinha` via trigger.
7. **Timestamps ordenados**: Constraints garantem a ordem lógica `enviada_em ≤ aprovada_em ≤ adotada_em ≤ entregue_em`.

### 2.3 Máquina de Estados — Cartinha

```
                        ┌─────────────┐
                   ┌───►│  aguardando │ (status inicial)
                   │    └──────┬──────┘
                   │           │ aprovar_cartinha()
                   │           ▼
                   │    ┌─────────────┐
                   │    │  disponivel │ (visível no mural público)
                   │    └──────┬──────┘
                   │           │ adotar_cartinha()
                   │           ▼
                   │    ┌─────────────┐
                   │    │   adotada   │ (doador comprometeu)
                   │    └──────┬──────┘
                   │           │ marcar_entregue()
                   │           ▼
                   │    ┌─────────────┐
                   │    │   entregue  │ ◄── estado terminal
                   │    └─────────────┘
                   │
         cancelar_cartinha() (de qualquer estado não-terminal)
                   │
                   ▼
            ┌────────────┐
            │  cancelada │ ◄── estado terminal
            └────────────┘
```

---

## 3. Modelo Físico

### 3.1 Decisões de Implementação

| Decisão | Escolha | Justificativa |
|---|---|---|
| Tipo de PK | `BIGINT GENERATED ALWAYS AS IDENTITY` | Sequencial, compacto (8 bytes), legível em logs; gerado pelo PostgreSQL sem extensão |
| Chave de Auth | `usuarios.auth_id UUID` separado da PK | Isola UUID de autenticação do PK de negócio; evita exposição em URLs/FKs |
| Enums | `TEXT + CHECK constraint` | Mais fácil de evoluir que `ENUM` nativo; sem custo de ALTER TYPE |
| Soft-delete | Flag `ativo BOOLEAN` | Preserva histórico; dados relacionados nunca ficam órfãos |
| Audit log | Tabela `eventos_cartinha` | Rastreabilidade completa de quem fez o quê e quando |
| Busca textual | `GIN (to_tsvector('portuguese', texto))` | Pesquisa full-text em português sem extensão externa |
| Geolocalização | `lat/lng DOUBLE PRECISION` | Suficiente para coordenadas WGS-84; sem PostGIS para simplificar deploy |

### 3.2 Índices Estratégicos

| Índice | Tabela | Colunas | Tipo | Finalidade |
|---|---|---|---|---|
| `idx_inst_ativa` | instituicoes | `(ativa)` WHERE ativa=true | Parcial B-tree | Listar parceiros ativos |
| `idx_inst_verif` | instituicoes | `(verificada)` WHERE verificada=true | Parcial B-tree | Filtrar instituições aprovadas |
| `idx_inst_cidade` | instituicoes | `(cidade, uf)` | B-tree | Busca geográfica |
| `idx_user_auth` | usuarios | `(auth_id)` | B-tree | Lookup por UUID do Supabase Auth (RLS) |
| `idx_user_tipo` | usuarios | `(tipo)` | B-tree | Separar doadores de operadores |
| `idx_user_inst` | usuarios | `(inst_id)` WHERE NOT NULL | Parcial B-tree | Operadores por instituição |
| `idx_pc_ativo` | pontos_coleta | `(ativo, ordem)` WHERE ativo=true | Parcial B-tree | Listar pontos ativos ordenados |
| `idx_cat_grupo_ordem` | categorias_presente | `(grupo, ordem)` WHERE ativa=true | Parcial B-tree | Filtro por grupo no mural |
| `idx_crc_inst` | criancas | `(inst_id)` | B-tree | Crianças por instituição |
| `idx_crt_status` | cartinhas | `(status, enviada_em DESC)` | B-tree | Filtro de status com ordenação temporal |
| `idx_crt_inst` | cartinhas | `(inst_id, status)` | B-tree | Dashboard da instituição |
| `idx_crt_doador` | cartinhas | `(doador_id)` WHERE NOT NULL | Parcial B-tree | Dashboard do doador |
| `idx_crt_categoria` | cartinhas | `(categoria_id)` | B-tree | Filtro por categoria no mural |
| `idx_crt_ponto` | cartinhas | `(ponto_id)` WHERE NOT NULL | Parcial B-tree | Volume por ponto de coleta |
| `idx_crt_busca` | cartinhas | `to_tsvector('portuguese', texto)` | GIN | Pesquisa livre no texto |
| `idx_evt_cartinha` | eventos_cartinha | `(cartinha_id, created_at DESC)` | B-tree | Histórico por cartinha |
| `idx_dd_status` | doacoes_diretas | `(status)` | B-tree | Gestão de doações diretas |

### 3.3 Triggers e Funções

| Objeto | Tipo | Tabela | Momento | Finalidade |
|---|---|---|---|---|
| `set_updated_at()` | Trigger fn | — | BEFORE UPDATE | Atualiza `updated_at = now()` em todas as tabelas mutáveis |
| `handle_new_user()` | Trigger fn | auth.users | AFTER INSERT | Cria perfil em `public.usuarios` com `auth_id = new.id` |
| `log_cartinha_event()` | Trigger fn | cartinhas | AFTER INSERT/UPDATE | Registra evento em `eventos_cartinha` a cada mudança de status |
| `cartinha_inst_consistency()` | Trigger fn | cartinhas | BEFORE INSERT/UPDATE | Garante que `inst_id` da cartinha coincide com o da criança |
| `adotar_cartinha(id, ponto_id?)` | RPC | cartinhas | — | Doador adota cartinha disponível (atomicamente) |
| `marcar_entregue(id)` | RPC | cartinhas | — | Instituição confirma entrega do presente |
| `aprovar_cartinha(id)` | RPC | cartinhas | — | Instituição/admin publica cartinha no mural |
| `cancelar_cartinha(id, motivo?)` | RPC | cartinhas | — | Remove cartinha de circulação com motivo |
| `cadastrar_cartinha(...)` | RPC | criancas+cartinhas | — | Cria criança e cartinha na mesma transação |

### 3.4 Políticas RLS por Tabela

| Tabela | Leitura anon | Leitura auth | Escrita | Admin |
|---|---|---|---|---|
| instituicoes | Verificadas+ativas | Self | Self (update) | Tudo |
| usuarios | — | Self (auth_id) | Self | Tudo |
| pontos_coleta | Ativos | Ativos | — | Tudo |
| categorias_presente | Ativas | Ativas | — | Tudo |
| criancas | — | Inst dona | Inst dona | Tudo |
| cartinhas | disponivel/adotada/entregue | +Self(doador)+Inst | Inst(CRUD)+Doador(adotar) | Tudo |
| eventos_cartinha | — | Doador/Inst da cartinha | Sistema (trigger) | Tudo |
| doacoes_diretas | — | Self | Qualquer (insert) | Tudo |

### 3.5 Views

| View | Acesso | Finalidade |
|---|---|---|
| `vw_cartinhas_publicas` | anon, authenticated | Mural público sem PII (1º nome + idade calculada) |
| `vw_impacto` | anon, authenticated | KPIs agregados (total, adotadas, entregues, doadores…) |
| `vw_distribuicao_categoria` | anon, authenticated | Percentual por categoria (donut chart) |
| `vw_trajetoria_anual` | anon, authenticated | Adoções e entregas por ano (bar chart) |
| `vw_volume_pontos` | anon, authenticated | Entregas por ponto de coleta (mapa) |

Todas as views usam `security_invoker = true`: as políticas RLS do usuário chamador são aplicadas.

---

## 4. Guia de Implantação no Supabase

### 4.1 Ordem de Execução

```
1. supabase/migrations/20260509000001_estrutura_inicial_banco.sql   → tabelas, índices, constraints
2. supabase/migrations/20260509000002_politicas_seguranca_rls.sql   → RLS + helpers de autorização
3. supabase/migrations/20260509000003_funcoes_banco.sql             → triggers + RPCs
4. supabase/migrations/20260509000004_visualizacoes_banco.sql       → views públicas
5. supabase/dados_iniciais_sistema.sql                              → dados iniciais (dev/staging)
```

### 4.2 Alteração de Schema (após deploy)

- Para adicionar coluna: `ALTER TABLE ... ADD COLUMN` (nunca recriar tabela).
- Para adicionar valor a CHECK de enum: adicionar nova constraint, remover a antiga.
- Para renomear tabela/coluna: atualizar todas as views, RPCs e policies antes.
- Índices podem ser criados/removidos a qualquer momento (`CONCURRENTLY` em produção).

### 4.3 Checklist de Conexão

- [ ] `SUPABASE_CONFIG.url` e `SUPABASE_CONFIG.anonKey` configurados em `supabase-config.js`
- [ ] `SUPABASE_CONFIG.demo` definido como `false`
- [ ] Migrações executadas na ordem acima
- [ ] Seed executado (opcional, para dados de demonstração)
- [ ] Trigger `on_auth_user_created` ativo em `auth.users`
- [ ] RLS habilitado em todas as 8 tabelas
