let adminProfile = null;
let perfisAdminCache = [];
let gruposAdminCache = [];
let pedidosAdminCache = [];
let opcoesAdminCache = [];
let membrosAdminCache = [];

async function carregarAdmin() {
    await requireLogin();

    adminProfile = await getCurrentProfile();

    if (!adminProfile || !adminProfile.is_admin) {
        alert("Acesso permitido apenas para administradores.");
        window.location.href = "index.html";
        return;
    }

    await carregarAlunos();
    await carregarPerfisAdmin();
    popularFiltroTurmasAdmin();
    await carregarOpcoes();
    await carregarGruposAdmin();
    await carregarPedidosAdmin();
    await carregarHistorico();
}

async function carregarAlunos() {
    const div = document.getElementById("lista-alunos");

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("*");

    if (error) {
        div.innerHTML = `<p class="error">${error.message}</p>`;
        return;
    }

    const ordemStatus = {
        pendente: 0,
        aprovado: 1,
        bloqueado: 2,
        rejeitado: 3
    };

    const alunosOrdenados = (data || []).slice().sort((a, b) => {
        const oa = ordemStatus[a.status] ?? 99;
        const ob = ordemStatus[b.status] ?? 99;

        if (oa !== ob) return oa - ob;
        if ((a.class_code || "") !== (b.class_code || "")) {
            return (a.class_code || "").localeCompare(b.class_code || "");
        }
        return (a.call_number || 0) - (b.call_number || 0);
    });

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

    alunosOrdenados.forEach(aluno => {
        html += `
            <tr>
                <td>${aluno.class_code || ""}</td>
                <td>${aluno.call_number ?? ""}</td>
                <td>${aluno.first_name || ""} ${aluno.last_name || ""}</td>
                <td>${aluno.email || ""}</td>
                <td>${aluno.status || ""}</td>
                <td>${aluno.is_admin ? "Sim" : "Não"}</td>
                <td>
                    <button class="success" onclick="alterarStatusAluno('${aluno.id}', 'aprovado')">Aprovar</button>
                    <button class="warning" onclick="alterarStatusAluno('${aluno.id}', 'pendente')">Pendente</button>
                    <button class="danger" onclick="alterarStatusAluno('${aluno.id}', 'bloqueado')">Bloquear</button>
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
    await carregarPerfisAdmin();
    popularFiltroTurmasAdmin();
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
        const groupMaxMembers = index < fullCapacityCount ? maxMembers : smallerMaxMembers;

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
    await carregarGruposAdmin();
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

    (data || []).forEach(op => {
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

    html += `
            </tbody>
        </table>
    `;

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
    await carregarGruposAdmin();
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

    (data || []).forEach(item => {
        html += `
            <tr>
                <td>${new Date(item.created_at).toLocaleString("pt-BR")}</td>
                <td>${item.action}</td>
                <td><pre>${JSON.stringify(item.details, null, 2)}</pre></td>
                <td>${item.reason || ""}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    div.innerHTML = html;
}

async function carregarPerfisAdmin() {
    const { data, error } = await supabaseClient
        .from("profiles")
        .select("id, first_name, last_name, call_number, class_code, email, status, is_admin")
        .order("class_code")
        .order("call_number");

    if (error) {
        console.error("Erro ao carregar perfis para admin:", error.message);
        perfisAdminCache = [];
        return;
    }

    perfisAdminCache = data || [];
}

function popularFiltroTurmasAdmin() {
    const select = document.getElementById("filtro-turma-admin");
    if (!select) return;

    const valorAtual = select.value || "";

    const turmas = [...new Set(
        perfisAdminCache
            .map(p => (p.class_code || "").trim())
            .filter(Boolean)
    )].sort();

    let html = `<option value="">Todas as turmas</option>`;

    turmas.forEach(turma => {
        html += `<option value="${turma}">${turma}</option>`;
    });

    select.innerHTML = html;
    select.value = valorAtual;
}

function aplicarFiltroTurmaAdmin() {
    renderizarGruposAdmin();
    renderizarPedidosAdmin();
}

async function carregarGruposAdmin() {
    const div = document.getElementById("lista-grupos-admin");

    const [opcoesResp, gruposResp, membrosResp] = await Promise.all([
        supabaseClient
            .from("group_options")
            .select("*")
            .order("class_code")
            .order("subject")
            .order("theme")
            .order("group_letter"),

        supabaseClient
            .from("groups")
            .select("*")
            .order("class_code")
            .order("subject")
            .order("theme")
            .order("group_letter"),

        supabaseClient
            .from("group_members")
            .select("*")
            .eq("active", true)
    ]);

    if (opcoesResp.error) {
        div.innerHTML = `<p class="error">${opcoesResp.error.message}</p>`;
        opcoesAdminCache = [];
        gruposAdminCache = [];
        membrosAdminCache = [];
        return;
    }

    if (gruposResp.error) {
        div.innerHTML = `<p class="error">${gruposResp.error.message}</p>`;
        opcoesAdminCache = [];
        gruposAdminCache = [];
        membrosAdminCache = [];
        return;
    }

    if (membrosResp.error) {
        div.innerHTML = `<p class="error">${membrosResp.error.message}</p>`;
        opcoesAdminCache = [];
        gruposAdminCache = [];
        membrosAdminCache = [];
        return;
    }

    opcoesAdminCache = opcoesResp.data || [];
    gruposAdminCache = gruposResp.data || [];
    membrosAdminCache = membrosResp.data || [];

    renderizarGruposAdmin();
}

function renderizarGruposAdmin() {
    const div = document.getElementById("lista-grupos-admin");
    const filtroTurma = document.getElementById("filtro-turma-admin")?.value || "";

    let opcoesFiltradas = opcoesAdminCache;

    if (filtroTurma) {
        opcoesFiltradas = opcoesAdminCache.filter(opcao => opcao.class_code === filtroTurma);
    }

    const gruposOrfaos = gruposAdminCache.filter(grupo => {
        const temOpcaoCorrespondente = opcoesAdminCache.some(opcao =>
            grupo.option_id === opcao.id ||
            (
                grupo.class_code === opcao.class_code &&
                grupo.subject === opcao.subject &&
                grupo.theme === opcao.theme &&
                grupo.group_letter === opcao.group_letter
            )
        );

        if (filtroTurma && grupo.class_code !== filtroTurma) {
            return false;
        }

        return !temOpcaoCorrespondente;
    });

    if ((!opcoesFiltradas || opcoesFiltradas.length === 0) && gruposOrfaos.length === 0) {
        div.innerHTML = `<p>Nenhuma configuração de grupo encontrada para o filtro selecionado.</p>`;
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
                    <th>Configuração ativa</th>
                    <th>Grupo real</th>
                    <th>Membros</th>
                    <th>Criado em</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
    `;

    opcoesFiltradas.forEach(opcao => {
        const grupoReal = gruposAdminCache.find(g =>
            g.option_id === opcao.id ||
            (
                g.class_code === opcao.class_code &&
                g.subject === opcao.subject &&
                g.theme === opcao.theme &&
                g.group_letter === opcao.group_letter
            )
        ) || null;

        const qtdMembros = grupoReal
            ? membrosAdminCache.filter(m => m.group_id === grupoReal.id && m.active).length
            : 0;

        const statusGrupo = !grupoReal
            ? `Ainda não criado`
            : grupoReal.active
                ? `Criado`
                : `Inativo`;

        const criadoEm = grupoReal
            ? new Date(grupoReal.created_at).toLocaleString("pt-BR")
            : "-";

        const acoes = !grupoReal
            ? `Sem grupo criado`
            : grupoReal.active
                ? `<button class="danger" onclick="desativarGrupoAdmin('${grupoReal.id}', '${escapeHtml(grupoReal.name)}')">Excluir/desativar</button>`
                : `Grupo inativo`;

        html += `
            <tr>
                <td>${opcao.class_code}</td>
                <td>${opcao.subject}</td>
                <td>${opcao.theme}</td>
                <td>${opcao.group_letter}</td>
                <td>${opcao.max_members}</td>
                <td>${opcao.active ? "Sim" : "Não"}</td>
                <td>${statusGrupo}</td>
                <td>${qtdMembros}/${opcao.max_members}</td>
                <td>${criadoEm}</td>
                <td>${acoes}</td>
            </tr>
        `;
    });

    gruposOrfaos.forEach(grupo => {
        const qtdMembros = membrosAdminCache.filter(m => m.group_id === grupo.id && m.active).length;

        html += `
            <tr>
                <td>${grupo.class_code}</td>
                <td>${grupo.subject}</td>
                <td>${grupo.theme}</td>
                <td>${grupo.group_letter}</td>
                <td>${grupo.max_members}</td>
                <td>Sem configuração</td>
                <td>${grupo.active ? "Criado" : "Inativo"}</td>
                <td>${qtdMembros}/${grupo.max_members}</td>
                <td>${new Date(grupo.created_at).toLocaleString("pt-BR")}</td>
                <td>
                    ${
                        grupo.active
                            ? `<button class="danger" onclick="desativarGrupoAdmin('${grupo.id}', '${escapeHtml(grupo.name)}')">Excluir/desativar</button>`
                            : `Grupo inativo`
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
        .select("*")
        .eq("status", "pendente")
        .order("created_at", { ascending: true });

    if (error) {
        div.innerHTML = `<p class="error">${error.message}</p>`;
        pedidosAdminCache = [];
        return;
    }

    pedidosAdminCache = data || [];
    renderizarPedidosAdmin();
}

function renderizarPedidosAdmin() {
    const div = document.getElementById("lista-pedidos-admin");
    const filtroTurma = document.getElementById("filtro-turma-admin")?.value || "";

    let pedidosFiltrados = pedidosAdminCache.map(pedido => {
        const grupo = gruposAdminCache.find(g => g.id === pedido.group_id) || null;
        const aluno = perfisAdminCache.find(p => p.id === pedido.requester_id) || null;

        return {
            ...pedido,
            grupo,
            aluno
        };
    });

    if (filtroTurma) {
        pedidosFiltrados = pedidosFiltrados.filter(item => {
            const turmaDoGrupo = item.grupo?.class_code || "";
            const turmaDoAluno = item.aluno?.class_code || "";
            return turmaDoGrupo === filtroTurma || turmaDoAluno === filtroTurma;
        });
    }

    if (!pedidosFiltrados || pedidosFiltrados.length === 0) {
        div.innerHTML = `<p>Nenhum pedido de entrada pendente para o filtro selecionado.</p>`;
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

    pedidosFiltrados.forEach(item => {
        const aluno = item.aluno;
        const grupo = item.grupo;

        const nomeAluno = aluno
            ? `${aluno.call_number} - ${aluno.first_name} ${aluno.last_name}`
            : "Aluno não encontrado";

        const nomeGrupo = grupo
            ? grupo.name
            : "Grupo não encontrado";

        const turma = aluno?.class_code || grupo?.class_code || "";

        html += `
            <tr>
                <td>${new Date(item.created_at).toLocaleString("pt-BR")}</td>
                <td>${nomeAluno}</td>
                <td>${turma}</td>
                <td>${nomeGrupo}</td>
                <td>
                    <button class="success" onclick="aprovarPedidoEntradaAdmin('${item.id}', '${escapeHtml(nomeAluno)}', '${escapeHtml(nomeGrupo)}')">
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
    const motivo = prompt(`Informe o motivo para excluir/desativar o grupo:\n\n${groupName}`);

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
    const motivo = prompt(`Informe o motivo para aceitar este aluno pelo admin:\n\nAluno: ${nomeAluno}\nGrupo: ${nomeGrupo}`);

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

async function baixarPlanilhaGrupos() {
    const [membrosResp, gruposResp, perfisResp] = await Promise.all([
        supabaseClient
            .from("group_members")
            .select("group_id, user_id, active")
            .eq("active", true),

        supabaseClient
            .from("groups")
            .select("id, class_code, subject, theme, group_letter, name, active"),

        supabaseClient
            .from("profiles")
            .select("id, first_name, last_name, call_number, class_code, status")
    ]);

    if (membrosResp.error) {
        alert("Erro ao carregar membros: " + membrosResp.error.message);
        return;
    }

    if (gruposResp.error) {
        alert("Erro ao carregar grupos: " + gruposResp.error.message);
        return;
    }

    if (perfisResp.error) {
        alert("Erro ao carregar perfis: " + perfisResp.error.message);
        return;
    }

    const membros = membrosResp.data || [];
    const grupos = gruposResp.data || [];
    const perfis = perfisResp.data || [];

    const linhas = membros
        .map(membro => {
            const grupo = grupos.find(g => g.id === membro.group_id && g.active);
            const perfil = perfis.find(p => p.id === membro.user_id);

            if (!grupo || !perfil) {
                return null;
            }

            return {
                turma: grupo.class_code || perfil.class_code || "",
                numero: perfil.call_number ?? "",
                nome: perfil.first_name || "",
                sobrenome: perfil.last_name || "",
                disciplina: grupo.subject || "",
                tema: grupo.theme || "",
                grupo: grupo.group_letter || ""
            };
        })
        .filter(Boolean)
        .sort((a, b) => {
            if (a.turma !== b.turma) return a.turma.localeCompare(b.turma);
            if ((a.numero ?? 0) !== (b.numero ?? 0)) return (a.numero ?? 0) - (b.numero ?? 0);
            if (a.disciplina !== b.disciplina) return a.disciplina.localeCompare(b.disciplina);
            if (a.tema !== b.tema) return a.tema.localeCompare(b.tema);
            return a.grupo.localeCompare(b.grupo);
        });

    if (linhas.length === 0) {
        alert("Nenhum dado encontrado para exportar.");
        return;
    }

    const cabecalho = ["Turma", "Numero", "Nome", "Sobrenome", "Disciplina", "Tema", "Grupo"];

    const csv = [
        cabecalho.join(";"),
        ...linhas.map(linha => [
            escaparCsv(linha.turma),
            escaparCsv(linha.numero),
            escaparCsv(linha.nome),
            escaparCsv(linha.sobrenome),
            escaparCsv(linha.disciplina),
            escaparCsv(linha.tema),
            escaparCsv(linha.grupo)
        ].join(";"))
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const hoje = new Date();
    const yyyy = hoje.getFullYear();
    const mm = String(hoje.getMonth() + 1).padStart(2, "0");
    const dd = String(hoje.getDate()).padStart(2, "0");

    const a = document.createElement("a");
    a.href = url;
    a.download = `grupos_todas_as_turmas_${yyyy}-${mm}-${dd}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

function escaparCsv(valor) {
    const texto = String(valor ?? "");
    return `"${texto.replaceAll('"', '""')}"`;
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