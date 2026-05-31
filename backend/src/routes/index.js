const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const cartinhaController = require('../controllers/cartinhaController');
const instituicaoController = require('../controllers/instituicaoController');
const pontoColetaController = require('../controllers/pontoColetaController');
const presenteController = require('../controllers/presenteController');

const authMiddleware = require('../middlewares/auth');

// RAIZ DA API 
router.get('/', (req, res) => {
  res.json({ api: 'Conectando Sonhos 🎄', versao: '1.1.0' });
});

// MÓDULO AUTENTICAÇÃO (Público)
router.post('/auth/registrar/doador', authController.registrarDoador);
router.post('/auth/registrar/instituicao', authController.registrarInstituicao);
router.post('/auth/login', authController.login);

// MÓDULO CARTINHAS (Público e Autenticado)
router.get('/cartinhas', cartinhaController.listar);
router.get('/cartinhas/doador/minhas', authMiddleware, cartinhaController.minhasAdocoes);
router.get('/cartinhas/:id', cartinhaController.buscarPorId);
router.post('/cartinhas/:id/adotar', authMiddleware, cartinhaController.adotar);


//MÓDULO INSTITUIÇÕES (Público)
router.get('/instituicoes', instituicaoController.listarAprovadas);

// MÓDULO PONTOS DE COLETA (Público)
router.get('/pontos', pontoColetaController.listar);

// MÓDULO PRESENTES AVULSOS
router.post('/presentes/avulso', authMiddleware, presenteController.doarAvulso);

// ROTAS EXCLUSIVAS DE ADMINISTRADOR
router.patch('/admin/cartinhas/:id/aprovar', authMiddleware, cartinhaController.aprovar);
router.patch('/admin/cartinhas/:id/entregar', authMiddleware, cartinhaController.marcarEntregue);
router.get('/admin/instituicoes', authMiddleware, instituicaoController.listarTodas);
router.patch('/admin/instituicoes/:id/aprovar', authMiddleware, instituicaoController.aprovar);
router.post('/admin/pontos', authMiddleware, pontoColetaController.criar);
router.get('/admin/presentes/avulsos', authMiddleware, presenteController.listarAvulsos);
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
module.exports = router;