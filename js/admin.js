let adminProfile = null;

async function carregarAdmin() {
    await requireLogin();

    adminProfile = await getCurrentProfile();

    if (!adminProfile || !adminProfile.is_admin) {
        alert("Acesso permitido apenas para administradores.");
        window.location.href = "index.html";
        return;
    }

    await carregarAlunos();
    await carregarOpcoes();
    await carregarHistorico();
}

async function carregarAlunos() {
    const div = document.getElementById("lista-alunos");

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .order("class_code")
        .order("call_number");

    if (error) {
        div.innerHTML = `<p class="error">${error.message}</p>`;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Turma</th>
                    <th>Nº</th>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Status</th>
                    <th>Admin</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(aluno => {
        html += `
            <tr>
                <td>${aluno.class_code}</td>
                <td>${aluno.call_number}</td>
                <td>${aluno.first_name} ${aluno.last_name}</td>
                <td>${aluno.email}</td>
                <td><span class="badge ${aluno.status === "aprovado" ? "green" : "yellow"}">${aluno.status}</span></td>
                <td>${aluno.is_admin ? "Sim" : "Não"}</td>
                <td>
                    <button class="success" onclick="alterarStatusAluno('${aluno.id}', 'aprovado')">Aprovar</button>
                    <button class="warning" onclick="alterarStatusAluno('${aluno.id}', 'pendente')">Pendente</button>
                    <button class="danger" onclick="alterarStatusAluno('${aluno.id}', 'bloqueado')">Bloquear</button>
                </td>
            </tr>
        `;
    });

    html += "</tbody></table>";

    div.innerHTML = html;
}

async function alterarStatusAluno(id, status) {
    const { error } = await supabaseClient
        .from("profiles")
        .update({ status })
        .eq("id", id);

    if (error) {
        alert("Erro: " + error.message);
        return;
    }

    await carregarAlunos();
}

async function criarOpcoesGrupo() {
    const msg = document.getElementById("msg-opcoes");

    const classCode = document.getElementById("class_code").value.trim().toUpperCase();
    const subject = document.getElementById("subject").value.trim().toUpperCase();
    const theme = document.getElementById("theme").value.trim().toUpperCase();
    const lettersRaw = document.getElementById("letters").value.trim().toUpperCase();
    const maxMembers = Number(document.getElementById("max_members").value);
    const fullCapacityCount = Number(document.getElementById("full_capacity_count").value);

    if (!classCode || !subject || !theme || !lettersRaw || !maxMembers) {
        msg.innerHTML = `<p class="error">Preencha todos os campos.</p>`;
        return;
    }

    const letters = lettersRaw
        .split(",")
        .map(l => l.trim())
        .filter(l => l.length === 1);

    if (letters.length === 0) {
        msg.innerHTML = `<p class="error">Informe letras válidas, como A,B,C.</p>`;
        return;
    }

    if (fullCapacityCount < 0 || fullCapacityCount > letters.length) {
        msg.innerHTML = `<p class="error">A quantidade de grupos com tamanho maior deve estar entre 0 e ${letters.length}.</p>`;
        return;
    }

    if (maxMembers < 2) {
        msg.innerHTML = `<p class="error">O tamanho maior precisa ser pelo menos 2, pois os demais terão um aluno a menos.</p>`;
        return;
    }

    const smallerMaxMembers = maxMembers - 1;

    const rows = letters.map((letter, index) => {
        const groupMaxMembers = index < fullCapacityCount
            ? maxMembers
            : smallerMaxMembers;

        return {
            class_code: classCode,
            subject,
            theme,
            group_letter: letter,
            max_members: groupMaxMembers,
            active: true,
            created_by: adminProfile.id
        };
    });

    const { error } = await supabaseClient
        .from("group_options")
        .insert(rows);

    if (error) {
        msg.innerHTML = `<p class="error">Erro: ${error.message}</p>`;
        return;
    }

    const resumo = rows
        .map(r => `${r.class_code} ${r.subject} ${r.theme} ${r.group_letter}: máximo ${r.max_members}`)
        .join("<br>");

    msg.innerHTML = `
        <p class="success-text">Opções criadas com sucesso.</p>
        <p class="small">${resumo}</p>
    `;

    document.getElementById("class_code").value = "";
    document.getElementById("subject").value = "";
    document.getElementById("theme").value = "";
    document.getElementById("letters").value = "";
    document.getElementById("max_members").value = "6";
    document.getElementById("full_capacity_count").value = "2";

    await carregarOpcoes();
}

async function carregarOpcoes() {
    const div = document.getElementById("lista-opcoes");

    const { data, error } = await supabaseClient
        .from("group_options")
        .select("*")
        .order("class_code")
        .order("subject")
        .order("theme")
        .order("group_letter");

    if (error) {
        div.innerHTML = `<p class="error">${error.message}</p>`;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Turma</th>
                    <th>Disciplina</th>
                    <th>Tema</th>
                    <th>Letra</th>
                    <th>Máx.</th>
                    <th>Ativa</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(op => {
        html += `
            <tr>
                <td>${op.class_code}</td>
                <td>${op.subject}</td>
                <td>${op.theme}</td>
                <td>${op.group_letter}</td>
                <td>${op.max_members}</td>
                <td>${op.active ? "Sim" : "Não"}</td>
                <td>
                    <button class="secondary" onclick="alternarOpcao('${op.id}', ${!op.active})">
                        ${op.active ? "Desativar" : "Ativar"}
                    </button>
                </td>
            </tr>
        `;
    });

    html += "</tbody></table>";

    div.innerHTML = html;
}

async function alternarOpcao(id, active) {
    const { error } = await supabaseClient
        .from("group_options")
        .update({ active })
        .eq("id", id);

    if (error) {
        alert("Erro: " + error.message);
        return;
    }

    await carregarOpcoes();
}

async function carregarHistorico() {
    const div = document.getElementById("lista-historico");

    const { data, error } = await supabaseClient
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) {
        div.innerHTML = `<p class="error">${error.message}</p>`;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Data/hora</th>
                    <th>Ação</th>
                    <th>Detalhes</th>
                    <th>Motivo</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(item => {
        html += `
            <tr>
                <td>${new Date(item.created_at).toLocaleString("pt-BR")}</td>
                <td>${item.action}</td>
                <td><pre>${JSON.stringify(item.details, null, 2)}</pre></td>
                <td>${item.reason || ""}</td>
            </tr>
        `;
    });

    html += "</tbody></table>";

    div.innerHTML = html;
}