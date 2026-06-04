require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
const rotas = require('./src/routes/index');
app.use('/api', rotas);

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'API Conectando Sonhos funcionando! 🚀' });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
});