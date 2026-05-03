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
    await carregarGruposAdmin();
    await carregarPedidosAdmin();
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

async function carregarGruposAdmin() {
    const div = document.getElementById("lista-grupos-admin");

    const { data, error } = await supabaseClient
        .from("groups")
        .select("*")
        .order("class_code")
        .order("subject")
        .order("theme")
        .order("group_letter");

    if (error) {
        div.innerHTML = `<p class="error">${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        div.innerHTML = `<p>Nenhum grupo criado ainda.</p>`;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Turma</th>
                    <th>Grupo</th>
                    <th>Máx.</th>
                    <th>Ativo</th>
                    <th>Criado em</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(grupo => {
        html += `
            <tr>
                <td>${grupo.class_code}</td>
                <td>${grupo.name}</td>
                <td>${grupo.max_members}</td>
                <td>
                    <span class="badge ${grupo.active ? "green" : "red"}">
                        ${grupo.active ? "Sim" : "Não"}
                    </span>
                </td>
                <td>${new Date(grupo.created_at).toLocaleString("pt-BR")}</td>
                <td>
                    ${
                        grupo.active
                            ? `<button class="danger" onclick="desativarGrupoAdmin('${grupo.id}', '${escapeHtml(grupo.name)}')">Excluir/desativar</button>`
                            : `<span class="small">Grupo inativo</span>`
                    }
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    div.innerHTML = html;
}

async function carregarPedidosAdmin() {
    const div = document.getElementById("lista-pedidos-admin");

    const { data, error } = await supabaseClient
        .from("join_requests")
        .select(`
            id,
            group_id,
            requester_id,
            status,
            created_at,
            groups (
                name,
                class_code,
                subject,
                theme,
                group_letter,
                max_members
            ),
            profiles (
                first_name,
                last_name,
                call_number,
                class_code,
                email
            )
        `)
        .eq("status", "pendente")
        .order("created_at", { ascending: true });

    if (error) {
        div.innerHTML = `<p class="error">${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        div.innerHTML = `<p>Nenhum pedido de entrada pendente.</p>`;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Aluno</th>
                    <th>Turma</th>
                    <th>Grupo</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(pedido => {
        const aluno = pedido.profiles;
        const grupo = pedido.groups;

        const nomeAluno = aluno
            ? `${aluno.call_number} - ${aluno.first_name} ${aluno.last_name}`
            : "Aluno não encontrado";

        const nomeGrupo = grupo
            ? grupo.name
            : "Grupo não encontrado";

        const turma = aluno
            ? aluno.class_code
            : "";

        html += `
            <tr>
                <td>${new Date(pedido.created_at).toLocaleString("pt-BR")}</td>
                <td>${nomeAluno}</td>
                <td>${turma}</td>
                <td>${nomeGrupo}</td>
                <td>
                    <button class="success" onclick="aprovarPedidoEntradaAdmin('${pedido.id}', '${escapeHtml(nomeAluno)}', '${escapeHtml(nomeGrupo)}')">
                        Aceitar pelo admin
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    div.innerHTML = html;
}

async function desativarGrupoAdmin(groupId, groupName) {
    const motivo = prompt(
        `Informe o motivo para excluir/desativar o grupo:\n\n${groupName}`
    );

    if (motivo === null) {
        return;
    }

    if (motivo.trim().length < 3) {
        alert("Informe um motivo com pelo menos 3 caracteres.");
        return;
    }

    if (!confirm(`Tem certeza de que deseja desativar o grupo?\n\n${groupName}`)) {
        return;
    }

    const { data, error } = await supabaseClient.rpc("admin_deactivate_group", {
        p_group_id: groupId,
        p_reason: motivo.trim()
    });

    if (error) {
        alert("Erro: " + error.message);
        return;
    }

    alert("Resultado: " + data);

    await carregarGruposAdmin();
    await carregarPedidosAdmin();
    await carregarHistorico();
}

async function aprovarPedidoEntradaAdmin(requestId, nomeAluno, nomeGrupo) {
    const motivo = prompt(
        `Informe o motivo para aceitar este aluno pelo admin:\n\nAluno: ${nomeAluno}\nGrupo: ${nomeGrupo}`
    );

    if (motivo === null) {
        return;
    }

    if (motivo.trim().length < 3) {
        alert("Informe um motivo com pelo menos 3 caracteres.");
        return;
    }

    if (!confirm(`Confirmar entrada do aluno no grupo?\n\nAluno: ${nomeAluno}\nGrupo: ${nomeGrupo}`)) {
        return;
    }

    const { data, error } = await supabaseClient.rpc("admin_approve_join_request", {
        p_request_id: requestId,
        p_reason: motivo.trim()
    });

    if (error) {
        alert("Erro: " + error.message);
        return;
    }

    alert("Resultado: " + data);

    await carregarAlunos();
    await carregarGruposAdmin();
    await carregarPedidosAdmin();
    await carregarHistorico();
}

function escapeHtml(text) {
    if (text === null || text === undefined) {
        return "";
    }

    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}