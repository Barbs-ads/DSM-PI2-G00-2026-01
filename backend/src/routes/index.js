const express = require('express');
const router = express.Router();

const authController        = require('../controllers/authController');
const cartinhaController    = require('../controllers/cartinhaController');
const instituicaoController = require('../controllers/instituicaoController');
const pontoColetaController = require('../controllers/pontoColetaController');
const presenteController    = require('../controllers/presenteController');
const authMiddleware        = require('../middlewares/auth');

// ── RAIZ ─────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  res.json({ api: 'Conectando Sonhos 🎄', versao: '1.1.0' });
});

// ── AUTENTICAÇÃO (público) ────────────────────────────────────────
router.post('/auth/registrar/doador',      authController.registrarDoador);
router.post('/auth/registrar/instituicao', authController.registrarInstituicao);
router.post('/auth/login',                 authController.login);

// ── CARTINHAS ─────────────────────────────────────────────────────
// IMPORTANTE: rota específica ANTES da rota com parâmetro (:id)
router.get('/cartinhas/doador/minhas', authMiddleware, cartinhaController.minhasAdocoes);
router.get('/cartinhas',                              cartinhaController.listar);
router.get('/cartinhas/:id',                          cartinhaController.buscarPorId);
router.post('/cartinhas/:id/adotar', authMiddleware, cartinhaController.adotar);
router.post('/cartinhas',            authMiddleware, cartinhaController.criar);  

// ── INSTITUIÇÕES (público) ────────────────────────────────────────
router.get('/instituicoes', instituicaoController.listarAprovadas);

// ── PONTOS DE COLETA (público) ────────────────────────────────────
router.get('/pontos', pontoColetaController.listar);

// ── PRESENTES AVULSOS ─────────────────────────────────────────────
router.post('/presentes/avulso', authMiddleware, presenteController.doarAvulso);

// ── ADMIN ─────────────────────────────────────────────────────────
// Cartinhas (admin) — rota específica ANTES da genérica
router.get  ('/admin/cartinhas',               authMiddleware, cartinhaController.listarAdmin);
router.patch('/admin/cartinhas/:id/aprovar',   authMiddleware, cartinhaController.aprovar);
router.patch('/admin/cartinhas/:id/entregar',  authMiddleware, cartinhaController.marcarEntregue);
router.patch('/admin/cartinhas/:id/cancelar',  authMiddleware, cartinhaController.cancelar);

// Instituições
router.get  ('/admin/instituicoes',             authMiddleware, instituicaoController.listarTodas);
router.post ('/admin/instituicoes',             authMiddleware, instituicaoController.criar);
router.get  ('/admin/instituicoes/:id',         authMiddleware, instituicaoController.buscarPorId);
router.patch('/admin/instituicoes/:id/aprovar', authMiddleware, instituicaoController.aprovar);
router.put  ('/admin/instituicoes/:id',         authMiddleware, instituicaoController.atualizar);
router.delete('/admin/instituicoes/:id',        authMiddleware, instituicaoController.desativar);

// Doadores — usa service-role para contornar loop de RLS em is_admin()
router.get('/admin/doadores', authMiddleware, async (req, res) => {
  try {
    if (!req.usuario || req.usuario.tipo !== 'admin') {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }

    const { getSupabaseAutenticado, getSupabaseAdmin } = require('../config/supabase');

    // Tenta primeiro via RPC (SECURITY DEFINER — bypassa RLS sem precisar de service role)
    const clientAuth = getSupabaseAutenticado(req.token);
    const { data: rpcData, error: rpcErr } = await clientAuth
      .rpc('admin_listar_doadores');

    if (!rpcErr && rpcData) {
      return res.json(rpcData);
    }

    // Fallback: tenta service-role direto
    console.warn('⚠️  RPC admin_listar_doadores falhou, tentando service-role:', rpcErr?.message);
    const admin = getSupabaseAdmin();

    const { data: usuarios, error: errU } = await admin
      .from('usuarios')
      .select('id, nome, email, cidade, uf, criado_em')
      .eq('tipo', 'doador')
      .eq('ativo', true)
      .order('criado_em', { ascending: false });

    if (errU) {
      console.error('❌ Service-role também falhou:', errU);
      // Devolve o erro original da RPC para facilitar diagnóstico
      return res.status(500).json({
        erro: 'Erro ao listar doadores',
        detalhes: rpcErr?.message || errU.message,
        dica: 'Execute o arquivo diagnostico_e_correcao.sql no Supabase SQL Editor para criar a função admin_listar_doadores()',
      });
    }

    const { data: adocoes } = await admin
      .from('cartinhas')
      .select('doador_id')
      .in('status', ['adotada', 'entregue'])
      .not('doador_id', 'is', null);

    const contagem = {};
    (adocoes || []).forEach(a => {
      contagem[a.doador_id] = (contagem[a.doador_id] || 0) + 1;
    });

    res.json((usuarios || []).map(u => ({ ...u, adocoes: contagem[u.id] || 0 })));
  } catch (erro) {
    console.error('❌ /admin/doadores falhou:', erro);
    res.status(500).json({ erro: 'Erro ao listar doadores', detalhes: erro.message });
  }
});

// Pontos de coleta
router.post  ('/admin/pontos',     authMiddleware, pontoColetaController.criar);
router.put   ('/admin/pontos/:id', authMiddleware, pontoColetaController.atualizar);
router.delete('/admin/pontos/:id', authMiddleware, pontoColetaController.desativar);

// Presentes avulsos
router.get  ('/admin/presentes/avulsos',       authMiddleware, presenteController.listarAvulsos);

// ── KPIs DE IMPACTO (público) ─────────────────────────────────────
router.get('/impacto', async (req, res) => {
  try {
    const { supabase } = require('../config/supabase');
    const { data, error } = await supabase
      .from('vw_impacto')
      .select('*')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao buscar KPIs', detalhes: erro.message });
  }
});

// ── DISTRIBUIÇÃO POR CATEGORIA — donut chart (público) ───────────
router.get('/distribuicao', async (req, res) => {
  try {
    const { supabase } = require('../config/supabase');
    const { data, error } = await supabase
      .from('vw_distribuicao_categoria')
      .select('*');
    if (error) throw error;
    res.json(data || []);
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao buscar distribuição', detalhes: erro.message });
  }
});

module.exports = router;