const { supabase } = require('../config/supabase');

module.exports = async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        erro: 'Token não fornecido ou mal formatado'
      });
    }

    req.token = authHeader.split(' ')[1];

    const decoded = require('jsonwebtoken').decode(req.token);

    if (!decoded) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    // Busca por auth_id (UUID do Supabase Auth)
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, nome, email, tipo, inst_id')
      .eq('auth_id', decoded.sub)
      .single();

    // Se não achar por auth_id, tenta por email
    const { data: usuarioEmail } = !usuario ? await supabase
      .from('usuarios')
      .select('id, nome, email, tipo, inst_id')
      .eq('email', decoded.email)
      .single() : { data: null };

    const u = usuario || usuarioEmail;

    req.usuario = {
      id: decoded.sub,
      email: decoded.email,
      tipo: u?.tipo || decoded.user_metadata?.tipo || 'doador',
      inst_id: u?.inst_id || null
    };

    next();

  } catch (erro) {
    return res.status(401).json({
      erro: 'Erro ao processar token',
      detalhes: erro.message
    });
  }
};