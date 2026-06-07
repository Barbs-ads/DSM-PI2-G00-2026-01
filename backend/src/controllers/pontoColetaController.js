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
      if (!req.usuario || req.usuario.tipo !== 'admin') {
        return res.status(403).json({ erro: 'Acesso negado.' });
      }
      const { nome, endereco, bairro, cidade, uf } = req.body;
      if (!nome || !endereco || !bairro || !cidade || !uf) {
        return res.status(400).json({ erro: 'nome, endereco, bairro, cidade e uf são obrigatórios.' });
      }
      const novoPonto = await PontoColeta.criar(req.body, req.token);
      res.status(201).json({ mensagem: '✅ Novo ponto de coleta cadastrado!', ponto: novoPonto });
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  }

  async atualizar(req, res) {
    try {
      if (!req.usuario || req.usuario.tipo !== 'admin') {
        return res.status(403).json({ erro: 'Acesso negado.' });
      }
      const { id } = req.params;
      if (!id || isNaN(id)) return res.status(400).json({ erro: 'ID inválido.' });
      const ponto = await PontoColeta.atualizar(parseInt(id), req.body, req.token);
      res.json({ mensagem: '✅ Ponto atualizado!', ponto });
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  }

  async desativar(req, res) {
    try {
      if (!req.usuario || req.usuario.tipo !== 'admin') {
        return res.status(403).json({ erro: 'Acesso negado.' });
      }
      const { id } = req.params;
      if (!id || isNaN(id)) return res.status(400).json({ erro: 'ID inválido.' });
      await PontoColeta.desativar(parseInt(id), req.token);
      res.json({ mensagem: '✅ Ponto desativado.' });
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  }
}

module.exports = new PontoColetaController();