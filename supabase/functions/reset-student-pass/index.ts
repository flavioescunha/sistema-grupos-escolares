import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Método não permitido." }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization ausente." }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Cliente do usuário logado
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Cliente admin
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado." }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Verifica se quem chamou é admin aprovado
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, is_admin, status")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || !profile.is_admin || profile.status !== "aprovado") {
      return new Response(JSON.stringify({ error: "Acesso permitido apenas para administrador." }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const targetUserId = body?.target_user_id;

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "target_user_id é obrigatório." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Reseta a senha do aluno
    const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password: "senhatemp" }
    );

    if (resetError) {
      return new Response(JSON.stringify({ error: resetError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Marca obrigação de troca
    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", targetUserId);

    if (profileUpdateError) {
      return new Response(JSON.stringify({ error: profileUpdateError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(
      JSON.stringify({ success: true, temp_password: "senhatemp" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
