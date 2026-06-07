const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// ── Cliente anônimo (consultas públicas, sem autenticação) ─────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ── Cliente autenticado com JWT do usuário logado ─────────────────
// Respeita o RLS com o contexto do usuário (doador / inst / admin)
const getSupabaseAutenticado = (token) => {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );
};

// ── Cliente service-role (bypass total do RLS — só para o backend) ─
// Usado em operações administrativas onde o RLS circular impede leitura
// (ex: listar todos os usuários, listar doadores, etc.)
// NUNCA expor esta key no frontend ou em respostas da API.
const getSupabaseAdmin = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    // Fallback: usa anon key — pode falhar se RLS bloquear
    console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY não definida no .env — usando anon key como fallback');
    return supabase;
  }
  return createClient(
    process.env.SUPABASE_URL,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
};

module.exports = { supabase, getSupabaseAutenticado, getSupabaseAdmin };