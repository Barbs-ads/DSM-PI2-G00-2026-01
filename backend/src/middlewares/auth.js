// Middleware: Validar Token JWT
const { getSupabaseAutenticado } = require("../config/supabase");

module.exports = async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        erro: "Token não fornecido ou mal formatado",
        esperado: "Authorization: Bearer SEU_TOKEN_AQUI",
      });
    }

    req.token = authHeader.split(" ")[1];

    const decoded = require("jsonwebtoken").decode(req.token);

    if (!decoded) {
      return res.status(401).json({
        erro: "Token inválido",
      });
    }

    const clientLogado = getSupabaseAutenticado(req.token);

    const { data: usuarioBanco, error } = await clientLogado
      .from("usuarios")
      .select("id, tipo, inst_id")
      .eq("auth_id", decoded.sub)
      .single();

    if (error || !usuarioBanco) {
      return res.status(401).json({
        erro: "Usuário não encontrado no banco de dados.",
        detalhes: error ? error.message : "Nenhum registro com este auth_id.",
      });
    }

    req.usuario = {
      id: usuarioBanco.id,
      auth_id: decoded.sub,
      email: decoded.email,
      tipo: usuarioBanco.tipo,
      inst_id: usuarioBanco.inst_id || null,
    };

    console.log("TIPO REAL:", req.usuario.tipo);
    console.log("USER:", req.usuario);

    next();
  } catch (erro) {
    return res.status(500).json({
      erro: "Erro interno ao processar token e buscar usuário",
      detalhes: erro.message,
    });
  }
};
