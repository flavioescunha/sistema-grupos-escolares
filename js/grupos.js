let alunoAtual = null;
let gruposCache = [];
let membrosCache = [];
let perfisCache = [];
let pedidosCache = [];
let votosCache = [];
let opcoesCache = [];
let removeRequestsCache = [];

async function carregarPaginaAluno() {
    await requireLogin();

    alunoAtual = await getCurrentProfile();

    if (!alunoAtual) {
        alert("Perfil não encontrado.");
        window.location.href = "login.html";
        return;
    }

    if (alunoAtual.status !== "aprovado") {
        alert("Seu cadastro ainda não foi aprovado.");
        await logout();
        return;
    }

    document.getElementById("dados-aluno").textContent =
        `${alunoAtual.first_name} ${alunoAtual.last_name} - ${alunoAtual.class_code} - chamada ${alunoAtual.call_number}`;

    if (alunoAtual.is_admin) {
        document.getElementById("link-admin").style.display = "inline";
    }

    await carregarDados();
}

async function carregarDados() {
    await carregarOpcoesAluno();
    await carregarGrupos();
    await carregarMembros();
    await carregarPerfis();
    await carregarPedidos();
    await carregarVotos();
    await carregarRemoveRequests();

    renderizarOpcoes();
    renderizarResumo();
    renderizarGrupos();
}

async function carregarOpcoesAluno() {
    const { data, error } = await supabaseClient
        .from("group_options")
        .select("*")
        .eq("active", true)
        .eq("class_code", alunoAtual.class_code)
        .order("subject")
        .order("theme")
        .order("group_letter");

    if (error) {
        mostrarErro("msg-geral", error.message);
        return;
    }

    opcoesCache = data || [];
}

async function carregarGrupos() {
    const { data, error } = await supabaseClient
        .from("groups")
        .select("*")
        .eq("active", true)
        .eq("class_code", alunoAtual.class_code)
        .order("name");

    if (error) {
        mostrarErro("msg-geral", error.message);
        return;
    }

    gruposCache = data || [];
}

async function carregarMembros() {
    const { data, error } = await supabaseClient
        .from("group_members")
        .select("*")
        .eq("active", true)
        .eq("class_code", alunoAtual.class_code);

    if (error) {
        mostrarErro("msg-geral", error.message);
        return;
    }

    membrosCache = data || [];
}

async function carregarPerfis() {
    const { data, error } = await supabaseClient
        .from("profiles")
        .select("id, first_name, last_name, call_number, class_code, status")
        .eq("status", "aprovado")
        .eq("class_code", alunoAtual.class_code)
        .order("call_number");

    if (error) {
        mostrarErro("msg-geral", error.message);
        return;
    }

    perfisCache = data || [];
}

async function carregarPedidos() {
    const { data, error } = await supabaseClient
        .from("join_requests")
        .select("*")
        .eq("status", "pendente")
        .order("created_at");

    if (error) {
        mostrarErro("msg-geral", error.message);
        return;
    }

    pedidosCache = data || [];
}

async function carregarVotos() {
    const { data, error } = await supabaseClient
        .from("join_votes")
        .select("*");

    if (error) {
        mostrarErro("msg-geral", error.message);
        return;
    }

    votosCache = data || [];
}

async function carregarRemoveRequests() {
    const { data, error } = await supabaseClient
        .from("remove_requests")
        .select("*")
        .eq("status", "pendente");

    if (error) {
        removeRequestsCache = [];
        return;
    }

    removeRequestsCache = data || [];
}

function renderizarOpcoes() {
    const select = document.getElementById("select-option");

    const opcoesDaTurma = opcoesCache.filter(
        op => op.class_code === alunoAtual.class_code
    );

    if (opcoesDaTurma.length === 0) {
        select.innerHTML = `<option value="">Nenhuma opção liberada para sua turma</option>`;
        return;
    }

    select.innerHTML = opcoesDaTurma.map(op => {
        const nome = `${op.class_code} ${op.subject} ${op.theme} ${op.group_letter} - máx. ${op.max_members}`;
        return `<option value="${op.id}">${nome}</option>`;
    }).join("");
}

function renderizarResumo() {
    const div = document.getElementById("resumo-aluno");

    const meusMembros = membrosCache.filter(m => m.user_id === alunoAtual.id);
    const meusGrupos = gruposCache.filter(g => meusMembros.some(m => m.group_id === g.id));

    if (meusGrupos.length === 0) {
        div.innerHTML = `<p>Você ainda não participa de nenhum grupo.</p>`;
        return;
    }

    div.innerHTML = meusGrupos.map(g => `
        <p>
            <span class="badge green">${g.name}</span>
        </p>
    `).join("");
}

function renderizarGrupos() {
    const div = document.getElementById("lista-grupos");

    const gruposDaTurma = gruposCache.filter(
        grupo => grupo.class_code === alunoAtual.class_code
    );

    if (gruposDaTurma.length === 0) {
        div.innerHTML = `<p>Nenhum grupo criado ainda.</p>`;
        return;
    }

    let html = "";

    gruposDaTurma.forEach(grupo => {
        const membrosGrupo = membrosCache.filter(m => m.group_id === grupo.id);
        const souMembro = membrosGrupo.some(m => m.user_id === alunoAtual.id);
        const lotado = membrosGrupo.length >= grupo.max_members;
        const pedidosGrupo = pedidosCache.filter(p => p.group_id === grupo.id);

        const membrosHtml = membrosGrupo.map(m => {
            const p = perfisCache.find(x => x.id === m.user_id);
            if (!p) return `<span class="badge">Aluno</span>`;
            return `<span class="badge blue">${p.call_number} - ${p.first_name} ${p.last_name}</span>`;
        }).join("");

        html += `
            <div class="group-card ${souMembro ? "mine" : ""}">
                <h3>${grupo.name}</h3>
                <p class="small">
                    ${membrosGrupo.length}/${grupo.max_members} membros
                </p>

                <p>${membrosHtml}</p>
        `;

        if (souMembro) {
            html += `
                <p><span class="badge green">Você participa deste grupo</span></p>
                <button class="secondary" onclick="sairGrupo('${grupo.id}')">Sair do grupo</button>
            `;

            html += renderizarPedidosDoGrupo(grupo, pedidosGrupo);
            html += renderizarExclusaoDoGrupo(grupo, membrosGrupo);
        } else {
            const jaPediu = pedidosGrupo.some(p => p.requester_id === alunoAtual.id);

            if (lotado) {
                html += `<p><span class="badge red">Grupo lotado</span></p>`;
            } else if (jaPediu) {
                html += `<p><span class="badge yellow">Pedido enviado</span></p>`;
            } else {
                html += `<button onclick="pedirEntrada('${grupo.id}')">Pedir entrada</button>`;
            }
        }

        html += `</div>`;
    });

    div.innerHTML = html;
}

function renderizarPedidosDoGrupo(grupo, pedidosGrupo) {
    if (pedidosGrupo.length === 0) {
        return "";
    }

    let html = `<div><h4>Pedidos de entrada</h4>`;

    pedidosGrupo.forEach(pedido => {
        const solicitante = perfisCache.find(p => p.id === pedido.requester_id);
        const votosSim = votosCache.filter(v => v.request_id === pedido.id && v.vote === true).length;
        const totalMembros = membrosCache.filter(m => m.group_id === grupo.id).length;
        const necessario = Math.floor(totalMembros / 2) + 1;

        html += `
            <div class="card">
                <p>
                    <strong>${solicitante ? solicitante.first_name + " " + solicitante.last_name : "Aluno"}</strong>
                    pediu entrada.
                </p>
                <p class="small">Votos sim: ${votosSim}/${necessario}</p>
                <button class="success" onclick="votarEntrada('${pedido.id}', true)">Aceitar</button>
                <button class="danger" onclick="votarEntrada('${pedido.id}', false)">Recusar</button>
            </div>
        `;
    });

    html += `</div>`;
    return html;
}

function renderizarExclusaoDoGrupo(grupo, membrosGrupo) {
    const outrosMembros = membrosGrupo.filter(m => m.user_id !== alunoAtual.id);

    if (outrosMembros.length === 0) {
        return "";
    }

    let html = `
        <div class="card">
            <h4>Solicitar exclusão de membro</h4>

            <label for="target-${grupo.id}">Membro</label>
            <select id="target-${grupo.id}">
    `;

    outrosMembros.forEach(m => {
        const p = perfisCache.find(x => x.id === m.user_id);
        if (p) {
            html += `<option value="${p.id}">${p.call_number} - ${p.first_name} ${p.last_name}</option>`;
        }
    });

    html += `
            </select>

            <label for="reason-${grupo.id}">Motivo</label>
            <textarea id="reason-${grupo.id}" placeholder="Informe o motivo. Apenas o administrador verá no histórico."></textarea>

            <button class="danger" onclick="criarPedidoExclusao('${grupo.id}')">Solicitar exclusão</button>
        </div>
    `;

    const pedidosExclusao = removeRequestsCache.filter(r => r.group_id === grupo.id);

    if (pedidosExclusao.length > 0) {
        html += `<div><h4>Pedidos de exclusão pendentes</h4>`;

        pedidosExclusao.forEach(req => {
            const alvo = perfisCache.find(p => p.id === req.target_user_id);

            html += `
                <div class="card">
                    <p>
                        Exclusão pendente de:
                        <strong>${alvo ? alvo.first_name + " " + alvo.last_name : "Aluno"}</strong>
                    </p>

                    <label for="vote-reason-${req.id}">Seu motivo</label>
                    <textarea id="vote-reason-${req.id}" placeholder="Informe seu motivo para votar na exclusão"></textarea>

                    <button class="danger" onclick="votarExclusao('${req.id}')">Votar pela exclusão</button>
                </div>
            `;
        });

        html += `</div>`;
    }

    return html;
}

async function criarGrupo() {
    const msg = document.getElementById("msg-criar");
    const optionId = document.getElementById("select-option").value;

    if (!optionId) {
        mostrarErro("msg-criar", "Selecione uma opção.");
        return;
    }

    msg.innerHTML = "Criando grupo...";

    const { data, error } = await supabaseClient.rpc("create_group_secure", {
        p_option_id: optionId
    });

    if (error) {
        mostrarErro("msg-criar", error.message);
        return;
    }

    msg.innerHTML = `<p class="success-text">Grupo criado com sucesso.</p>`;
    await carregarDados();
}

async function pedirEntrada(groupId) {
    const { data, error } = await supabaseClient.rpc("request_join_group", {
        p_group_id: groupId
    });

    if (error) {
        alert("Erro: " + error.message);
        return;
    }

    await carregarDados();
}

async function votarEntrada(requestId, vote) {
    const { data, error } = await supabaseClient.rpc("vote_join_request", {
        p_request_id: requestId,
        p_vote: vote
    });

    if (error) {
        alert("Erro: " + error.message);
        return;
    }

    alert("Resultado: " + data);
    await carregarDados();
}

async function sairGrupo(groupId) {
    if (!confirm("Tem certeza de que deseja sair deste grupo?")) {
        return;
    }

    const { data, error } = await supabaseClient.rpc("leave_group", {
        p_group_id: groupId
    });

    if (error) {
        alert("Erro: " + error.message);
        return;
    }

    alert("Você saiu do grupo.");
    await carregarDados();
}

async function criarPedidoExclusao(groupId) {
    const targetId = document.getElementById(`target-${groupId}`).value;
    const reason = document.getElementById(`reason-${groupId}`).value.trim();

    if (!targetId || reason.length < 3) {
        alert("Escolha o membro e informe um motivo.");
        return;
    }

    const { data, error } = await supabaseClient.rpc("create_remove_request", {
        p_group_id: groupId,
        p_target_user_id: targetId,
        p_reason: reason
    });

    if (error) {
        alert("Erro: " + error.message);
        return;
    }

    alert("Pedido de exclusão criado.");
    await carregarDados();
}

async function votarExclusao(removeRequestId) {
    const reason = document.getElementById(`vote-reason-${removeRequestId}`).value.trim();

    if (reason.length < 3) {
        alert("Informe um motivo.");
        return;
    }

    const { data, error } = await supabaseClient.rpc("vote_remove_request", {
        p_remove_request_id: removeRequestId,
        p_reason: reason
    });

    if (error) {
        alert("Erro: " + error.message);
        return;
    }

    alert("Resultado: " + data);
    await carregarDados();
}

function mostrarErro(id, mensagem) {
    const el = document.getElementById(id);
    el.innerHTML = `<p class="error">${mensagem}</p>`;
}