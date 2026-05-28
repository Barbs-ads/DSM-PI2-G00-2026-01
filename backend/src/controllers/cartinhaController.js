// ═══════════════════════════════════════════════════════════
// Controller: Cartinha
// Responsável por processar requisições HTTP
// ═══════════════════════════════════════════════════════════

const Cartinha = require('../models/Cartinha');

class CartinhaController {

  // ═══ LISTAR TODAS (GET /api/cartinhas) ═══
  // Qualquer pessoa pode chamar
  // Query params: ?status=disponivel&categoria_id=1&busca=brinquedo&limite=10&pagina=1
  async listar(req, res) {
    try {
      const {
        status,
        categoria_id,
        inst_id,
        busca,
        limite,
        pagina
      } = req.query;

      // Montar objeto de filtros
      const filtros = {};

      if (status) filtros.status = status;
      if (categoria_id) filtros.categoria_id = categoria_id;
      if (inst_id) filtros.inst_id = inst_id;
      if (busca) filtros.busca = busca;
      
      if (limite) {
        filtros.limite = parseInt(limite);
        if (pagina) {
          // Página 1 = offset 0, página 2 = offset 10, etc
          filtros.offset = (parseInt(pagina) - 1) * filtros.limite;
        }
      }

      // Se for instituição, só mostra suas cartinhas
      if (req.usuario && req.usuario.tipo === 'instituicao') {
        filtros.inst_id = req.usuario.inst_id;
      }

      // Chamar Model
      const cartinhas = await Cartinha.buscarTodas(filtros);

      res.json({
        total: cartinhas.length,
        filtros_aplicados: filtros,
        cartinhas
      });

    } catch (erro) {
      console.error('❌ Erro no controller listar:', erro);
      res.status(500).json({ 
        erro: 'Erro ao listar cartinhas',
        detalhes: erro.message 
      });
    }
  }

  // ═══ BUSCAR UMA (GET /api/cartinhas/:id) ═══
  async buscarPorId(req, res) {
    try {
      const { id } = req.params;

      // Validar ID
      if (!id || isNaN(id)) {
        return res.status(400).json({ 
          erro: 'ID deve ser um número válido' 
        });
      }

      // Chamar Model
      const cartinha = await Cartinha.buscarPorId(parseInt(id));

      if (!cartinha) {
        return res.status(404).json({ 
          erro: 'Cartinha não encontrada' 
        });
      }

      res.json(cartinha);

    } catch (erro) {
      console.error('❌ Erro no controller buscarPorId:', erro);
      res.status(500).json({ 
        erro: 'Erro ao buscar cartinha',
        detalhes: erro.message 
      });
    }
  }

  // ═══ CRIAR (POST /api/cartinhas) ═══
  // Apenas instituição e admin podem criar
  // PRECISA: authMiddleware + token
  async criar(req, res) {
    try {
      // Verificar permissão
      if (!req.usuario || (req.usuario.tipo !== 'instituicao' && req.usuario.tipo !== 'admin')) {
        return res.status(403).json({
          erro: 'Apenas instituições podem criar cartinhas'
        });
      }

      const {
        crianca_id,
        categoria_id,
        texto,
        foto_url
      } = req.body;

      // Validar dados obrigatórios
      if (!crianca_id || !categoria_id || !texto) {
        return res.status(400).json({
          erro: 'crianca_id, categoria_id e texto são obrigatórios'
        });
      }

      if (texto.length < 20) {
        return res.status(400).json({
          erro: 'Texto deve ter no mínimo 20 caracteres'
        });
      }

      // Chamar Model com token
      const cartinha = await Cartinha.criar({
        crianca_id: parseInt(crianca_id),
        inst_id: req.usuario.inst_id,  // Usa a instituição do token
        categoria_id: parseInt(categoria_id),
        texto,
        foto_url: foto_url || null
      }, req.token);

      res.status(201).json({
        mensagem: 'Cartinha criada! Aguardando aprovação.',
        cartinha
      });

    } catch (erro) {
      console.error('❌ Erro no controller criar:', erro);
      res.status(400).json({ 
        erro: erro.message 
      });
    }
  }

  // ═══ ADOTAR (POST /api/cartinhas/:id/adotar) ═══
  // Apenas doador pode adotar
  // PRECISA: authMiddleware + token
  async adotar(req, res) {
    try {
      const { id } = req.params;
      const { ponto_id } = req.body;

      // Verificar permissão
      if (!req.usuario || req.usuario.tipo !== 'doador') {
        return res.status(403).json({
          erro: 'Apenas doadores podem adotar cartinhas'
        });
      }

      // Validar dados
      if (!id || isNaN(id)) {
        return res.status(400).json({ 
          erro: 'ID deve ser um número válido' 
        });
      }

      if (!ponto_id || isNaN(ponto_id)) {
        return res.status(400).json({
          erro: 'Informe um ponto_id válido (local onde vai buscar)'
        });
      }

      // 🔑 Chamar Model com token
      // Model passa token para Supabase
      // Supabase sabe EXATAMENTE quem está adotando!
      const cartinha = await Cartinha.adotar(
        parseInt(id),
        parseInt(ponto_id),
        req.token  // ← TOKEN AQUI!
      );

      res.json({
        mensagem: '✅ Cartinha adotada com sucesso! 🎁',
        cartinha
      });

    } catch (erro) {
      console.error('❌ Erro no controller adotar:', erro);
      res.status(400).json({ 
        erro: erro.message 
      });
    }
  }

  // ═══ APROVAR (PATCH /api/cartinhas/:id/aprovar) ═══
  // Apenas admin pode aprovar
  // PRECISA: authMiddleware + token
  async aprovar(req, res) {
    try {
      const { id } = req.params;

      // Verificar permissão
      if (!req.usuario || req.usuario.tipo !== 'admin') {
        return res.status(403).json({
          erro: 'Apenas admin pode aprovar cartinhas'
        });
      }

      // Validar ID
      if (!id || isNaN(id)) {
        return res.status(400).json({ 
          erro: 'ID deve ser um número válido' 
        });
      }

      // Chamar Model
      const cartinha = await Cartinha.aprovar(parseInt(id), req.token);

      res.json({
        mensagem: '✅ Cartinha aprovada! Publicada no mural.',
        cartinha
      });

    } catch (erro) {
      console.error('❌ Erro no controller aprovar:', erro);
      res.status(400).json({ 
        erro: erro.message 
      });
    }
  }

  // ═══ MARCAR ENTREGUE (PATCH /api/cartinhas/:id/entregar) ═══
  // Apenas admin pode marcar
  // PRECISA: authMiddleware + token
  async marcarEntregue(req, res) {
    try {
      const { id } = req.params;

      // Verificar permissão
      if (!req.usuario || req.usuario.tipo !== 'admin') {
        return res.status(403).json({
          erro: 'Apenas admin pode marcar como entregue'
        });
      }

      // Validar ID
      if (!id || isNaN(id)) {
        return res.status(400).json({ 
          erro: 'ID deve ser um número válido' 
        });
      }

      // Chamar Model
      const cartinha = await Cartinha.marcarEntregue(parseInt(id), req.token);

      res.json({
        mensagem: '✅ Presente marcado como entregue!',
        cartinha
      });

    } catch (erro) {
      console.error('❌ Erro no controller marcarEntregue:', erro);
      res.status(400).json({ 
        erro: erro.message 
      });
    }
  }

  // ═══ CANCELAR (DELETE /api/cartinhas/:id) ═══
  // Apenas admin pode cancelar
  // PRECISA: authMiddleware + token
  async cancelar(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;

      // Verificar permissão
      if (!req.usuario || req.usuario.tipo !== 'admin') {
        return res.status(403).json({
          erro: 'Apenas admin pode cancelar cartinhas'
        });
      }

      // Validar dados
      if (!id || isNaN(id)) {
        return res.status(400).json({ 
          erro: 'ID deve ser um número válido' 
        });
      }

      if (!motivo) {
        return res.status(400).json({
          erro: 'Informe um motivo para cancelamento'
        });
      }

      // Chamar Model
      const cartinha = await Cartinha.cancelar(parseInt(id), motivo, req.token);

      res.json({
        mensagem: '⚠️ Cartinha cancelada',
        cartinha
      });

    } catch (erro) {
      console.error('❌ Erro no controller cancelar:', erro);
      res.status(400).json({ 
        erro: erro.message 
      });
    }
  }

  // ═══ MINHAS ADOÇÕES (GET /api/cartinhas/doador/minhas) ═══
  // Doador vê suas próprias adoções
  // PRECISA: authMiddleware + token
  async minhasAdocoes(req, res) {
    try {
      // Verificar permissão
      if (!req.usuario || req.usuario.tipo !== 'doador') {
        return res.status(403).json({
          erro: 'Apenas doadores podem ver suas adoções'
        });
      }

      // Chamar Model com token
      const cartinhas = await Cartinha.minhasAdocoes(req.token);

      res.json({
        total: cartinhas.length,
        cartinhas
      });

    } catch (erro) {
      console.error('❌ Erro no controller minhasAdocoes:', erro);
      res.status(500).json({ 
        erro: erro.message 
      });
    }
  }

  // ═══ ESTATÍSTICAS (GET /api/cartinhas/stats) ═══
  async estatisticas(req, res) {
    try {
      const stats = await Cartinha.estatisticas();

      res.json(stats);

    } catch (erro) {
      console.error('❌ Erro no controller estatisticas:', erro);
      res.status(500).json({ 
        erro: erro.message 
      });
    }
  }
}

module.exports = new CartinhaController();