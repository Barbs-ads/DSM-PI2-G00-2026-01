// ═══════════════════════════════════════════════════════════
// Servidor Principal
// Aqui tudo se junta!
// ═══════════════════════════════════════════════════════════

require('dotenv').config();  // Carregar variáveis de ambiente do .env
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');

// ═══════════════════════════════════════════════════════════
// CRIAR APP EXPRESS
// ═══════════════════════════════════════════════════════════
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500';

// ═══════════════════════════════════════════════════════════
// MIDDLEWARES GLOBAIS
// Executam em TODA requisição ANTES de chegar na rota
// ═══════════════════════════════════════════════════════════

// 1. HELMET - Adiciona headers de segurança HTTP
// Protege contra: XSS, Clickjacking, MIME-sniffing, etc
app.use(helmet());

// 2. CORS - Permitir requisições do frontend
// Sem isso, navegador bloqueia requisições de origem diferente
app.use(cors({ 
  origin: FRONTEND_URL,
  credentials: true
}));

// 3. EXPRESS JSON - Parse requisições com body JSON
// Transforma string JSON em objeto JavaScript
app.use(express.json());

// 4. EXPRESS URL-ENCODED - Parse formulários
// Transforma dados de formulário em objeto JavaScript
app.use(express.urlencoded({ extended: true }));

// 5. MORGAN - Log de requisições
// Mostra no console: GET /api 200 12ms
app.use(morgan('dev'));

// ═══════════════════════════════════════════════════════════
// ROTAS
// ═══════════════════════════════════════════════════════════
// Todas as rotas estão em src/routes/index.js
// Aqui apenas conectamos com o prefixo /api
app.use('/api', routes);

// ═══════════════════════════════════════════════════════════
// TRATAMENTO DE ERROS
// Se nenhuma rota acima respondeu, cai aqui
// ═══════════════════════════════════════════════════════════

// 404 - Rota não encontrada
// (já tratado em routes/index.js, mas deixa por segurança)
app.use((req, res) => {
  res.status(404).json({
    erro: 'Rota não encontrada',
    path: req.path,
    method: req.method
  });
});

// Tratamento de erros (middleware com 4 parâmetros)
app.use((err, req, res, next) => {
  console.error('❌ Erro não capturado:', err);
  res.status(err.status || 500).json({
    erro: err.message || 'Erro interno do servidor',
    detalhes: NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ═══════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║         🎄 CONECTANDO SONHOS - API BACKEND 🎄             ║
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  ✅ Servidor rodando em:                                  ║
║     http://localhost:${PORT}                                   ║
║                                                            ║
║  📍 API em:                                                ║
║     http://localhost:${PORT}/api                              ║
║                                                            ║
║  🌍 CORS habilitado para:                                 ║
║     ${FRONTEND_URL}                                   ║
║                                                            ║
║  ⚙️  Ambiente:                                             ║
║     ${NODE_ENV}                                      ║
║                                                            ║
║  📚 Documentação:                                          ║
║     GET /api (lista todas as rotas)                       ║
║                                                            ║
║  💡 Para testar:                                           ║
║     curl http://localhost:${PORT}/api                         ║
║                                                            ║
║  📦 Dependências:                                          ║
║     express, supabase-js, cors, helmet, morgan            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// ═══════════════════════════════════════════════════════════
// TRATAMENTO DE ERROS NÃO CAPTURADOS
// Se algo muito ruim acontecer
// ═══════════════════════════════════════════════════════════

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada sem tratamento:', reason);
  console.error('Promise:', promise);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exceção não capturada:', error);
  console.error('Aplicação será encerrada!');
  process.exit(1);
});

module.exports = app;
