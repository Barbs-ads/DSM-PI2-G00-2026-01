require('dotenv').config();
const express = require('express');

// Puxa o seu controller direto, sem passar por pasta de rotas
const authController = require('./src/controllers/authController');

const app = express();

// Isso aqui é essencial pro Postman conseguir enviar o email e senha
app.use(express.json());

// AS ROTAS DIRETO NO SERVER, COMO VOCÊ LEMBROU:
app.post('/api/auth/registrar/doador', authController.registrarDoador);
app.post('/api/auth/registrar/instituicao', authController.registrarInstituicao); // Rota adicionada!
app.post('/api/auth/login', authController.login);

app.listen(3000, () => {
  console.log('✅ Servidor de TESTE rodando na porta 3000');
  console.log('Pronto para testar no Postman!');
});