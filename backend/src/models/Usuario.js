const { supabase, getSupabaseAutenticado } = require('../config/supabase');

class Usuario {

  // ═══ BUSCAR POR ID ═══
  static async buscarPorId(id) {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, tipo, telefone, cidade, uf, inst_id, criado_em')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (erro) {
      console.error('❌ Erro ao buscar usuário:', erro.message);
      throw erro;
    }
  }

  // ═══ BUSCAR POR EMAIL ═══
  static async buscarPorEmail(email) {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, tipo, telefone, cidade, uf, inst_id, criado_em')
        .eq('email', email)
        .single();

      if (error) throw error;
      return data;
    } catch (erro) {
      console.error('❌ Erro ao buscar usuário por email:', erro.message);
      throw erro;
    }
  }

  // ═══ ATUALIZAR PERFIL ═══
  static async atualizar(id, dados, token) {
    try {
      const client = getSupabaseAutenticado(token);

      const camposPermitidos = ['nome', 'telefone', 'cep', 'uf', 'cidade', 'bairro', 'endereco'];
      const dadosFiltrados = {};
      camposPermitidos.forEach(campo => {
        if (dados[campo] !== undefined) dadosFiltrados[campo] = dados[campo];
      });

      const { data, error } = await client
        .from('usuarios')
        .update(dadosFiltrados)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data[0];
    } catch (erro) {
      console.error('❌ Erro ao atualizar usuário:', erro.message);
      throw erro;
    }
  }

  // ═══ LISTAR TODOS (Admin) ═══
  static async listarTodos(token) {
    try {
      const client = getSupabaseAutenticado(token);

      const { data, error } = await client
        .from('usuarios')
        .select('id, nome, email, tipo, cidade, uf, criado_em')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (erro) {
      console.error('❌ Erro ao listar usuários:', erro.message);
      throw erro;
    }
  }
}

module.exports = Usuario;