const express = require('express');
const router  = express.Router();

const authController        = require('../controllers/authController');
const cartinhaController    = require('../controllers/cartinhaController');
const instituicaoController = require('../controllers/instituicaoController');
const pontoColetaController = require('../controllers/pontoColetaController');
const presenteController    = require('../controllers/presenteController');
const authMiddleware        = require('../middlewares/auth');

// ── RAIZ ──────────────────────────────────────────────────────
router.get('/', (req, res) => {
  res.json({ api: 'Conectando Sonhos 🎄', versao: '1.1.0' });
});

// ── AUTENTICAÇÃO (público) ─────────────────────────────────────
router.post('/auth/registrar/doador',      authController.registrarDoador);
router.post('/auth/registrar/instituicao', authController.registrarInstituicao);
router.post('/auth/login',                 authController.login);

// ── CARTINHAS (público + protegidas) ──────────────────────────
router.get ('/cartinhas/doador/minhas', authMiddleware, cartinhaController.minhasAdocoes);
router.get ('/cartinhas',                               cartinhaController.listar);
router.get ('/cartinhas/:id',                           cartinhaController.buscarPorId);
router.post('/cartinhas/:id/adotar',    authMiddleware, cartinhaController.adotar);
router.post('/cartinhas', authMiddleware, async (req, res) => {
  try {
    if (!req.usuario || (req.usuario.tipo !== 'instituicao' && req.usuario.tipo !== 'admin')) {
      return res.status(403).json({ erro: 'Apenas instituições podem criar cartinhas' });
    }

    const { nome, nascimento, presente, texto, crianca_id, categoria_id } = req.body;

    if (!texto || texto.length < 5) {
      return res.status(400).json({ erro: 'Texto da cartinha é obrigatório' });
    }

    const { getSupabaseAutenticado } = require('../config/supabase');
    const client = getSupabaseAutenticado(req.token);

    // Busca categoria pelo slug ou usa o ID direto
    let catId = categoria_id;
    if (!catId && presente) {
      const { data: cat } = await client
        .from('categorias_presente')
        .select('id')
        .eq('slug', presente)
        .single();
      catId = cat?.id;
    }

    if (!catId) {
      return res.status(400).json({ erro: 'Categoria não encontrada' });
    }

    // Cria ou usa crianca_id existente
    let crId = crianca_id;
    if (!crId && nome) {
      const { data: crianca, error: criancaErr } = await client
        .from('criancas')
        .insert({
          nome,
          data_nasc: nascimento || null,
          inst_id: req.usuario.inst_id
        })
        .select()
        .single();

      if (criancaErr) throw criancaErr;
      crId = crianca.id;
    }

    if (!crId) {
      return res.status(400).json({ erro: 'Nome da criança é obrigatório' });
    }

    // Cria a cartinha
    const { data: cartinha, error } = await client
      .from('cartinhas')
      .insert({
        crianca_id: crId,
        inst_id: req.usuario.inst_id,
        categoria_id: catId,
        texto,
        status: 'aguardando'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      mensagem: 'Cartinha criada! Aguardando aprovação.',
      cartinha
    });

  } catch (erro) {
    console.error('❌ Erro ao criar cartinha:', erro);
    res.status(400).json({ erro: erro.message });
  }
});

// ── INSTITUIÇÕES (público) ─────────────────────────────────────
router.get('/instituicoes', instituicaoController.listarAprovadas);
router.patch('/instituicoes/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.usuario || req.usuario.tipo !== 'instituicao' && req.usuario.tipo !== 'admin') {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    const { getSupabaseAutenticado } = require('../config/supabase');
    const client = getSupabaseAutenticado(req.token);
    const { nome, cnpj, email, telefone, cidade, uf, endereco } = req.body;
    const { data, error } = await client
      .from('instituicoes')
      .update({ nome, cnpj, email, telefone, cidade, uf, endereco })
      .eq('id', req.params.id)
      .select();
    if (error) throw error;
    res.json({ mensagem: '✅ Dados atualizados!', instituicao: data[0] });
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

// ── PONTOS DE COLETA (público) ─────────────────────────────────
router.get('/pontos', pontoColetaController.listar);

// ── PRESENTES AVULSOS ──────────────────────────────────────────
router.post('/presentes/avulso', authMiddleware, presenteController.doarAvulso);

// ── ADMIN — CARTINHAS ──────────────────────────────────────────
router.patch('/admin/cartinhas/:id/aprovar',  authMiddleware, cartinhaController.aprovar);
router.patch('/admin/cartinhas/:id/entregar', authMiddleware, cartinhaController.marcarEntregue);
router.get  ('/admin/cartinhas',              authMiddleware, async (req, res) => {
  try {
    if (!req.usuario || req.usuario.tipo !== 'admin') {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    const { getSupabaseAutenticado } = require('../config/supabase');
    const client = getSupabaseAutenticado(req.token);
    const { data, error } = await client
      .from('cartinhas')
      .select(`
        id, texto, status, enviada_em, aprovada_em, adotada_em, entregue_em,
        criancas ( nome, data_nasc, genero ),
        categorias_presente ( slug, nome ),
        instituicoes ( nome ),
        doador:usuarios ( nome, email )
      `)
      .order('enviada_em', { ascending: false });
    if (error) throw error;
    const cartinhas = (data || []).map(c => ({
      id:             c.id,
      texto:          c.texto,
      status:         c.status,
      enviada_em:     c.enviada_em,
      aprovada_em:    c.aprovada_em,
      adotada_em:     c.adotada_em,
      entregue_em:    c.entregue_em,
      crianca_nome:   c.criancas?.nome || '—',
      crianca_idade:  c.criancas?.data_nasc
        ? Math.floor((Date.now() - new Date(c.criancas.data_nasc)) / (365.25*24*3600*1000))
        : '?',
      categoria_slug: c.categorias_presente?.slug || '—',
      categoria_nome: c.categorias_presente?.nome || '—',
      inst_nome:      c.instituicoes?.nome        || '—',
      doador_nome:    c.doador?.nome              || null,
      doador_email:   c.doador?.email             || null,
    }));
    res.json({ total: cartinhas.length, cartinhas });
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao listar cartinhas admin', detalhes: erro.message });
  }
});
router.patch('/cartinhas/:id/cancelar', authMiddleware, async (req, res) => {
  try {
    const { getSupabaseAutenticado } = require('../config/supabase');
    const client = getSupabaseAutenticado(req.token);
    const { data, error } = await client
      .from('cartinhas')
      .update({ 
        status: 'disponivel',
        doador_id: null,
        adotada_em: null
      })
      .eq('id', req.params.id)
      .select();
    if (error) throw error;
    res.json({ mensagem: '✅ Adoção cancelada!', cartinha: data[0] });
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

// ── ADMIN — INSTITUIÇÕES ───────────────────────────────────────
router.get  ('/admin/instituicoes',               authMiddleware, instituicaoController.listarTodas);
router.patch('/admin/instituicoes/:id/aprovar',   authMiddleware, instituicaoController.aprovar);
router.patch('/admin/instituicoes/:id/desativar', authMiddleware, async (req, res) => {
  try {
    if (!req.usuario || req.usuario.tipo !== 'admin') {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    const { getSupabaseAutenticado } = require('../config/supabase');
    const client = getSupabaseAutenticado(req.token);
    const { error } = await client
      .from('instituicoes')
      .update({ verificada: false })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ mensagem: '✅ Instituição desativada.' });
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

// ── ADMIN — DOADORES ───────────────────────────────────────────
router.get('/admin/doadores', authMiddleware, async (req, res) => {
  try {
    if (!req.usuario || req.usuario.tipo !== 'admin') {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    const { getSupabaseAutenticado } = require('../config/supabase');
    const client = getSupabaseAutenticado(req.token);
    const { data, error } = await client
      .from('usuarios')
      .select('id, nome, email, telefone, cidade, uf, created_at, ativo')
      .eq('tipo', 'doador')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao listar doadores', detalhes: erro.message });
  }
});

// ── ADMIN — PONTOS DE COLETA ───────────────────────────────────
router.post  ('/admin/pontos',     authMiddleware, pontoColetaController.criar);
router.patch ('/admin/pontos/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.usuario || req.usuario.tipo !== 'admin') {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    const { getSupabaseAutenticado } = require('../config/supabase');
    const client = getSupabaseAutenticado(req.token);
    const { nome, endereco, bairro, cidade, uf, telefone, responsavel, horario } = req.body;
    const { data, error } = await client
      .from('pontos_coleta')
      .update({ nome, endereco, bairro, cidade, uf, telefone, responsavel, horario })
      .eq('id', req.params.id)
      .select();
    if (error) throw error;
    res.json({ mensagem: '✅ Ponto atualizado!', ponto: data[0] });
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});
router.delete('/admin/pontos/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.usuario || req.usuario.tipo !== 'admin') {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    const { getSupabaseAutenticado } = require('../config/supabase');
    const client = getSupabaseAutenticado(req.token);
    const { error } = await client
      .from('pontos_coleta')
      .update({ ativo: false })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ mensagem: '✅ Ponto desativado.' });
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

// ── ADMIN — PRESENTES (doacoes_diretas) ───────────────────────
router.get('/admin/presentes/avulsos', authMiddleware, presenteController.listarAvulsos);

router.patch('/admin/presentes/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.usuario || req.usuario.tipo !== 'admin') {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    const { getSupabaseAutenticado } = require('../config/supabase');
    const client = getSupabaseAutenticado(req.token);
    const { status } = req.body;
    const { data, error } = await client
      .from('doacoes_diretas')
      .update({ status })
      .eq('id', req.params.id)
      .select();
    if (error) throw error;
    res.json({ mensagem: '✅ Status atualizado!', presente: data[0] });
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

router.delete('/admin/presentes/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.usuario || req.usuario.tipo !== 'admin') {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    const { getSupabaseAutenticado } = require('../config/supabase');
    const client = getSupabaseAutenticado(req.token);
    const { error } = await client
      .from('doacoes_diretas')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ mensagem: 'Presente removido.' });
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

// ── KPIs DE IMPACTO (público) ──────────────────────────────────
router.get('/impacto', async (req, res) => {
  try {
    const { supabase } = require('../config/supabase');
    const { data, error } = await supabase.from('vw_impacto').select('*').single();
    if (error) throw error;
    res.json(data);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao buscar KPIs', detalhes: erro.message });
  }
});

// ── DISTRIBUIÇÃO POR CATEGORIA (público) ───────────────────────
router.get('/distribuicao', async (req, res) => {
  try {
    const { supabase } = require('../config/supabase');
    const { data, error } = await supabase.from('vw_distribuicao_categoria').select('*');
    if (error) throw error;
    res.json(data || []);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao buscar distribuição', detalhes: erro.message });
  }
});

module.exports = router;