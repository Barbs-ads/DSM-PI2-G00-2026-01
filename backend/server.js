// Servidor

require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./src/routes/index');

// CRIAR APP EXPRESS

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5500';


app.use(helmet());

// Permite que mais de uma origem (URL) fale com o backend
const allowedOrigins = [
  FRONTEND_URL, 
  'http://localhost:5500', 
  'http://127.0.0.1:5500'
];

app.use(cors({
  origin: function (origin, callback) {
    // Permite requests sem origin (como ferramentas como Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'A política CORS deste site não permite acesso desta origem.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));


app.use(express.json());


app.use(express.urlencoded({ extended: true }));


app.use(morgan('dev'));


// ROTAS

app.use('/api', routes);


// 404 - Rota não encontrada
app.use((req, res) => {
  res.status(404).json({
    erro: 'Rota não encontrada',
    path: req.path,
    method: req.method
  });
});


app.use((err, req, res, next) => {
  console.error('❌ Erro não capturado:', err);
  res.status(err.status || 500).json({
    erro: err.message || 'Erro interno do servidor',
    detalhes: NODE_ENV === 'development' ? err.stack : undefined
  });
});

// INICIAR SERVIDOR

app.listen(PORT, () => {
  console.log(`

                                                            
         🎄 CONECTANDO SONHOS - API BACKEND 🎄             
                                                            

                                                           
  ✅ Servidor rodando em:                                       http://localhost:${PORT}                                   
                                                            
  📍 API em:                                                
   http://localhost:${PORT}/api                              
                                                            
  🌍 CORS habilitado para:                                 
     ${FRONTEND_URL}                                   
                                                            
  ⚙️  Ambiente:                                             
     ${NODE_ENV}                                      
                                                            
  📚 Documentação:                                          
     GET /api (lista todas as rotas)                       
                                                            
  💡 Para testar:                                           
     curl http://localhost:${PORT}/api                         
                                                            
  📦 Dependências:                                          
     express, supabase-js, cors, helmet, morgan            
                                                            
  `);
});

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