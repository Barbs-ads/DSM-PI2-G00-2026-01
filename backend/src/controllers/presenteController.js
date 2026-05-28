const PresenteAvulso = require('../models/PresenteAvulso');

class PresenteController {
  async doarAvulso(req, res) {
    try {
      const novoPresente = await PresenteAvulso.criar(req.body, req.token);
      res.status(201).json({
        mensagem: '✅ Registro de presente avulso feito! Muito obrigado pela generosidade.',
        novoPresente
      });
    } catch (erro) {
      res.status(400).json({ erro: erro.message });
    }
  }

  async listarAvulsos(req, res) {
    try {
      if (req.usuario.tipo !== 'admin') {
        return res.status(403).json({ erro: 'Acesso negado.' });
      }
      const lista = await PresenteAvulso.listarTodas(req.token);
      res.json(lista);
    } catch (erro) {
      res.status(500).json({ erro: erro.message });
    }
  }
}

module.exports = new PresenteController();