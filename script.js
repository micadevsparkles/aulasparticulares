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
    let text = hour >= 5 && hour < 12 ? "Bom dia" : hour >= 12 && hour < 18 ? "Boa tarde" : "Boa noite";
    document.getElementById("greeting").innerText = `${text}, Micael.`;
}

function setupNavigation() {
    const menuToggle = document.getElementById("menu-toggle");
    const sidebar = document.getElementById("sidebar");
    
    menuToggle.onclick = () => sidebar.classList.toggle("open");

    document.querySelectorAll(".nav-links li").forEach(link => {
        link.onclick = (e) => {
            if(window.innerWidth < 768) sidebar.classList.remove("open");
            document.querySelectorAll(".nav-links li").forEach(l => l.classList.remove("active"));
            link.classList.add("active");
            
            const target = link.getAttribute("data-target");
            document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
            document.getElementById(target).classList.remove("hidden");
            renderCurrentView(target);
        };
    });
}

async function fetchData() {
    document.getElementById("loader").classList.remove("hidden");
    try {
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: "getData" }) });
        const result = await response.json();
        if(result.success) {
            appData.alunos = result.data.alunos;
            appData.planejamento = result.data.planejamento;
            appData.financeiro = result.data.financeiro;
            renderCurrentView("home-view");
            populateAlunoSelect();
        }
    } finally {
        document.getElementById("loader").classList.add("hidden");
    }
}

function renderHome() {
    const today = new Date().toISOString().split('T')[0];
    
    // Filtrar: Próximos 7 dias (Apenas data >= hoje)
    const proximas = appData.planejamento.filter(p => p.data >= today).slice(0, 10);
    // Filtrar: Últimos 7 dias (Apenas data < hoje)
    const passadas = appData.planejamento.filter(p => p.data < today).reverse().slice(0, 10);

    document.getElementById("next-7-days").innerHTML = proximas.map(p => formatAulaCard(p, true)).join("");
    document.getElementById("last-7-days").innerHTML = passadas.map(p => formatAulaCard(p, false)).join("");
}

function formatAulaCard(p, comBotaoAdiar) {
    const resumo = p.conteudo.length > 50 ? p.conteudo.substring(0, 50) + "..." : p.conteudo;
    return `
        <div class="aula-card" onclick="openModalPlanejamentoById('${p.rowIndex}')">
            <span class="badge badge-name">${p.aluno}</span>
            <span class="badge">${p.data}</span>
            <span class="badge">${p.hora}</span>
            <span class="badge badge-status">${p.status}</span>
            ${comBotaoAdiar ? `<button class="badge" style="background:var(--warning); color:black; border:none; cursor:pointer;" onclick="event.stopPropagation(); adiarAula('${p.rowIndex}')">Adiar</button>` : ''}
            <div class="content-preview">${resumo || 'Sem conteúdo'}</div>
        </div>
    `;
}

function renderAlunos(data) {
    document.getElementById("alunos-list").innerHTML = data.map(al => `
        <div class="aula-card" onclick="openModalAlunoById('${al.rowIndex}')">
            <span style="font-size:1.5rem">👶</span>
            <span class="badge badge-name">${al.nome}</span>
            <span class="badge">${al.tipo}</span>
            <div class="content-preview">${al.responsavel} - ${al.whatsapp_responsavel}</div>
        </div>
    `).join("");
}

function renderPlanejamento(data) {
    document.getElementById("planejamento-list").innerHTML = data.map(p => formatAulaCard(p, false)).join("");
}

function renderFinancas() {
    document.getElementById("financas-list").innerHTML = appData.alunos.map(al => {
        const fin = appData.financeiro.find(f => f.aluno === al.nome);
        const valor = (parseFloat(fin?.hora_aula || 0) * (parseFloat(al.duracao) || 1)) * appData.planejamento.filter(p => p.aluno === al.nome && p.status === "Concluída").length;
        return `<div class="aula-card"><span class="badge badge-name">${al.nome}</span><span class="badge badge-status">R$ ${valor.toFixed(2)}</span></div>`;
    }).join("");
}

// Auxiliares de Modal
function openModalPlanejamentoById(id) { openModalPlanejamento(appData.planejamento.find(p => p.rowIndex == id)); }
function openModalAlunoById(id) { openModalAluno(appData.alunos.find(a => a.rowIndex == id)); }

function openModalPlanejamento(p) {
    const modal = document.getElementById("modal-planejamento");
    document.getElementById("plan-rowIndex").value = p ? p.rowIndex : "";
    document.getElementById("plan-aluno").value = p ? p.aluno : "";
    document.getElementById("plan-data").value = p ? p.data : "";
    document.getElementById("plan-hora").value = p ? p.hora : "";
    document.getElementById("plan-conteudo").value = p ? p.conteudo : "";
    document.getElementById("plan-status").value = p ? p.status : "Pendente";
    modal.classList.add("active");
}

function openModalAluno(a) {
    const modal = document.getElementById("modal-aluno");
    document.getElementById("aluno-rowIndex").value = a ? a.rowIndex : "";
    document.getElementById("aluno-nome").value = a ? a.nome : "";
    document.getElementById("aluno-responsavel").value = a ? a.responsavel : "";
    document.getElementById("aluno-whatsapp").value = a ? a.whatsapp_responsavel : "";
    document.getElementById("aluno-tipo").value = a ? a.tipo : "Reforço";
    modal.classList.add("active");
}

function populateAlunoSelect() {
    document.getElementById("plan-aluno").innerHTML = appData.alunos.map(a => `<option value="${a.nome}">${a.nome}</option>`).join("");
}

function setupModals() {
    document.querySelectorAll(".close-modal").forEach(btn => btn.onclick = () => document.querySelectorAll(".modal").forEach(m => m.classList.remove("active")));
    document.getElementById("add-aluno-btn").onclick = () => openModalAluno(null);
    document.getElementById("add-planejamento-btn").onclick = () => openModalPlanejamento(null);
}

function renderCurrentView(view) {
    if(view === "home-view") renderHome();
    else if(view === "alunos-view") renderAlunos(appData.alunos);
    else if(view === "planejamento-view") renderPlanejamento(appData.planejamento);
    else if(view === "financas-view") renderFinancas();
}

function setupSearch() {
    document.getElementById("search-alunos").oninput = (e) => renderAlunos(appData.alunos.filter(a => a.nome.toLowerCase().includes(e.target.value.toLowerCase())));
}
