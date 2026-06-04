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

    // Busca inst_id e tipo correto do banco
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, nome, email, tipo, inst_id')
      .eq('email', decoded.email)
      .single();

    req.usuario = {
      id: decoded.sub,
      email: decoded.email,
      tipo: usuario?.tipo || decoded.user_metadata?.tipo || 'doador',
      inst_id: usuario?.inst_id || null
    };

    next();

  } catch (erro) {
    return res.status(401).json({
      erro: 'Erro ao processar token',
      detalhes: erro.message
    });
  }
};