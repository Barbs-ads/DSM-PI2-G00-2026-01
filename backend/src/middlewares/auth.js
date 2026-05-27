// Middleware: Validar Token JWT

module.exports = function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;


    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        erro: 'Token não fornecido ou mal formatado',
        esperado: 'Authorization: Bearer SEU_TOKEN_AQUI'
      });
    }

    req.token = authHeader.split(' ')[1];

    const decoded = require('jsonwebtoken').decode(req.token);
    
    if (!decoded) {
      return res.status(401).json({ 
        erro: 'Token inválido' 
      });
    }

    req.usuario = {
      id: decoded.sub,                          // UUID do usuário
      email: decoded.email,                     // Email
      tipo: decoded.user_metadata?.tipo || 'doador'  // Tipo (doador, instituicao, admin)
    };

    next();

  } catch (erro) {
    return res.status(401).json({
      erro: 'Erro ao processar token',
      detalhes: erro.message
    });
  }
};