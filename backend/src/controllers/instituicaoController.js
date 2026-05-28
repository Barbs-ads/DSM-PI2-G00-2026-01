const Instituicao = require('../models/Instituicao');

class InstituicaoController {
  
  async listarAprovadas(req, res) {
    try {
      const lista = await Instituicao.buscarTodasAprovadas();
      res.json(lista);
    } catch (erro) {
      res.status(500).json({ erro: 'Erro ao listar instituições', detalhes: erro.message });
    }
  }

  async listarTodas(req, res) {
    try {
      if (req.usuario.tipo !== 'admin') {
        return res.status(403).json({ erro: 'Acesso negado. Apenas administradores.' });
      }
      const lista = await Instituicao.buscarTodas(req.token);
      res.json(lista);
    } catch (erro) {
      res.status(500).json({ erro: 'Erro ao carregar painel', detalhes: erro.message });
    }
  }

  async aprovar(req, res) {
    try {
      if (req.usuario.tipo !== 'admin') {
        return res.status(403).json({ erro: 'Acesso negado.' });
      }
      const instituicao = await Instituicao.aprovar(req.params.id, req.token);
      res.json({ mensagem: '✅ Instituição aprovada para uso no sistema!', instituicao });
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  }
}

module.exports = new InstituicaoController();
