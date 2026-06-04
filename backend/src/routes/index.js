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
// ATENÇÃO: rota específica ANTES da rota com parâmetro (:id)
router.get ('/cartinhas/doador/minhas', authMiddleware, cartinhaController.minhasAdocoes);
router.get ('/cartinhas',                               cartinhaController.listar);
router.get ('/cartinhas/:id',                           cartinhaController.buscarPorId);
router.post('/cartinhas/:id/adotar',    authMiddleware, cartinhaController.adotar);
router.post('/cartinhas',               authMiddleware, cartinhaController.criar);

// ── INSTITUIÇÕES (público) ─────────────────────────────────────
router.get('/instituicoes', instituicaoController.listarAprovadas);

// ── PONTOS DE COLETA (público) ─────────────────────────────────
router.get('/pontos', pontoColetaController.listar);

// ── PRESENTES AVULSOS ──────────────────────────────────────────
router.post('/presentes/avulso', authMiddleware, presenteController.doarAvulso);

// ── ADMIN — CARTINHAS ──────────────────────────────────────────
router.patch('/admin/cartinhas/:id/aprovar',   authMiddleware, cartinhaController.aprovar);
router.patch('/admin/cartinhas/:id/entregar',  authMiddleware, cartinhaController.marcarEntregue);
// Nova rota: lista TODAS as cartinhas (incluindo aguardando) com join de criança
router.get  ('/admin/cartinhas',               authMiddleware, async (req, res) => {
  try {
    if (!req.usuario || req.usuario.tipo !== 'admin') {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    const { getSupabaseAutenticado } = require('../config/supabase');
    const client = getSupabaseAutenticado(req.token);
    // Join com criancas e categorias para trazer nome e categoria
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
    // Formata para o padrão esperado pelo frontend
    const cartinhas = (data || []).map(c => ({
      id:             c.id,
      texto:          c.texto,
      status:         c.status,
      enviada_em:     c.enviada_em,
      aprovada_em:    c.aprovada_em,
      adotada_em:     c.adotada_em,
      entregue_em:    c.entregue_em,
      crianca_nome:   c.criancas?.nome        || '—',
      crianca_idade:  c.criancas?.data_nasc
        ? Math.floor((Date.now() - new Date(c.criancas.data_nasc)) / (365.25*24*3600*1000))
        : '?',
      categoria_slug: c.categorias_presente?.slug || '—',
      categoria_nome: c.categorias_presente?.nome || '—',
      inst_nome:      c.instituicoes?.nome     || '—',
      doador_nome:    c.doador?.nome           || null,
      doador_email:   c.doador?.email          || null,
    }));
    res.json({ total: cartinhas.length, cartinhas });
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao listar cartinhas admin', detalhes: erro.message });
  }
});

// ── ADMIN — INSTITUIÇÕES ───────────────────────────────────────
router.get  ('/admin/instituicoes',             authMiddleware, instituicaoController.listarTodas);
router.patch('/admin/instituicoes/:id/aprovar', authMiddleware, instituicaoController.aprovar);

// ── ADMIN — DOADORES ───────────────────────────────────────────
router.get('/admin/doadores', authMiddleware, async (req, res) => {
  try {
    if (!req.usuario || req.usuario.tipo !== 'admin') {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    const { getSupabaseAutenticado } = require('../config/supabase');
    const client = getSupabaseAutenticado(req.token);
    // Busca todos os usuários do tipo doador com contagem de adoções
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
router.post  ('/admin/pontos',      authMiddleware, pontoColetaController.criar);
// Editar ponto
router.patch ('/admin/pontos/:id',  authMiddleware, async (req, res) => {
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
// Desativar ponto (soft-delete via flag ativo=false)
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

// ── ADMIN — PRESENTES AVULSOS ──────────────────────────────────
router.get('/admin/presentes/avulsos', authMiddleware, presenteController.listarAvulsos);

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

// ── DISTRIBUIÇÃO POR CATEGORIA — donut (público) ───────────────
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