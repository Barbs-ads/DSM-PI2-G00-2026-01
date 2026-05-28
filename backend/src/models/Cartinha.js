// ═══════════════════════════════════════════════════════════
// Model: Cartinha
// Contém TODA a lógica de banco de dados para cartinhas
// Controllers chamam essas funções!
// ═══════════════════════════════════════════════════════════

const { supabase, getSupabaseAutenticado } = require('../config/supabase');

class Cartinha {

  // ═══ LISTAR TODAS (Público) ═══
  // Qualquer pessoa pode chamar, não precisa token
  static async buscarTodas(filtros = {}) {
    try {
      // Começa com a query básica
      let query = supabase
        .from('vw_cartinhas_publicas')  // Usa VIEW segura do banco
        .select('*');

      // Aplicar filtros (se enviados pelo controller)
      if (filtros.status) {
        query = query.eq('status', filtros.status);
      }

      if (filtros.categoria_id) {
        query = query.eq('categoria_id', parseInt(filtros.categoria_id));
      }

      if (filtros.inst_id) {
        query = query.eq('inst_id', parseInt(filtros.inst_id));
      }

      if (filtros.busca) {
        // Busca textual - procura no texto da cartinha
        query = query.ilike('texto', `%${filtros.busca}%`);
      }

      // Paginação
      if (filtros.limite) {
        const offset = filtros.offset || 0;
        query = query.range(offset, offset + filtros.limite - 1);
      }

      // Ordenação
      query = query.order('criada_em', { ascending: false });

      // Executar query
      const { data, error } = await query;

      if (error) throw error;

      return data || [];

    } catch (erro) {
      console.error('❌ Erro ao listar cartinhas:', erro.message);
      throw erro;
    }
  }

  // ═══ BUSCAR UMA POR ID (Público) ═══
  // Retorna 1 cartinha com TODOS os dados (inclusive doador)
  static async buscarPorId(id) {
    try {
      const { data, error } = await supabase
        .from('vw_cartinhas_publicas')
        .select('*')
        .eq('id', id)
        .single();  // .single() = retorna 1 resultado, não array

      if (error) throw error;

      return data;

    } catch (erro) {
      console.error('❌ Erro ao buscar cartinha:', erro.message);
      throw erro;
    }
  }

  // ═══ ADOTAR CARTINHA ═══
  // 🔑 AQUI TEM A MÁGICA! Passa o token para Supabase!
  // Doador seleciona um presente e um ponto de coleta
  static async adotar(cartinhaId, pontoId, token) {
    try {
      // 🔑 CLIENTE AUTENTICADO - sabe quem está adotando!
      const client = getSupabaseAutenticado(token);

      console.log(`🎁 Adotando cartinha ${cartinhaId}...`);

      // Chama a função RPC do banco
      // A RPC já tem toda a lógica de validação:
      // - Verifica se cartinha está disponível
      // - Valida se ponto existe
      // - Cria evento
      // - Atualiza status
      const { data, error } = await client.rpc('adotar_cartinha', {
        _cartinha_id: cartinhaId,
        _ponto_id: pontoId
      });

      if (error) {
        console.error('❌ Erro ao adotar:', error.message);
        throw error;
      }

      console.log('✅ Cartinha adotada!');

      return data;

    } catch (erro) {
      console.error('❌ Erro no model adotar:', erro.message);
      throw erro;
    }
  }

  // ═══ CRIAR CARTINHA ═══
  // Instituição cria uma nova cartinha
  // Ela começa com status 'aguardando' (admin precisa aprovar)
  static async criar(dados, token) {
    try {
      const client = getSupabaseAutenticado(token);

      console.log('📝 Criando nova cartinha...');

      // Validar dados obrigatórios
      if (!dados.crianca_id || !dados.inst_id || !dados.categoria_id) {
        throw new Error('crianca_id, inst_id e categoria_id são obrigatórios');
      }

      if (!dados.texto || dados.texto.length < 20) {
        throw new Error('Texto deve ter no mínimo 20 caracteres');
      }

      // Inserir na tabela
      const { data, error } = await client
        .from('cartinhas')
        .insert({
          crianca_id: dados.crianca_id,
          inst_id: dados.inst_id,
          categoria_id: dados.categoria_id,
          texto: dados.texto,
          foto_url: dados.foto_url || null,
          status: 'aguardando'  // Começa aguardando aprovação
        })
        .select();

      if (error) throw error;

      console.log('✅ Cartinha criada!');

      return data[0];

    } catch (erro) {
      console.error('❌ Erro ao criar cartinha:', erro.message);
      throw erro;
    }
  }

  // ═══ APROVAR CARTINHA ═══
  // Admin aprova - cartinha vai para "disponível" no mural
  // Precisa do token do admin
  static async aprovar(cartinhaId, token) {
    try {
      const client = getSupabaseAutenticado(token);

      console.log(`✅ Aprovando cartinha ${cartinhaId}...`);

      const { data, error } = await client
        .from('cartinhas')
        .update({ 
          status: 'disponivel',
          aprovada_em: new Date()
        })
        .eq('id', cartinhaId)
        .select();

      if (error) throw error;

      return data[0];

    } catch (erro) {
      console.error('❌ Erro ao aprovar:', erro.message);
      throw erro;
    }
  }

  // ═══ MARCAR COMO ENTREGUE ═══
  // Admin marca quando presente foi entregue à criança
  // Completa o ciclo
  static async marcarEntregue(cartinhaId, token) {
    try {
      const client = getSupabaseAutenticado(token);

      console.log(`📦 Marcando cartinha ${cartinhaId} como entregue...`);

      const { data, error } = await client
        .from('cartinhas')
        .update({ 
          status: 'entregue',
          entregue_em: new Date()
        })
        .eq('id', cartinhaId)
        .select();

      if (error) throw error;

      return data[0];

    } catch (erro) {
      console.error('❌ Erro ao marcar entregue:', erro.message);
      throw erro;
    }
  }

  // ═══ CANCELAR CARTINHA ═══
  // Admin cancela se houver problema
  static async cancelar(cartinhaId, motivo, token) {
    try {
      const client = getSupabaseAutenticado(token);

      console.log(`❌ Cancelando cartinha ${cartinhaId}...`);

      const { data, error } = await client
        .from('cartinhas')
        .update({ 
          status: 'cancelada',
          cancelada_em: new Date(),
          motivo_cancel: motivo
        })
        .eq('id', cartinhaId)
        .select();

      if (error) throw error;

      return data[0];

    } catch (erro) {
      console.error('❌ Erro ao cancelar:', erro.message);
      throw erro;
    }
  }

  // ═══ MINHAS ADOÇÕES (Doador) ═══
  // Doador vê todas as cartinhas que adotou
  static async minhasAdocoes(token) {
    try {
      const client = getSupabaseAutenticado(token);

      console.log('📋 Buscando minhas adoções...');

      // RLS já filtra para mostrar só as do usuário!
      const { data, error } = await client
        .from('vw_cartinhas_publicas')
        .select('*')
        .eq('status', 'adotada');  // Só cartinhas adotadas

      if (error) throw error;

      return data || [];

    } catch (erro) {
      console.error('❌ Erro ao buscar adoções:', erro.message);
      throw erro;
    }
  }

  // ═══ CARTINHAS DA INSTITUIÇÃO ═══
  // Instituição vê suas próprias cartinhas (criadas por ela)
  static async cartinhasPorInstituicao(instId, token) {
    try {
      const client = getSupabaseAutenticado(token);

      const { data, error } = await client
        .from('vw_cartinhas_publicas')
        .select('*')
        .eq('inst_id', instId);

      if (error) throw error;

      return data || [];

    } catch (erro) {
      console.error('❌ Erro ao buscar cartinhas da instituição:', erro.message);
      throw erro;
    }
  }

  // ═══ ESTATÍSTICAS ═══
  // Quantas cartinhas em cada status
  static async estatisticas() {
    try {
      const { data, error } = await supabase
        .rpc('get_cartinhas_stats');  // RPC do banco

      if (error) throw error;

      return data;

    } catch (erro) {
      console.error('❌ Erro ao buscar estatísticas:', erro.message);
      throw erro;
    }
  }
}

module.exports = Cartinha;