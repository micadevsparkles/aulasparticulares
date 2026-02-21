// NOME DO ARQUIVO: script.js

// 🔴 COLOQUE A URL DO SEU GOOGLE APPS SCRIPT AQUI 🔴
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz-IX29AanoGWD4zXHcVT2Vt7t1SJjz9dNafJzi57qzSDQreHascJlKpPt_Jn4-xzZhjw/exec"; 

let appData = {
    alunos: [],
    planejamento: [],
    financeiro: []
};

// ==========================================
// INICIALIZAÇÃO E GESTÃO DE UI
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    setGreeting();
    setupNavigation();
    setupModals();
    setupSearch();
    fetchData(); // Carrega os dados da planilha
});

function setGreeting() {
    const hour = new Date().getHours();
    let greetingText = "Boa noite";
    if (hour >= 5 && hour < 12) greetingText = "Bom dia";
    else if (hour >= 12 && hour < 18) greetingText = "Boa tarde";
    document.getElementById("greeting").innerText = `${greetingText}, Micael.`;
}

function setupNavigation() {
    const menuToggle = document.getElementById("menu-toggle");
    const sidebar = document.getElementById("sidebar");
    const navLinks = document.querySelectorAll(".nav-links li");
    const views = document.querySelectorAll(".view");

    menuToggle.addEventListener("click", () => sidebar.classList.toggle("open"));

    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            // Mobile close sidebar
            if(window.innerWidth < 768) sidebar.classList.remove("open");
            
            navLinks.forEach(l => l.classList.remove("active"));
            e.target.classList.add("active");

            const targetView = e.target.getAttribute("data-target");
            views.forEach(v => {
                v.classList.remove("active");
                v.classList.add("hidden");
            });
            document.getElementById(targetView).classList.remove("hidden");
            document.getElementById(targetView).classList.add("active");

            renderCurrentView(targetView);
        });
    });
}

function showLoader(show) {
    const loader = document.getElementById("loader");
    if (show) loader.classList.remove("hidden");
    else loader.classList.add("hidden");
}

// ==========================================
// COMUNICAÇÃO COM O BACKEND (API)
// ==========================================
async function apiRequest(action, data = {}, rowIndex = null) {
    showLoader(true);
    try {
        const payload = { action, data, rowIndex };
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if(result.success) {
            return result.data;
        } else {
            alert("Erro ao processar: " + result.error);
            return null;
        }
    } catch (e) {
        alert("Erro de conexão. Verifique a URL do script e sua internet.");
        return null;
    } finally {
        showLoader(false);
    }
}

async function fetchData() {
    const data = await apiRequest("getData");
    if (data) {
        appData.alunos = data.alunos;
        appData.planejamento = data.planejamento.reverse(); // Mais recente para mais antiga visualmente
        appData.financeiro = data.financeiro;
        renderCurrentView("home-view");
        populateAlunoSelect();
    }
}

// ==========================================
// RENDERIZAÇÃO DAS TELAS
// ==========================================
function renderCurrentView(viewId) {
    if (viewId === "home-view") renderHome();
    if (viewId === "alunos-view") renderAlunos(appData.alunos);
    if (viewId === "planejamento-view") renderPlanejamento(appData.planejamento);
    if (viewId === "financas-view") renderFinancas();
}

function renderHome() {
    const nextList = document.getElementById("next-7-days");
    const lastList = document.getElementById("last-7-days");
    
    // Filtro simplificado de datas usando strings (Conforme solicitado)
    // Para um funcionamento perfeito, o ideal é que a data venha em YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Calculando limites de forma simples
    let nextDate = new Date(); nextDate.setDate(nextDate.getDate() + 7);
    let lastDate = new Date(); lastDate.setDate(lastDate.getDate() - 7);
    const nextLimit = nextDate.toISOString().split('T')[0];
    const lastLimit = lastDate.toISOString().split('T')[0];

    const nextClasses = appData.planejamento.filter(p => p.data >= todayStr && p.data <= nextLimit);
    const lastClasses = appData.planejamento.filter(p => p.data < todayStr && p.data >= lastLimit);

    const formatClass = (p) => `<li>${p.aluno} - ${p.data} - ${p.hora} - ${p.tipo} - ${p.materia} - ${p.conteudo} - <strong>${p.status}</strong></li>`;

    nextList.innerHTML = nextClasses.length ? nextClasses.map(formatClass).join("") : "<li>Nenhuma aula agendada para os próximos 7 dias.</li>";
    lastList.innerHTML = lastClasses.length ? lastClasses.map(formatClass).join("") : "<li>Nenhuma aula nos últimos 7 dias.</li>";
}

function renderAlunos(alunosData) {
    const list = document.getElementById("alunos-list");
    list.innerHTML = "";
    alunosData.forEach(aluno => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${aluno.nome}</strong><br>
                        <small>Resp: ${aluno.responsavel} | WhatsApp: ${aluno.whatsapp_responsavel}</small><br>
                        <small>Dias: ${aluno.dias} | Hora: ${aluno.hora} | Duração: ${aluno.duracao}h | Tipo: ${aluno.tipo}</small>`;
        li.addEventListener("click", () => openModalAluno(aluno));
        list.appendChild(li);
    });
}

function renderPlanejamento(planData) {
    const list = document.getElementById("planejamento-list");
    list.innerHTML = "";
    planData.forEach(p => {
        const li = document.createElement("li");
        li.innerHTML = `${p.aluno} - ${p.data} - ${p.hora} - ${p.tipo} - ${p.materia} - ${p.conteudo} - <strong>${p.status}</strong>`;
        li.addEventListener("click", () => openModalPlanejamento(p));
        list.appendChild(li);
    });
}

function renderFinancas() {
    const list = document.getElementById("financas-list");
    let totalGeral = 0;
    list.innerHTML = "";

    // Para cada aluno na base, calcular dinamicamente o financeiro
    appData.alunos.forEach(aluno => {
        // Encontrar valor de hora-aula no financeiro
        let finData = appData.financeiro.find(f => f.aluno === aluno.nome);
        let horaAula = finData ? parseFloat(finData.hora_aula) : 0;
        
        // Aulas concluídas
        let aulasConcluidas = appData.planejamento.filter(p => p.aluno === aluno.nome && p.status === "Concluída").length;
        let duracao = parseFloat(aluno.duracao) || 1;
        
        let valorPendente = (horaAula * duracao) * aulasConcluidas;
        totalGeral += valorPendente;

        const li = document.createElement("li");
        li.innerHTML = `<strong>${aluno.nome}</strong><br>
                        <small>Aulas Concluídas: ${aulasConcluidas}</small> | 
                        <small>Hora-aula acordada: R$ <input type="number" value="${horaAula}" style="width:70px" onchange="updateHoraAula('${aluno.nome}', this.value, ${finData ? finData.rowIndex : 'null'})"></small><br>
                        <strong style="color:var(--success)">Pendente: R$ ${valorPendente.toFixed(2)}</strong>`;
        list.appendChild(li);
    });

    document.getElementById("total-pendente-geral").innerText = `R$ ${totalGeral.toFixed(2)}`;
}

// Função invocada diretamente pelo HTML na tela de Finanças
async function updateHoraAula(alunoNome, novoValor, rowIndex) {
    const data = { aluno: alunoNome, hora_aula: novoValor };
    let result;
    if(rowIndex) {
        result = await apiRequest("updateFinanceiro", data, rowIndex);
    } else {
        result = await apiRequest("addFinanceiro", data);
    }
    if(result) {
        appData.financeiro = result;
        renderFinancas();
    }
}

// ==========================================
// FORMULÁRIOS E MODAIS (CRUD)
// ==========================================
function setupModals() {
    const modalAluno = document.getElementById("modal-aluno");
    const modalPlan = document.getElementById("modal-planejamento");
    
    document.getElementById("add-aluno-btn").addEventListener("click", () => openModalAluno(null));
    document.getElementById("add-planejamento-btn").addEventListener("click", () => openModalPlanejamento(null));
    
    document.querySelectorAll(".close-modal").forEach(btn => {
        btn.addEventListener("click", (e) => e.target.closest(".modal").classList.remove("active"));
    });

    document.getElementById("form-aluno").addEventListener("submit", async (e) => {
        e.preventDefault();
        const rowIdx = document.getElementById("aluno-rowIndex").value;
        const data = {
            nome: document.getElementById("aluno-nome").value,
            endereco: document.getElementById("aluno-endereco").value,
            cidade: document.getElementById("aluno-cidade").value,
            bairro: document.getElementById("aluno-bairro").value,
            responsavel: document.getElementById("aluno-responsavel").value,
            whatsapp_responsavel: document.getElementById("aluno-whatsapp").value,
            tipo: document.getElementById("aluno-tipo").value,
            dias: document.getElementById("aluno-dias").value,
            hora: document.getElementById("aluno-hora").value,
            duracao: document.getElementById("aluno-duracao").value
        };
        const action = rowIdx ? "editAluno" : "addAluno";
        const res = await apiRequest(action, data, rowIdx);
        if(res) { appData.alunos = res; modalAluno.classList.remove("active"); renderAlunos(appData.alunos); populateAlunoSelect(); }
    });

    document.getElementById("btn-delete-aluno").addEventListener("click", async () => {
        const rowIdx = document.getElementById("aluno-rowIndex").value;
        if(confirm("Tem certeza que deseja excluir?")) {
            const res = await apiRequest("deleteAluno", null, rowIdx);
            if(res) { appData.alunos = res; modalAluno.classList.remove("active"); renderAlunos(appData.alunos); populateAlunoSelect(); }
        }
    });

    document.getElementById("form-planejamento").addEventListener("submit", async (e) => {
        e.preventDefault();
        const rowIdx = document.getElementById("plan-rowIndex").value;
        const data = {
            aluno: document.getElementById("plan-aluno").value,
            data: document.getElementById("plan-data").value,
            hora: document.getElementById("plan-hora").value,
            tipo: document.getElementById("plan-tipo").value,
            materia: document.getElementById("plan-materia").value,
            conteudo: document.getElementById("plan-conteudo").value,
            status: document.getElementById("plan-status").value
        };
        const action = rowIdx ? "editPlanejamento" : "addPlanejamento";
        const res = await apiRequest(action, data, rowIdx);
        if(res) { appData.planejamento = res.reverse(); modalPlan.classList.remove("active"); renderPlanejamento(appData.planejamento); renderHome(); }
    });

    document.getElementById("btn-delete-plan").addEventListener("click", async () => {
        const rowIdx = document.getElementById("plan-rowIndex").value;
        if(confirm("Tem certeza que deseja excluir esta aula?")) {
            const res = await apiRequest("deletePlanejamento", null, rowIdx);
            if(res) { appData.planejamento = res.reverse(); modalPlan.classList.remove("active"); renderPlanejamento(appData.planejamento); renderHome(); }
        }
    });
}

function openModalAluno(aluno) {
    document.getElementById("modal-aluno-title").innerText = aluno ? "Editar Aluno" : "Adicionar Aluno";
    document.getElementById("btn-delete-aluno").classList.toggle("hidden", !aluno);
    
    document.getElementById("aluno-rowIndex").value = aluno ? aluno.rowIndex : "";
    document.getElementById("aluno-nome").value = aluno ? aluno.nome : "";
    document.getElementById("aluno-endereco").value = aluno ? aluno.endereco : "";
    document.getElementById("aluno-cidade").value = aluno ? aluno.cidade : "";
    document.getElementById("aluno-bairro").value = aluno ? aluno.bairro : "";
    document.getElementById("aluno-responsavel").value = aluno ? aluno.responsavel : "";
    document.getElementById("aluno-whatsapp").value = aluno ? aluno.whatsapp_responsavel : "";
    document.getElementById("aluno-tipo").value = aluno ? aluno.tipo : "Reforço";
    document.getElementById("aluno-dias").value = aluno ? aluno.dias : "";
    document.getElementById("aluno-hora").value = aluno ? aluno.hora : "";
    document.getElementById("aluno-duracao").value = aluno ? aluno.duracao : "";
    
    document.getElementById("modal-aluno").classList.add("active");
}

function openModalPlanejamento(plan) {
    document.getElementById("modal-planejamento-title").innerText = plan ? "Editar Aula" : "Adicionar Aula";
    document.getElementById("btn-delete-plan").classList.toggle("hidden", !plan);
    
    document.getElementById("plan-rowIndex").value = plan ? plan.rowIndex : "";
    document.getElementById("plan-aluno").value = plan ? plan.aluno : (appData.alunos[0] ? appData.alunos[0].nome : "");
    document.getElementById("plan-data").value = plan ? plan.data : "";
    document.getElementById("plan-hora").value = plan ? plan.hora : "";
    document.getElementById("plan-tipo").value = plan ? plan.tipo : "Reforço";
    document.getElementById("plan-materia").value = plan ? plan.materia : "Português";
    document.getElementById("plan-conteudo").value = plan ? plan.conteudo : "";
    document.getElementById("plan-status").value = plan ? plan.status : "Pendente";
    
    document.getElementById("modal-planejamento").classList.add("active");
}

function populateAlunoSelect() {
    const select = document.getElementById("plan-aluno");
    select.innerHTML = "";
    appData.alunos.forEach(a => {
        const opt = document.createElement("option");
        opt.value = a.nome;
        opt.innerText = a.nome;
        select.appendChild(opt);
    });
}

// ==========================================
// BUSCA (SEARCH BARS)
// ==========================================
function setupSearch() {
    document.getElementById("search-alunos").addEventListener("input", (e) => {
        const termo = e.target.value.toLowerCase();
        const filtrados = appData.alunos.filter(a => a.nome.toLowerCase().includes(termo) || a.responsavel.toLowerCase().includes(termo));
        renderAlunos(filtrados);
    });

    document.getElementById("search-planejamento").addEventListener("input", (e) => {
        const termo = e.target.value.toLowerCase();
        const filtrados = appData.planejamento.filter(p => 
            p.aluno.toLowerCase().includes(termo) || 
            p.materia.toLowerCase().includes(termo) ||
            p.conteudo.toLowerCase().includes(termo)
        );
        renderPlanejamento(filtrados);
    });
}
