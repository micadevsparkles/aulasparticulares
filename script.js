// ATENÇÃO: Substitua pela URL do seu Web App implantado no Google Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbzJz9_BK4CiNNaGsLHKrczTJ9URUf116KGqxdttFlsv50RfXlvQ0-3GwacJ5EbVSoBnXg/exec';

let db = { Alunos: [], Planejamento_aula: [], financeiro: [] };

document.addEventListener('DOMContentLoaded', () => {
    updateGreeting();
    fetchData();
});

function updateGreeting() {
    const hr = new Date().getHours();
    let msg = "Boa noite";
    if (hr < 12) msg = "Bom dia";
    else if (hr < 18) msg = "Boa tarde";
    document.getElementById('greeting').innerText = `${msg}, Micael.`;
}

async function fetchData() {
    const loadingDiv = document.getElementById('loading');
    
    // Removi a verificação manual que estava travando o seu código
    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) throw new Error('A resposta do servidor não foi ok. Verifique se o script está publicado como "Anyone".');
        
        db = await response.json();
        
        loadingDiv.style.display = 'none';
        renderHome();
        console.log("Dados carregados com sucesso:", db);
    } catch (e) {
        console.error("Erro ao buscar dados:", e);
        loadingDiv.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #3c4043;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #d93025;"></i>
                <p><strong>Erro de Conexão</strong></p>
                <small style="display: block; margin-bottom: 10px;">${e.message}</small>
                <button onclick="location.reload()" style="padding: 8px 16px; background: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Tentar Novamente
                </button>
            </div>
        `;
    }
}
function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('active');
}

function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(`view-${viewName}`).style.display = 'block';
    toggleMenu();
    
    if(viewName === 'home') renderHome();
    if(viewName === 'alunos') renderAlunos();
    if(viewName === 'planejamento') renderPlanejamento();
    if(viewName === 'financas') renderFinancas();
}

function renderHome() {
    const today = new Date();
    const next7 = db.Planejamento_aula.filter(a => {
        const d = new Date(a.data);
        return d >= today && d <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    });
    const last7 = db.Planejamento_aula.filter(a => {
        const d = new Date(a.data);
        return d < today && d >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    });

    displayLessons(next7, 'next-7-days');
    displayLessons(last7, 'last-7-days');
}

function displayLessons(aulas, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = aulas.map(a => `
        <div class="item-aula">
            <strong>${a.aluno}</strong> - ${formatDate(a.data)} às ${a.hora}
            <span>${a.tipo} | ${a.materia}</span>
            <small>${a.conteudo} | <b>${a.status}</b></small>
        </div>
    `).join('') || '<p>Nenhuma aula encontrada.</p>';
}

function renderAlunos() {
    const container = document.getElementById('lista-alunos');
    container.innerHTML = db.Alunos.map(al => `
        <div class="item-aluno" onclick="alert('Editar: ${al.nome}')">
            <strong>${al.nome}</strong>
            <span>${al.tipo} - ${al.dias} às ${al.hora}</span>
            <small>${al.whatsapp_responsavel}</small>
        </div>
    `).join('');
}

function renderPlanejamento() {
    // Ordena da mais recente para antiga
    const sorted = [...db.Planejamento_aula].sort((a, b) => new Date(b.data) - new Date(a.data));
    displayLessons(sorted, 'cronograma-completo');
}

function renderFinancas() {
    let totalGeral = 0;
    const container = document.getElementById('lista-financeiro');
    
    const html = db.Alunos.map(al => {
        const aulasConcluidas = db.Planejamento_aula.filter(p => p.aluno === al.nome && p.status === 'Concluída').length;
        // Financeiro: valor_pendente = hora_aula * duracao * aulasConcluidas
        // Buscando valor da hora_aula na tabela financeiro
        const finInfo = db.financeiro.find(f => f.aluno === al.nome) || { hora_aula: 0 };
        const valorPendente = finInfo.hora_aula * al.duracao * aulasConcluidas;
        totalGeral += valorPendente;

        return `
            <div class="card">
                <span>${al.nome}</span>
                <strong>R$ ${valorPendente.toFixed(2)}</strong>
                <small>${aulasConcluidas} aulas concluídas</small>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
    document.getElementById('total-geral').innerText = `R$ ${totalGeral.toFixed(2)}`;
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
}

// Funções de filtro seriam implementadas aqui para os inputs de pesquisa
