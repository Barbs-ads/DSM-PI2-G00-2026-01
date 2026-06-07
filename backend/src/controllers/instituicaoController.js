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
      if (!req.usuario || req.usuario.tipo !== 'admin') {
        return res.status(403).json({ erro: 'Acesso negado. Apenas administradores.' });
      }
      const lista = await Instituicao.buscarTodas(req.token);
      res.json(lista);
    } catch (erro) {
      res.status(500).json({ erro: 'Erro ao carregar painel', detalhes: erro.message });
    }
  }

  async buscarPorId(req, res) {
    try {
      if (!req.usuario || req.usuario.tipo !== 'admin') {
        return res.status(403).json({ erro: 'Acesso negado.' });
      }
      const { id } = req.params;
      if (!id || isNaN(id)) return res.status(400).json({ erro: 'ID inválido.' });
      const lista = await Instituicao.buscarTodas(req.token);
      const inst = lista.find(i => i.id === parseInt(id));
      if (!inst) return res.status(404).json({ erro: 'Instituição não encontrada.' });
      res.json(inst);
    } catch (erro) {
      res.status(500).json({ erro: erro.message });
    }
  }

  async aprovar(req, res) {
    try {
      if (!req.usuario || req.usuario.tipo !== 'admin') {
        return res.status(403).json({ erro: 'Acesso negado.' });
      }
      const instituicao = await Instituicao.aprovar(req.params.id, req.token);
      res.json({ mensagem: '✅ Instituição aprovada para uso no sistema!', instituicao });
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  }

  async criar(req, res) {
    try {
      if (!req.usuario || req.usuario.tipo !== 'admin') {
        return res.status(403).json({ erro: 'Acesso negado.' });
      }
      const { nome, email } = req.body;
      if (!nome || !email) {
        return res.status(400).json({ erro: 'nome e email são obrigatórios.' });
      }
      const inst = await Instituicao.criar(req.body, req.token);
      res.status(201).json({ mensagem: '✅ Instituição cadastrada!', instituicao: inst });
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
      const inst = await Instituicao.atualizar(parseInt(id), req.body, req.token);
      res.json({ mensagem: '✅ Instituição atualizada!', instituicao: inst });
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
      await Instituicao.desativar(parseInt(id), req.token);
      res.json({ mensagem: '✅ Instituição desativada.' });
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  }
}

module.exports = new InstituicaoController();