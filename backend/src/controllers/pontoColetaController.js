const PontoColeta = require('../models/PontoColeta');

class PontoColetaController {
  async listar(req, res) {
    try {
      const pontos = await PontoColeta.buscarTodos();
      res.json(pontos);
    } catch (erro) {
      res.status(500).json({ erro: 'Erro ao listar pontos de coleta', detalhes: erro.message });
    }
  }

  async criar(req, res) {
    try {
      if (req.usuario.tipo !== 'admin') {
        return res.status(403).json({ erro: 'Acesso negado.' });
      }
      const novoPonto = await PontoColeta.criar(req.body, req.token);
      res.json({ mensagem: '✅ Novo ponto de coleta cadastrado!', novoPonto });
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  }
}

module.exports = new PontoColetaController();