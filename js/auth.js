async function getSession() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error(error);
        return null;
    }

    return data.session;
}

async function getCurrentProfile() {
    const session = await getSession();

    if (!session) {
        return null;
    }

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

    if (error) {
        console.error(error);
        return null;
    }

    return data;
}

async function requireLogin() {
    const session = await getSession();

    if (!session) {
        window.location.href = "login.html";
        return null;
    }

    return session;
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
}

async function loginUsuario(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const msg = document.getElementById("msg");

    msg.textContent = "Entrando...";

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        msg.textContent = "Erro: " + error.message;
        msg.className = "error";
        return;
    }

    const profile = await getCurrentProfile();

    if (!profile) {
        msg.textContent = "Login feito, mas perfil não encontrado.";
        msg.className = "error";
        return;
    }

    if (profile.status !== "aprovado") {
        msg.textContent = "Seu cadastro ainda não foi aprovado pelo administrador.";
        msg.className = "error";
        await supabaseClient.auth.signOut();
        return;
    }

    if (profile.must_change_password) {
        window.location.href = "change-password.html";
        return;
    }

    if (profile.is_admin) {
        window.location.href = "admin.html";
    } else {
        window.location.href = "index.html";
    }
}

async function cadastrarUsuario(event) {
    event.preventDefault();

    const firstName = document.getElementById("first_name").value.trim();
    const lastName = document.getElementById("last_name").value.trim();
    const callNumber = Number(document.getElementById("call_number").value);
    const classCode = document.getElementById("class_code").value.trim().toUpperCase();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const msg = document.getElementById("msg");

    msg.textContent = "Criando cadastro...";
    msg.className = "";

    // Formato XEMY:
    // 1EMA, 2EMB, 3EMC, 10EMA, etc.
    const turmaRegex = /^\d+EM[A-C]$/;

    if (!turmaRegex.test(classCode)) {
        msg.textContent = "Turma inválida. Use o formato XEMY, por exemplo: 1EMA, 2EMB, 3EMC.";
        msg.className = "error";
        return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: {
                first_name: firstName,
                last_name: lastName,
                call_number: callNumber,
                class_code: classCode
            }
        }
    });

    if (error) {
        msg.textContent = "Erro: " + error.message;
        msg.className = "error";
        return;
    }

    msg.textContent = "Cadastro criado. Aguarde aprovação do administrador.";
    msg.className = "success-text";

    document.getElementById("form-cadastro").reset();
}
async function trocarSenhaTemporaria(event) {
    event.preventDefault();

    const novaSenha = document.getElementById("new_password").value;
    const confirmarSenha = document.getElementById("confirm_password").value;
    const msg = document.getElementById("msg");

    msg.textContent = "";
    msg.className = "";

    if (novaSenha.length < 6) {
        msg.textContent = "A nova senha deve ter pelo menos 6 caracteres.";
        msg.className = "error";
        return;
    }

    if (novaSenha !== confirmarSenha) {
        msg.textContent = "As senhas não coincidem.";
        msg.className = "error";
        return;
    }

    const { error: authError } = await supabaseClient.auth.updateUser({
        password: novaSenha
    });

    if (authError) {
        msg.textContent = "Erro ao atualizar senha: " + authError.message;
        msg.className = "error";
        return;
    }

    const { error: clearError } = await supabaseClient.rpc("clear_must_change_password");

    if (clearError) {
        msg.textContent = "Senha alterada, mas houve erro ao finalizar a rotina: " + clearError.message;
        msg.className = "error";
        return;
    }

    msg.textContent = "Senha alterada com sucesso.";
    msg.className = "success-text";

    const profile = await getCurrentProfile();

    if (profile?.is_admin) {
        window.location.href = "admin.html";
    } else {
        window.location.href = "index.html";
    }
}