// Controller: Cartinha

const Cartinha = require("../models/Cartinha");

class CartinhaController {
  //LISTAR TODAS

  async listar(req, res) {
    try {
      const { status, categoria_id, inst_id, busca, limite, pagina } =
        req.query;

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

      if (req.usuario && req.usuario.tipo === "instituicao") {
        filtros.inst_id = req.usuario.inst_id;
      }

      const cartinhas = await Cartinha.buscarTodas(filtros);

      res.json({
        total: cartinhas.length,
        filtros_aplicados: filtros,
        cartinhas,
      });
    } catch (erro) {
      console.error("❌ Erro no controller listar:", erro);
      res.status(500).json({
        erro: "Erro ao listar cartinhas",
        detalhes: erro.message,
      });
    }
  }

  //BUSCAR
  async buscarPorId(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          erro: "ID deve ser um número válido",
        });
      }

      const cartinha = await Cartinha.buscarPorId(parseInt(id));

      if (!cartinha) {
        return res.status(404).json({
          erro: "Cartinha não encontrada",
        });
      }

      res.json(cartinha);
    } catch (erro) {
      console.error("❌ Erro no controller buscarPorId:", erro);
      res.status(500).json({
        erro: "Erro ao buscar cartinha",
        detalhes: erro.message,
      });
    }
  }

  // CRIAR ( instituição e admin)
  async criar(req, res) {
    console.log("BODY:", req.body);
    try {
      if (
        !req.usuario ||
        (req.usuario.tipo !== "instituicao" && req.usuario.tipo !== "admin")
      ) {
        return res.status(403).json({
          erro: "Apenas instituições podem criar cartinhas",
        });
      }

      const { nome_crianca, nascimento, presente, texto, foto_url } = req.body;

      // Validações
      if (!nome_crianca || !nascimento || !presente || !texto) {
        return res.status(400).json({
          erro: "nome_crianca, nascimento, presente e texto são obrigatórios",
        });
      }
      if (texto.length < 20) {
        return res.status(400).json({
          erro: "Texto deve ter no mínimo 20 caracteres",
        });
      }

      const inst_id = req.usuario.inst_id;
      if (!inst_id) {
        return res.status(400).json({
          erro: "Usuário não está vinculado a nenhuma instituição",
        });
      }

      const { supabase } = require("../config/supabase");
      const { data: catData, error: catError } = await supabase
        .from("categorias_presente")
        .select("id")
        .eq("slug", presente)
        .single();

      if (catError || !catData) {
        return res.status(400).json({
          erro: `Categoria inválida: "${presente}"`,
        });
      }

      const { getSupabaseAutenticado } = require("../config/supabase");
      const client = getSupabaseAutenticado(req.token);
      const { data, error } = await client.rpc("cadastrar_cartinha", {
        _inst_id: inst_id,
        _nome_crianca: nome_crianca,
        _data_nasc: nascimento,
        _genero: "nao-informado",
        _categoria_id: catData.id,
        _texto: texto,
        _foto_url: foto_url || null,
      });

      if (error) throw error;

      res.status(201).json({
        mensagem: "✅ Cartinha enviada para análise!",
        cartinha: data,
      });
    } catch (erro) {
      console.error("❌ Erro no controller criar:", erro);
      res.status(400).json({ erro: erro.message });
    }
  }

  // ADOTAR

  async adotar(req, res) {
    try {
      const { id } = req.params;
      const { ponto_id } = req.body;

      if (!req.usuario || req.usuario.tipo !== "doador") {
        return res.status(403).json({
          erro: "Apenas doadores podem adotar cartinhas",
        });
      }

      if (!id || isNaN(id)) {
        return res.status(400).json({
          erro: "ID deve ser um número válido",
        });
      }

      if (!ponto_id || isNaN(ponto_id)) {
        return res.status(400).json({
          erro: "Informe um ponto_id válido (local onde vai buscar)",
        });
      }

      const cartinha = await Cartinha.adotar(
        parseInt(id),
        parseInt(ponto_id),
        req.token,
      );

      res.json({
        mensagem: "✅ Cartinha adotada com sucesso! 🎁",
        cartinha,
      });
    } catch (erro) {
      console.error("❌ Erro no controller adotar:", erro);
      res.status(400).json({
        erro: erro.message,
      });
    }
  }

  // APROVAR
  async aprovar(req, res) {
    try {
      const { id } = req.params;

      if (!req.usuario || req.usuario.tipo !== "admin") {
        return res.status(403).json({
          erro: "Apenas admin pode aprovar cartinhas",
        });
      }

      if (!id || isNaN(id)) {
        return res.status(400).json({
          erro: "ID deve ser um número válido",
        });
      }

      const cartinha = await Cartinha.aprovar(parseInt(id), req.token);

      res.json({
        mensagem: "✅ Cartinha aprovada! Publicada no mural.",
        cartinha,
      });
    } catch (erro) {
      console.error("❌ Erro no controller aprovar:", erro);
      res.status(400).json({
        erro: erro.message,
      });
    }
  }

  //  MARCAR ENTREGUE
  async marcarEntregue(req, res) {
    try {
      const { id } = req.params;

      if (!req.usuario || req.usuario.tipo !== "admin") {
        return res.status(403).json({
          erro: "Apenas admin pode marcar como entregue",
        });
      }

      if (!id || isNaN(id)) {
        return res.status(400).json({
          erro: "ID deve ser um número válido",
        });
      }

      const cartinha = await Cartinha.marcarEntregue(parseInt(id), req.token);

      res.json({
        mensagem: "✅ Presente marcado como entregue!",
        cartinha,
      });
    } catch (erro) {
      console.error("❌ Erro no controller marcarEntregue:", erro);
      res.status(400).json({
        erro: erro.message,
      });
    }
  }

  //  CANCELAR (só admin)
  async cancelar(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;

      if (!req.usuario || req.usuario.tipo !== "admin") {
        return res.status(403).json({
          erro: "Apenas admin pode cancelar cartinhas",
        });
      }

      // Validar dados
      if (!id || isNaN(id)) {
        return res.status(400).json({
          erro: "ID deve ser um número válido",
        });
      }

      if (!motivo) {
        return res.status(400).json({
          erro: "Informe um motivo para cancelamento",
        });
      }

      const cartinha = await Cartinha.cancelar(parseInt(id), motivo, req.token);

      res.json({
        mensagem: "⚠️ Cartinha cancelada",
        cartinha,
      });
    } catch (erro) {
      console.error("❌ Erro no controller cancelar:", erro);
      res.status(400).json({
        erro: erro.message,
      });
    }
  }

  // MINHAS ADOÇÕES (GET /api/cartinhas/doador/minhas)
  async minhasAdocoes(req, res) {
    try {
     
      if (!req.usuario || req.usuario.tipo !== "doador") {
        return res.status(403).json({
          erro: "Apenas doadores podem ver suas adoções",
        });
      }

      const cartinhas = await Cartinha.minhasAdocoes(req.token, req.usuario.id);
      res.json({
        total: cartinhas.length,
        cartinhas,
      });
    } catch (erro) {
      console.error("❌ Erro no controller minhasAdocoes:", erro);
      res.status(500).json({
        erro: erro.message,
      });
    }
  }

  // ESTATÍSTICAS
  async estatisticas(req, res) {
    try {
      const stats = await Cartinha.estatisticas();

      res.json(stats);
    } catch (erro) {
      console.error("❌ Erro no controller estatisticas:", erro);
      res.status(500).json({
        erro: erro.message,
      });
    }
  }
}

module.exports = new CartinhaController();
