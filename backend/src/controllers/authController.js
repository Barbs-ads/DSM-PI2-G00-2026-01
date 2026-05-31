// Controller: Autenticação
// Responsável por registrar e fazer login
const { supabase } = require('../config/supabase');

class AuthController {

  async registrarDoador(req, res) {
    try {
      const { 
        nome,
        email, 
        senha, 
        telefone, 
        cep, 
        uf, 
        cidade, 
        bairro,
        endereco 
      } = req.body;

      if (!nome || !email || !senha) {
        return res.status(400).json({
          erro: 'Nome, email e senha são obrigatórios'
        });
      }

      if (senha.length < 6) {
        return res.status(400).json({
          erro: 'Senha deve ter no mínimo 6 caracteres'
        });
      }

      console.log('📝 Registrando doador:', email);

      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: { 
            nome, 
            telefone, 
            tipo: 'doador',
            cep, 
            uf, 
            cidade, 
            bairro,
            endereco
          }
        }
      });

      if (error) {
        console.error('❌ Erro ao registrar:', error.message);
        return res.status(400).json({ 
          erro: error.message 
        });
      }

      console.log('✅ Doador registrado:', email);

      res.status(201).json({
        mensagem: '✅ Doador cadastrado com sucesso!',
        email: data.user?.email,
        token: data.session?.access_token || 'Confirme seu email para fazer login'
      });

    } catch (erro) {
      console.error('❌ Erro no servidor:', erro);
      res.status(500).json({ 
        erro: 'Erro ao criar cadastro',
        detalhes: erro.message 
      });
    }
  }


  async registrarInstituicao(req, res) {
    try {
      const { 
        nome_instituicao,
        tipo,
        cnpj,
        email_instituicao,
        telefone,
        endereco,
        bairro,
        cidade,
        uf,
        responsavel_nome,
        responsavel_email,
        responsavel_telefone,
        senha
      } = req.body;

      // Validações
      if (!nome_instituicao || !responsavel_email || !senha) {
        return res.status(400).json({
          erro: 'Nome da instituição, email do responsável e senha são obrigatórios'
        });
      }

      console.log('🏢 Registrando instituição:', nome_instituicao);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: responsavel_email,
        password: senha,
        options: {
          data: { 
            nome: responsavel_nome, 
            tipo: 'instituicao'
          }
        }
      });

      if (authError) {
        return res.status(400).json({ 
          erro: authError.message 
        });
      }

      const { data: instData, error: instError } = await supabase
        .from('instituicoes')
        .insert({
          nome: nome_instituicao,
          tipo,
          cnpj,
          email: email_instituicao,
          telefone,
          endereco,
          bairro,
          cidade,
          uf,
          responsavel_nome,
          responsavel_email,
          responsavel_telefone,
          verificada: false  // Aguardando aprovação
        })
        .select();

      if (instError) {
        return res.status(400).json({ 
          erro: instError.message 
        });
      }

      console.log('✅ Instituição registrada:', nome_instituicao);

      res.status(201).json({
        mensagem: '✅ Instituição cadastrada! Aguarde aprovação do administrador.',
        instituicao_id: instData[0].id,
        email: responsavel_email
      });

    } catch (erro) {
      console.error('❌ Erro:', erro);
      res.status(500).json({ 
        erro: 'Erro ao criar instituição',
        detalhes: erro.message 
      });
    }
  }

  // LOGIN 
  async login(req, res) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({
          erro: 'Email e senha são obrigatórios'
        });
      }

      console.log('🔐 Login tentando:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha
      });

      if (error) {
        console.error('❌ Login falhou:', error.message);
        return res.status(401).json({ 
          erro: 'Email ou senha incorretos' 
        });
      }

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .single();

      console.log('✅ Login bem-sucedido:', email);

      res.json({
        mensagem: 'Login realizado com sucesso! 🎉',
        token: data.session.access_token,
        usuario: {
          id: data.user.id,
          email: data.user.email,
          nome: usuarioData?.nome,
          tipo: usuarioData?.tipo,
          inst_id: usuarioData?.inst_id
        }
      });

    } catch (erro) {
      console.error('❌ Erro no servidor:', erro);
      res.status(500).json({ 
        erro: 'Erro ao fazer login',
        detalhes: erro.message 
      });
    }
  }

  // LOGOUT 
 
  async logout(req, res) {
    try {
    
      res.json({ 
        mensagem: 'Logout realizado com sucesso' 
      });
    } catch (erro) {
      res.status(500).json({ 
        erro: 'Erro ao fazer logout' 
      });
    }
  }


  async verificarToken(req, res) {
    try {
      res.json({
        valido: true,
        usuario: req.usuario
      });
    } catch (erro) {
      res.status(401).json({ 
        erro: 'Token inválido' 
      });
    }
  }
}

module.exports = new AuthController();