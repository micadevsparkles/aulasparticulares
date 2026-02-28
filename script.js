// NOME DO ARQUIVO: script.js
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz-IX29AanoGWD4zXHcVT2Vt7t1SJjz9dNafJzi57qzSDQreHascJlKpPt_Jn4-xzZhjw/exec"; 

let appData = { alunos: [], planejamento: [], financeiro: [] };

document.addEventListener("DOMContentLoaded", () => {
    setGreeting();
    setupNavigation();
    setupModals();
    setupSearch();
    fetchData();
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
            if(window.innerWidth < 768) sidebar.classList.remove("open");
            navLinks.forEach(l => l.classList.remove("active"));
            e.target.classList.add("active");
            const targetView = e.target.getAttribute("data-target").replace('-view', '');
            showView(targetView);
        });
    });
}

function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const target = document.getElementById(`${viewName}-view`);
    if(target) target.classList.remove('hidden');
    renderCurrentView(`${viewName}-view`);
}

async function apiRequest(action, data = {}, rowIndex = null) {
    document.getElementById("loader").classList.remove("hidden");
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action, data, rowIndex })
        });
        const result = await response.json();
        return result.success ? result.data : null;
    } catch (e) {
        return null;
    } finally {
        document.getElementById("loader").classList.add("hidden");
    }
}

async function fetchData() {
    const data = await apiRequest("getData");
    if (data) {
        appData.alunos = data.alunos;
        appData.planejamento = data.planejamento.reverse();
        appData.financeiro = data.financeiro;
        renderCurrentView("home-view");
        populateAlunoSelect();
    }
}

// RENDERIZAÇÃO COM CAIXINHAS E TRUNCATE
function formatAulaCard(p, showAdiar = false) {
    // Conteúdo com reticências (limite de 60 caracteres)
    const resumoConteudo = p.conteudo.length > 60 ? p.conteudo.substring(0, 60) + "..." : p.conteudo;
    
    return `
        <div class="aula-card" onclick="openModalPlanejamentoById('${p.rowIndex}')">
            <span class="badge badge-name">${p.aluno}</span>
            <span class="badge badge-date">${p.data} às ${p.hora}</span>
            <span class="badge">${p.materia}</span>
            <span class="badge badge-status">${p.status}</span>
            ${showAdiar ? `<button class="btn-adiar" onclick="event.stopPropagation(); adiarAula('${p.rowIndex}')">Adiar</button>` : ''}
            <div class="content-preview">${resumoConteudo || 'Sem conteúdo cadastrado.'}</div>
        </div>
    `;
}

function renderHome() {
    const nextList = document.getElementById("next-7-days");
    const lastList = document.getElementById("last-7-days");
    
    // Como os dados são texto simples, pegamos os últimos/próximos da lista
    const nextClasses = appData.planejamento.slice(0, 5); 
    const lastClasses = appData.planejamento.slice(5, 10);

    nextList.innerHTML = nextClasses.map(p => formatAulaCard(p, true)).join("");
    lastList.innerHTML = lastClasses.map(p => formatAulaCard(p, false)).join("");
}

function renderAlunos(alunosData) {
    const list = document.getElementById("alunos-list");
    list.innerHTML = alunosData.map(al => `
        <div class="aluno-card" onclick="openModalAlunoById('${al.rowIndex}')">
            <div class="child-icon">👶</div>
            <div class="aluno-info">
                <strong>${al.nome}</strong><br>
                <small>${al.tipo} | ${al.dias} às ${al.hora}</small>
            </div>
        </div>
    `).join("");
}

function renderPlanejamento(planData) {
    const list = document.getElementById("planejamento-list");
    list.innerHTML = planData.map(p => formatAulaCard(p, false)).join("");
}

function renderFinancas() {
    const list = document.getElementById("financas-list");
    let totalGeral = 0;
    list.innerHTML = appData.alunos.map(aluno => {
        let finData = appData.financeiro.find(f => f.aluno === aluno.nome);
        let horaAula = finData ? parseFloat(finData.hora_aula) : 0;
        let aulasConcluidas = appData.planejamento.filter(p => p.aluno === aluno.nome && p.status === "Concluída").length;
        let valorPendente = (horaAula * (parseFloat(aluno.duracao) || 1)) * aulasConcluidas;
        totalGeral += valorPendente;

        return `
            <div class="aula-card" style="cursor:default">
                <span class="badge badge-name">${aluno.nome}</span>
                <span class="badge">Aulas: ${aulasConcluidas}</span>
                <span class="badge badge-status">R$ ${valorPendente.toFixed(2)}</span>
            </div>
        `;
    }).join("");
    document.getElementById("total-pendente-geral").innerText = `R$ ${totalGeral.toFixed(2)}`;
}

// FUNÇÕES DE APOIO PARA ABRIR POR ID (Usadas nos novos cards)
function openModalAlunoById(rowIndex) {
    const aluno = appData.alunos.find(a => a.rowIndex == rowIndex);
    openModalAluno(aluno);
}

function openModalPlanejamentoById(rowIndex) {
    const plan = appData.planejamento.find(p => p.rowIndex == rowIndex);
    openModalPlanejamento(plan);
}

function adiarAula(rowIndex) {
    const plan = appData.planejamento.find(p => p.rowIndex == rowIndex);
    const novaData = prompt("Para qual data deseja adiar? (Ex: 25/03/2026)", plan.data);
    if(novaData) {
        const dataUpdate = {...plan, data: novaData, status: 'Adiada'};
        apiRequest("editPlanejamento", dataUpdate, rowIndex).then(res => {
            if(res) fetchData();
        });
    }
}

// REUTILIZAÇÃO DAS FUNÇÕES ORIGINAIS DE MODAL (CONSOLIDADAS)
function setupModals() {
    document.getElementById("add-aluno-btn").onclick = () => openModalAluno(null);
    document.getElementById("add-planejamento-btn").onclick = () => openModalPlanejamento(null);
    document.querySelectorAll(".close-modal").forEach(btn => {
        btn.onclick = (e) => e.target.closest(".modal").classList.remove("active");
    });

    document.getElementById("form-aluno").onsubmit = async (e) => {
        e.preventDefault();
        const rowIdx = document.getElementById("aluno-rowIndex").value;
        const data = {
            nome: document.getElementById("aluno-nome").value,
            responsavel: document.getElementById("aluno-responsavel").value,
            whatsapp_responsavel: document.getElementById("aluno-whatsapp").value,
            tipo: document.getElementById("aluno-tipo").value,
            dias: document.getElementById("aluno-dias").value,
            hora: document.getElementById("aluno-hora").value,
            duracao: document.getElementById("aluno-duracao").value
        };
        const res = await apiRequest(rowIdx ? "editAluno" : "addAluno", data, rowIdx);
        if(res) { location.reload(); }
    };

    document.getElementById("form-planejamento").onsubmit = async (e) => {
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
        const res = await apiRequest(rowIdx ? "editPlanejamento" : "addPlanejamento", data, rowIdx);
        if(res) { location.reload(); }
    };
}

function openModalAluno(aluno) {
    document.getElementById("aluno-rowIndex").value = aluno ? aluno.rowIndex : "";
    document.getElementById("aluno-nome").value = aluno ? aluno.nome : "";
    document.getElementById("aluno-responsavel").value = aluno ? aluno.responsavel : "";
    document.getElementById("aluno-whatsapp").value = aluno ? aluno.whatsapp_responsavel : "";
    document.getElementById("aluno-tipo").value = aluno ? aluno.tipo : "Reforço";
    document.getElementById("aluno-dias").value = aluno ? aluno.dias : "";
    document.getElementById("aluno-hora").value = aluno ? aluno.hora : "";
    document.getElementById("aluno-duracao").value = aluno ? aluno.duracao : "";
    document.getElementById("modal-aluno").classList.add("active");
}

function openModalPlanejamento(plan) {
    document.getElementById("plan-rowIndex").value = plan ? plan.rowIndex : "";
    document.getElementById("plan-aluno").value = plan ? plan.aluno : (appData.alunos[0]?.nome || "");
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
    select.innerHTML = appData.alunos.map(a => `<option value="${a.nome}">${a.nome}</option>`).join("");
}

function renderCurrentView(viewId) {
    if (viewId === "home-view") renderHome();
    if (viewId === "alunos-view") renderAlunos(appData.alunos);
    if (viewId === "planejamento-view") renderPlanejamento(appData.planejamento);
    if (viewId === "financas-view") renderFinancas();
}

function setupSearch() {
    document.getElementById("search-alunos").oninput = (e) => {
        const termo = e.target.value.toLowerCase();
        renderAlunos(appData.alunos.filter(a => a.nome.toLowerCase().includes(termo)));
    };
    document.getElementById("search-planejamento").oninput = (e) => {
        const termo = e.target.value.toLowerCase();
        renderPlanejamento(appData.planejamento.filter(p => p.aluno.toLowerCase().includes(termo)));
    };
}
