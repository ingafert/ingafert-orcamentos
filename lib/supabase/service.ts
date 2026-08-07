import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente com privilégios de administrador (ignora as regras de RLS).
// Uso EXCLUSIVO em Server Components e Server Actions — nunca importar
// este arquivo em um componente marcado com "use client".
export function createServiceClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}
