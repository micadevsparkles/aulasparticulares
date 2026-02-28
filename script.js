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
    document.getElementById("greeting").innerText = greetingText;
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
    if (show) {
        loader.classList.remove("hidden");
    } else {
        loader.classList.add("hidden");
    }
}

// ==========================================
// COMUNICAÇÃO COM O BACKEND (API) - TOTALMENTE RESTAURADO
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
// RENDERIZAÇÃO DAS TELAS (COM NOVA UI "CAIXINHAS")
// ==========================================
function renderCurrentView(viewId) {
    if (viewId === "home-view") renderHome();
    if (viewId === "alunos-view") renderAlunos(appData.alunos);
    if (viewId === "planejamento-view") renderPlanejamento(appData.planejamento);
    if (viewId === "financas-view") renderFinancas();
}

// FORMATADOR PADRÃO DO CARD DE AULA
function criarCardAulaHTML(p, isNextDays) {
    let btnAdiarHTML = "";
    if (isNextDays) {
        btnAdiarHTML = `<button type="button" class="btn-adiar" onclick="event.stopPropagation(); adiarAula('${p.rowIndex}')">Adiar</button>`;
    }

    return `
        <div class="card-item" onclick="openModalPlanejamentoById('${p.rowIndex}')">
            <div class="card-tags">
                <span class="tag tag-primary">${p.aluno}</span>
                <span class="tag">${p.data}</span>
                <span class="tag">${p.hora}</span>
                <span class="tag">${p.materia}</span>
                <span class="tag tag-success">${p.status}</span>
                ${btnAdiarHTML}
            </div>
            <div class="card-content">
                ${p.conteudo || "Nenhum conteúdo descrito."}
            </div>
        </div>
    `;
}

function renderHome() {
    const nextList = document.getElementById("next-7-days");
    const lastList = document.getElementById("last-7-days");
    
    // Pega a data de hoje no formato local ajustado YYYY-MM-DD
    const todayStr = new Date().toLocaleDateString('en-CA'); 
    
    // Calculando limites de forma simples
    let nextDate = new Date(); nextDate.setDate(nextDate.getDate() + 7);
    let lastDate = new Date(); lastDate.setDate(lastDate.getDate() - 7);
    const nextLimit = nextDate.toLocaleDateString('en-CA');
    const lastLimit = lastDate.toLocaleDateString('en-CA');

    // Correção: Próximos 7 dias -> Data é >= hoje
    const nextClasses = appData.planejamento.filter(p => p.data >= todayStr && p.data <= nextLimit);
    // Correção: Últimos 7 dias -> Data é < hoje
    const lastClasses = appData.planejamento.filter(p => p.data < todayStr && p.data >= lastLimit);

    nextList.innerHTML = nextClasses.length ? nextClasses.map(p => criarCardAulaHTML(p, true)).join("") : "<p style='color:var(--text-muted);'>Nenhuma aula agendada para os próximos 7 dias.</p>";
    lastList.innerHTML = lastClasses.length ? lastClasses.map(p => criarCardAulaHTML(p, false)).join("") : "<p style='color:var(--text-muted);'>Nenhuma aula nos últimos 7 dias.</p>";
}

function renderAlunos(alunosData) {
    const list = document.getElementById("alunos-list");
    list.innerHTML = "";
    alunosData.forEach(aluno => {
        list.innerHTML += `
            <div class="card-item" onclick="openModalAlunoById('${aluno.rowIndex}')">
                <div class="aluno-header">
                    <span class="child-icon">🧒</span>
                    <span class="tag tag-primary" style="font-size: 1rem;">${aluno.nome}</span>
                </div>
                <div class="card-tags" style="margin-top: 5px;">
                    <span class="tag">Resp: ${aluno.responsavel}</span>
                    <span class="tag">Zap: ${aluno.whatsapp_responsavel}</span>
                    <span class="tag">Dias: ${aluno.dias}</span>
                    <span class="tag">${aluno.hora} (${aluno.duracao}h)</span>
                    <span class="tag tag-success">${aluno.tipo}</span>
                </div>
            </div>
        `;
    });
}

function renderPlanejamento(planData) {
    const list = document.getElementById("planejamento-list");
    list.innerHTML = "";
    planData.forEach(p => {
        list.innerHTML += criarCardAulaHTML(p, false);
    });
}

function renderFinancas() {
    const list = document.getElementById("financas-list");
    let totalGeral = 0;
    list.innerHTML = "";

    appData.alunos.forEach(aluno => {
        let finData = appData.financeiro.find(f => f.aluno === aluno.nome);
        let horaAula = finData ? parseFloat(finData.hora_aula) : 0;
        
        let aulasConcluidas = appData.planejamento.filter(p => p.aluno === aluno.nome && p.status === "Concluída").length;
        let duracao = parseFloat(aluno.duracao) || 1;
        
        let valorPendente = (horaAula * duracao) * aulasConcluidas;
        totalGeral += valorPendente;

        list.innerHTML += `
            <div class="card-item" style="cursor: default;">
                <div class="card-tags">
                    <span class="tag tag-primary" style="font-size:1rem;">${aluno.nome}</span>
                    <span class="tag">Aulas Concluídas: ${aulasConcluidas}</span>
                    <span class="tag tag-success" style="margin-left:auto; font-size:1rem;">Pendente: R$ ${valorPendente.toFixed(2)}</span>
                </div>
                <div style="margin-top: 10px; font-size:0.9rem; color:var(--text-muted);">
                    Hora-aula acordada: R$ 
                    <input type="number" value="${horaAula}" style="width:80px; padding:4px; background:var(--bg-base); color:white; border:1px solid var(--border-color); border-radius:4px;" 
                    onchange="updateHoraAula('${aluno.nome}', this.value, ${finData ? finData.rowIndex : 'null'})">
                </div>
            </div>
        `;
    });

    document.getElementById("total-pendente-geral").innerText = `R$ ${totalGeral.toFixed(2)}`;
}

// Função invocada diretamente pelo HTML na tela de Finanças (Mantida rigorosamente)
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

// Função de Adiar (Usa a estrutura robusta do apiRequest original)
async function adiarAula(rowIndex) {
    const plan = appData.planejamento.find(p => p.rowIndex == rowIndex);
    if(!plan) return;
    
    const novaData = prompt("Para qual data deseja adiar? (Ex: YYYY-MM-DD)", plan.data);
    if(novaData) {
        const dataUpdate = { ...plan, data: novaData, status: 'Adiada' };
        const res = await apiRequest("editPlanejamento", dataUpdate, rowIndex);
        if(res) {
            appData.planejamento = res.reverse();
            renderHome();
            renderPlanejamento(appData.planejamento);
        }
    }
}

// Funções globais para abrir modais partindo do HTML gerado (Cards)
window.openModalAlunoById = function(rowIndex) {
    const aluno = appData.alunos.find(a => a.rowIndex == rowIndex);
    openModalAluno(aluno);
};

window.openModalPlanejamentoById = function(rowIndex) {
    const plan = appData.planejamento.find(p => p.rowIndex == rowIndex);
    openModalPlanejamento(plan);
};

// ==========================================
// FORMULÁRIOS E MODAIS (CRUD) - RESTAURADOS 100%
// ==========================================
function setupModals() {
    const modalAluno = document.getElementById("modal-aluno");
    const modalPlan = document.getElementById("modal-planejamento");
    
    document.getElementById("add-aluno-btn").addEventListener("click", () => openModalAluno(null));
    document.getElementById("add-planejamento-btn").addEventListener("click", () => openModalPlanejamento(null));
    
    document.querySelectorAll(".close-modal").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.target.closest(".modal").classList.add("hidden");
            e.target.closest(".modal").classList.remove("active");
        });
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
        if(res) { 
            appData.alunos = res; 
            modalAluno.classList.add("hidden"); 
            renderAlunos(appData.alunos); 
            populateAlunoSelect(); 
        }
    });

    document.getElementById("btn-delete-aluno").addEventListener("click", async () => {
        const rowIdx = document.getElementById("aluno-rowIndex").value;
        if(confirm("Tem certeza que deseja excluir?")) {
            const res = await apiRequest("deleteAluno", null, rowIdx);
            if(res) { 
                appData.alunos = res; 
                modalAluno.classList.add("hidden"); 
                renderAlunos(appData.alunos); 
                populateAlunoSelect(); 
            }
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
        if(res) { 
            appData.planejamento = res.reverse(); 
            modalPlan.classList.add("hidden"); 
            renderPlanejamento(appData.planejamento); 
            renderHome(); 
        }
    });

    document.getElementById("btn-delete-plan").addEventListener("click", async () => {
        const rowIdx = document.getElementById("plan-rowIndex").value;
        if(confirm("Tem certeza que deseja excluir esta aula?")) {
            const res = await apiRequest("deletePlanejamento", null, rowIdx);
            if(res) { 
                appData.planejamento = res.reverse(); 
                modalPlan.classList.add("hidden"); 
                renderPlanejamento(appData.planejamento); 
                renderHome(); 
            }
        }
    });
}

function openModalAluno(aluno) {
    document.getElementById("modal-aluno-title").innerText = aluno ? "Editar Aluno" : "Adicionar Aluno";
    
    const btnDelete = document.getElementById("btn-delete-aluno");
    if(aluno) btnDelete.classList.remove("hidden"); else btnDelete.classList.add("hidden");
    
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
    
    const modal = document.getElementById("modal-aluno");
    modal.classList.remove("hidden");
}

function openModalPlanejamento(plan) {
    document.getElementById("modal-planejamento-title").innerText = plan ? "Editar Aula" : "Adicionar Aula";
    
    const btnDelete = document.getElementById("btn-delete-plan");
    if(plan) btnDelete.classList.remove("hidden"); else btnDelete.classList.add("hidden");
    
    document.getElementById("plan-rowIndex").value = plan ? plan.rowIndex : "";
    document.getElementById("plan-aluno").value = plan ? plan.aluno : (appData.alunos[0] ? appData.alunos[0].nome : "");
    document.getElementById("plan-data").value = plan ? plan.data : "";
    document.getElementById("plan-hora").value = plan ? plan.hora : "";
    document.getElementById("plan-tipo").value = plan ? plan.tipo : "Reforço";
    document.getElementById("plan-materia").value = plan ? plan.materia : "Português";
    document.getElementById("plan-conteudo").value = plan ? plan.conteudo : "";
    document.getElementById("plan-status").value = plan ? plan.status : "Pendente";
    
    const modal = document.getElementById("modal-planejamento");
    modal.classList.remove("hidden");
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
// BUSCA (SEARCH BARS) - RESTAURADAS
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
