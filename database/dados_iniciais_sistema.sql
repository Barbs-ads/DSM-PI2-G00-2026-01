-- ═══════════════════════════════════════════════════════════════
-- Conectando Sonhos · Seed Data Oficial e Resiliente (v3)
-- ═══════════════════════════════════════════════════════════════

-- ═══ 1. CATEGORIAS DE PRESENTE ════════════════════════════════════
insert into public.categorias_presente (slug, nome, grupo, icone, ordem) values
  ('bonecas',     'Bonecas e Acessórios',   'brinquedos', 'bi-balloon-heart',    10),
  ('veiculos',    'Carrinhos e Veículos',   'brinquedos', 'bi-truck',            11),
  ('herois',      'Bonecos de Heróis',      'brinquedos', 'bi-shield-fill',      12),
  ('pelucia',     'Bichinho de Pelúcia',    'brinquedos', 'bi-emoji-heart-eyes', 13),
  ('jogos',       'Jogos e Quebra-Cabeças', 'brinquedos', 'bi-puzzle',           14),
  ('educativos',  'Brinquedos Educativos',  'brinquedos', 'bi-lightbulb',        15),
  ('bolas',       'Bola Esportiva',         'esportes',   'bi-circle',           20),
  ('rodas',       'Skate / Patins',         'esportes',   'bi-bicycle',          21),
  ('bicicleta',   'Bicicleta',              'esportes',   'bi-bicycle',          22),
  ('kit-escolar', 'Kit Escolar Completo',   'escola',     'bi-backpack',         30),
  ('mochila',     'Mochila ou Estojo',      'escola',     'bi-bag',              31),
  ('livros',      'Livros e Gibis',         'escola',     'bi-book-half',        32),
  ('arte',        'Kit de Pintura e Arte',  'escola',     'bi-palette',          33),
  ('roupa',       'Roupas',                 'roupas',     'bi-person',           40),
  ('tenis',       'Tênis',                  'roupas',     'bi-cone-striped',     41),
  ('sandalia',    'Sandália ou Chinelo',    'roupas',     'bi-cone',             42),
  ('higiene',     'Kit de Higiene',         'outros',     'bi-droplet',          50),
  ('tecnologia',  'Eletrônico',             'outros',     'bi-tablet',           51),
  ('outro',       'Outro',                  'outros',     'bi-three-dots',       99);

-- ═══ 2. INSTITUIÇÕES PARCEIRAS ════════════════════════════════════
insert into public.instituicoes
  (nome, tipo, cnpj, email, telefone, endereco, bairro,
   responsavel_nome, responsavel_email, responsavel_telefone, verificada, ativa)
values
  ('ONG Raízes',
   'ong', '12.345.678/0001-90', 'contato@ongraizes.org', '(16) 3722-1100',
   'R. Alberto de Azevedo, 379', 'Santa Helena',
   'Mariana Costa', 'mariana@ongraizes.org', '(16) 99876-1100', true, true),

  ('Pastoral do Menor de Franca',
   'projeto-social', '23.456.789/0001-01', 'pastoral@diocesefranca.org', '(16) 3722-2200',
   'Av. Paulo Pucci, 79', 'Santa Efigênia',
   'Pe. João Batista', 'pejoao@diocesefranca.org', '(16) 99876-2200', true, true),

  ('Lar Esperança',
   'abrigo', '34.567.890/0001-12', 'lar@esperanca.org.br', '(16) 3722-3300',
   'R. Cândido Portinari, 899', 'Campos Elísios',
   'Rosângela Ferreira', 'rosangela@esperanca.org.br', '(16) 99876-3300', true, true),

  ('Casa da Criança',
   'abrigo', '45.678.901/0001-23', 'casa@dacrianca.org', '(16) 3722-4400',
   'R. Augusto dos Anjos, 551', 'Jd. Oliveiras',
   'Helena Souza', 'helena@dacrianca.org', '(16) 99876-4400', true, true),

  ('Abrigo Sol Nascente',
   'abrigo', '56.789.012/0001-34', 'sol@nascente.org.br', '(16) 3722-5500',
   'R. Manoel de Barros, 628', 'Jd. Esmeralda',
   'Carlos Andrade', 'carlos@nascente.org.br', '(16) 99876-5500', true, true);

-- ═══ 3. PONTOS DE COLETA ══════════════════════════════════════════
insert into public.pontos_coleta
  (nome, endereco, bairro, cep, lat, lng, horario, responsavel, telefone, ordem)
values
  ('Ponto Santa Helena',   'R. Alberto de Azevedo, 379',  'Santa Helena',   '14403-001',
   -20.5388, -47.4012, 'Seg–Sex · 9h–17h',  'Mariana Costa',    '(16) 3722-1100', 1),

  ('Ponto Santa Efigênia', 'Av. Paulo Pucci, 79',          'Santa Efigênia', '14403-100',
   -20.5421, -47.3998, 'Seg–Sex · 8h–18h',  'Pe. João Batista', '(16) 3722-2200', 2),

  ('Ponto Campos Elísios', 'R. Cândido Portinari, 899',   'Campos Elísios', '14400-200',
   -20.5455, -47.4055, 'Seg–Sáb · 9h–17h',  'Rosângela Ferreira','(16) 3722-3300', 3),

  ('Ponto Jd. Oliveiras',  'R. Augusto dos Anjos, 551',   'Jd. Oliveiras',  '14406-300',
   -20.5512, -47.4111, 'Seg–Sex · 10h–16h', 'Helena Souza',     '(16) 3722-4400', 4),

  ('Ponto Jd. Esmeralda',  'R. Manoel de Barros, 628',    'Jd. Esmeralda',  '14409-400',
   -20.5588, -47.4188, 'Ter–Sáb · 9h–17h',  'Carlos Andrade',   '(16) 3722-5500', 5);

-- ═══ 4. CRIANÇAS ══════════════════════════════════════════════════
insert into public.criancas (inst_id, nome, data_nasc, genero)
select i.id, t.nome, t.data_nasc::date, t.genero
from (values
  ('contato@ongraizes.org',      'Ana Luiza Silva',     '2017-03-12', 'F'),
  ('pastoral@diocesefranca.org', 'Miguel Santos',       '2016-07-08', 'M'),
  ('lar@esperanca.org.br',       'Sofia Oliveira',      '2018-11-25', 'F'),
  ('casa@dacrianca.org',         'Pedro Henrique Lima', '2015-04-02', 'M'),
  ('contato@ongraizes.org',      'Isabella Costa',      '2017-09-18', 'F'),
  ('pastoral@diocesefranca.org', 'Lucas Rodrigues',     '2016-01-30', 'M'),
  ('lar@esperanca.org.br',       'Maria Clara Alves',   '2019-06-14', 'F'),
  ('casa@dacrianca.org',         'Enzo Ribeiro',        '2015-12-03', 'M'),
  ('contato@ongraizes.org',      'Valentina Pereira',   '2018-05-20', 'F'),
  ('casa@dacrianca.org',         'Arthur Mendes',       '2016-08-14', 'M'),
  ('lar@esperanca.org.br',       'Lívia Souza',         '2019-02-28', 'F'),
  ('pastoral@diocesefranca.org', 'Gustavo Almeida',     '2017-10-05', 'M')
) as t(inst_email, nome, data_nasc, genero)
join public.instituicoes i on i.email = t.inst_email;

-- ═══ 5. CARTINHAS DISPONÍVEIS ═════════════════════════════════════
-- Fazendo um JOIN direto na tabela final de crianças cadastrada para garantir consistência total de IDs e burlar a trigger de validação de instituição
insert into public.cartinhas (crianca_id, inst_id, categoria_id, texto, status, enviada_em, aprovada_em)
select cr.id, cr.inst_id, cat.id, t.texto, 'disponivel', now() - interval '2 days', now() - interval '1 day'
from (values
  ('Ana Luiza Silva',     'bonecas',      'Querido Papai Noel, eu nunca tive uma boneca só minha de verdade. Meu sonho é ter uma com cabelo comprido pra pentear e dar banho. Ia chamar ela de Princesa e ser a melhor mãe do mundo pra ela!'),
  ('Miguel Santos',       'veiculos',     'Oi, eu sou Miguel e tenho 8 anos. Adoro corrida e meu sonho é ter um carrinho de controle remoto igual ao do meu amigo Kaique. A gente ia brincar todo recreio e eu ia ser o campeão!'),
  ('Sofia Oliveira',      'pelucia',      'Eu quero um ursinho de pelúcia grandão pra abraçar quando fico com medo à noite. Mamãe disse que ursinho espanta pesadelo. Eu cuidaria muito bem dele e daria banho todo sábado.'),
  ('Pedro Henrique Lima', 'bicicleta',    'Tenho 11 anos e meu maior sonho é uma bicicleta pra ir pra escola sem pegar ônibus cheio. Assim minha mãe economiza a passagem e eu chego mais rápido. Prometo cuidar dela e pedalar todo dia!'),
  ('Isabella Costa',      'kit-escolar',  'Preciso de lápis de cor e caderno novos. O meu acabou e fico sem fazer atividades de arte. Quero ser professora quando crescer. Minha profe disse que tenho talento pra desenhar flores e borboletas!'),
  ('Maria Clara Alves',   'arte',         'Adoro pintar mas só tenho um lápis de grafite. Com tintas eu podia fazer quadros coloridos e dar de presente pra minha vovó que tá doente no hospital. Ela ia ficar tão feliz!'),
  ('Enzo Ribeiro',        'jogos',        'Quero um jogo de tabuleiro pra jogar com minha irmã e minha vovó. Assim a gente se diverte junto sem precisar de celular que a gente não tem em casa. Seria a melhor tarde!'),
  ('Valentina Pereira',   'livros',       'Eu amo ler mas na biblioteca tem fila grande e poucos livros. Se eu tiver livros em casa posso ler toda hora! Quero ser escritora e escrever histórias de princesas corajosas que salvam o mundo.'),
  ('Arthur Mendes',       'tenis',        'Meu tênis furou na sola e quando chove entra água. Chego na escola com pé molhado e fico envergonhado. Um tênis novo seria incrível pra eu chegar bonito e estudar sem sofrer no frio.'),
  ('Gustavo Almeida',     'educativos',   'Gosto de montar coisas e inventar brinquedos com caixas e palitos. Minha profe disse que tenho jeito de engenheiro! Quero um brinquedo de montar de verdade pra aprender como tudo funciona.')
) as t(crianca_nome, cat_slug, texto)
join public.criancas            cr  on cr.nome = t.crianca_nome
join public.categorias_presente cat on cat.slug = t.cat_slug;

-- ═══ 6. CARTINHA JÁ ENTREGUE ═════════════════════════════════════
insert into public.cartinhas (crianca_id, inst_id, categoria_id, texto, status, enviada_em, aprovada_em, adotada_em, entregue_em, ponto_id)
select cr.id, cr.inst_id, cat.id, 
  'Sou apaixonado por futebol desde bebê. Meu pai diz que tenho talento mas não tenho bola. Com uma bola boa eu treino todo dia e quem sabe um dia eu jogo pelo Brasil!',
  'entregue', now() - interval '30 days', now() - interval '25 days', now() - interval '15 days', now() - interval '7 days',
  (select id from public.pontos_coleta where bairro = 'Santa Efigênia' limit 1)
from public.criancas            cr
join public.categorias_presente cat on cat.slug = 'bolas'
where cr.nome = 'Lucas Rodrigues';

-- ═══ 7. CARTINHA ADOTADA ═════════════════════════════════════════
insert into public.cartinhas (crianca_id, inst_id, categoria_id, texto, status, enviada_em, aprovada_em, adotada_em, ponto_id)
select cr.id, cr.inst_id, cat.id, 
  'Cresci e minhas roupas ficaram pequeninhas. Minha mãe tá procurando emprego. Quero roupas novas pra ir na escola bonita e ter amigas. É triste usar roupa curta demais na frente de todo mundo.',
  'adotada', now() - interval '15 days', now() - interval '10 days', now() - interval '3 days',
  (select id from public.pontos_coleta where bairro = 'Campos Elísios' limit 1)
from public.criancas            cr
join public.categorias_presente cat on cat.slug = 'roupa'
where cr.nome = 'Lívia Souza';