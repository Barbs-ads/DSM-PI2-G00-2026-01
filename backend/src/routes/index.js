const express = require('express');
const router = express.Router();

const authController        = require('../controllers/authController');
const cartinhaController    = require('../controllers/cartinhaController');
const instituicaoController = require('../controllers/instituicaoController');
const pontoColetaController = require('../controllers/pontoColetaController');
const presenteController    = require('../controllers/presenteController');
const authMiddleware        = require('../middlewares/auth');

// RAIZ
router.get('/', (req, res) => {
  res.json({ api: 'Conectando Sonhos 🎄', versao: '1.1.0' });
});

// AUTENTICAÇÃO (público) 
router.post('/auth/registrar/doador',      authController.registrarDoador);
router.post('/auth/registrar/instituicao', authController.registrarInstituicao);
router.post('/auth/login',                 authController.login);

// CARTINHAS 
// IMPORTANTE: rota específica ANTES da rota com parâmetro (:id)
router.get('/cartinhas/doador/minhas', authMiddleware, cartinhaController.minhasAdocoes);
router.get('/cartinhas',                              cartinhaController.listar);
router.get('/cartinhas/:id',                          cartinhaController.buscarPorId);
router.post('/cartinhas/:id/adotar', authMiddleware, cartinhaController.adotar);
router.post('/cartinhas',            authMiddleware, cartinhaController.criar);  

//  INSTITUIÇÕES (público)
router.get('/instituicoes', instituicaoController.listarAprovadas);

// PONTOS DE COLETA (público)
router.get('/pontos', pontoColetaController.listar);

// PRESENTES AVULSOS 
router.post('/presentes/avulso', authMiddleware, presenteController.doarAvulso);

// ADMIN 
router.patch('/admin/cartinhas/:id/aprovar',   authMiddleware, cartinhaController.aprovar);
router.patch('/admin/cartinhas/:id/entregar',  authMiddleware, cartinhaController.marcarEntregue);
router.get  ('/admin/instituicoes',            authMiddleware, instituicaoController.listarTodas);
router.patch('/admin/instituicoes/:id/aprovar',authMiddleware, instituicaoController.aprovar);
router.post ('/admin/pontos',                  authMiddleware, pontoColetaController.criar);
router.get  ('/admin/presentes/avulsos',       authMiddleware, presenteController.listarAvulsos);

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

// DISTRIBUIÇÃO POR CATEGORIA 
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