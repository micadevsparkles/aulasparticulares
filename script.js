// Configuração Inicial
const API_URL = 'https://script.google.com/macros/s/AKfycbzJz9_BK4CiNNaGsLHKrczTJ9URUf116KGqxdttFlsv50RfXlvQ0-3GwacJ5EbVSoBnXg/exec';

let db = { Alunos: [], Planejamento_aula: [], financeiro: [] };

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    updateGreeting(); // Agora definido abaixo
    fetchData();
    setupForms();
});

// --- 1. FUNÇÕES DE INTERFACE E SAUDAÇÃO ---
function updateGreeting() {
    const hr = new Date().getHours();
    let msg = "Boa noite";
    if (hr < 12) msg = "Bom dia";
    else if (hr < 18) msg = "Boa tarde";
    const greetingElement = document.getElementById('greeting');
    if (greetingElement) greetingElement.innerText = `${msg}, Micael.`;
}

function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('active');
}

function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) targetView.style.display = 'block';
    
    toggleMenu();
    
    if(viewName === 'home') renderHome();
    if(viewName === 'alunos') renderAlunos();
    if(viewName === 'planejamento') renderPlanejamento();
    if(viewName === 'financas') renderFinancas();
}

// --- 2. FORMATAÇÃO DE DADOS (Correção da Hora 1899) ---
function formatTime(timeStr) {
    if (!timeStr) return "00:00";
    // Se for o formato de data completa do Google Sheets (Ex: 1899-12-30T20:30...)
    if (typeof timeStr === 'string' && timeStr.includes('T')) {
        return timeStr.split('T')[1].substring(0, 5);
    }
    return timeStr.toString().substring(0, 5);
}

function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    // Ajuste para evitar que a data mude por causa do fuso horário
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
    return d.toLocaleDateString('pt-BR');
}

// --- 3. COMUNICAÇÃO COM O BANCO DE DADOS (Apps Script) ---
async function fetchData() {
    const loadingDiv = document.getElementById('loading');
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Erro na rede');
        db = await response.json();
        
        loadingDiv.style.display = 'none';
        renderHome();
        updateAlunosDropdown();
    } catch (e) {
        console.error("Erro ao buscar dados:", e);
        loadingDiv.innerHTML = `<div style="text-align:center; padding:20px;">
            <p>Erro ao carregar dados. Verifique a conexão.</p>
            <button onclick="location.reload()">Repetir</button>
        </div>`;
    }
}

async function sendData(sheet, data, action, id) {
    document.getElementById('loading').style.display = 'flex';
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action, sheet, data, id })
        });
        const result = await response.json();
        if (result.status === 'success') {
            location.reload(); 
        }
    } catch (e) {
        alert("Erro ao processar solicitação.");
        document.getElementById('loading').style.display = 'none';
    }
}

// --- 4. RENDERIZAÇÃO DAS TELAS ---
function renderHome() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const nextAulas = db.Planejamento_aula.filter(a => {
        const d = new Date(a.data);
        return d >= today && d <= sevenDaysLater;
    });

    const lastAulas = db.Planejamento_aula.filter(a => {
        const d = new Date(a.data);
        return d < today && d >= sevenDaysAgo;
    });

    displayLessons(nextAulas, 'next-7-days');
    displayLessons(lastAulas, 'last-7-days');
}

function displayLessons(aulas, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = aulas.map(a => `
        <div class="item-aula" onclick="editAula('${a.aluno}', '${a.data}', '${a.hora}')">
            <strong>${a.aluno}</strong> - ${formatDate(a.data)} às ${formatTime(a.hora)}
            <span>${a.tipo} | ${a.materia}</span>
            <small>${a.conteudo || 'Sem conteúdo'} | <b>${a.status}</b></small>
        </div>
    `).join('') || '<p>Nenhuma aula neste período.</p>';
}

function renderAlunos() {
    const container = document.getElementById('lista-alunos');
    container.innerHTML = db.Alunos.map(al => `
        <div class="item-aluno" onclick="editAluno('${al.nome}')">
            <strong>${al.nome}</strong>
            <span>${al.tipo} - ${al.dias} às ${formatTime(al.hora)}</span>
            <small>${al.whatsapp_responsavel}</small>
        </div>
    `).join('');
}

function renderPlanejamento() {
    const sorted = [...db.Planejamento_aula].sort((a, b) => new Date(b.data) - new Date(a.data));
    displayLessons(sorted, 'cronograma-completo');
}

function renderFinancas() {
    let totalGeral = 0;
    const container = document.getElementById('lista-financeiro');
    
    const html = db.Alunos.map(al => {
        const aulasConcluidas = db.Planejamento_aula.filter(p => p.aluno === al.nome && p.status === 'Concluída').length;
        const finInfo = db.financeiro.find(f => f.aluno === al.nome) || { hora_aula: 0 };
        const valorPendente = (finInfo.hora_aula || 0) * (al.duracao || 0) * aulasConcluidas;
        totalGeral += valorPendente;

        return `
            <div class="card">
                <div style="display:flex; justify-content:space-between;">
                    <span>${al.nome}</span>
                    <strong>R$ ${valorPendente.toFixed(2)}</strong>
                </div>
                <small>${aulasConcluidas} aulas concluídas (R$ ${finInfo.hora_aula}/h)</small>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
    document.getElementById('total-geral').innerText = `R$ ${totalGeral.toFixed(2)}`;
}

// --- 5. MODAIS E FORMULÁRIOS (CRUD) ---
function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
    document.getElementById('form-aluno').reset();
    document.getElementById('form-aula').reset();
    document.getElementById('btn-delete-aluno').style.display = 'none';
    document.getElementById('btn-delete-aula').style.display = 'none';
}

function updateAlunosDropdown() {
    const select = document.getElementById('au-aluno');
    if(select) {
        select.innerHTML = '<option value="">Selecione o Aluno</option>' + 
            db.Alunos.map(al => `<option value="${al.nome}">${al.nome}</option>`).join('');
    }
}

function editAluno(nome) {
    const al = db.Alunos.find(x => x.nome === nome);
    if (!al) return;
    
    document.getElementById('modal-aluno-title').innerText = "Editar Aluno";
    document.getElementById('aluno-id-old').value = al.nome;
    document.getElementById('al-nome').value = al.nome;
    document.getElementById('al-end').value = al.endereco;
    document.getElementById('al-cid').value = al.cidade;
    document.getElementById('al-bairro').value = al.bairro;
    document.getElementById('al-resp').value = al.responsavel;
    document.getElementById('al-whats').value = al.whatsapp_responsavel;
    document.getElementById('al-tipo').value = al.tipo;
    document.getElementById('al-dias').value = al.dias;
    document.getElementById('al-hora').value = formatTime(al.hora);
    document.getElementById('al-duracao').value = al.duracao;
    
    document.getElementById('btn-delete-aluno').style.display = 'block';
    openModal('modal-aluno');
}

function editAula(aluno, data, hora) {
    const dStr = new Date(data).toISOString().split('T')[0];
    const hStr = formatTime(hora);
    const aula = db.Planejamento_aula.find(a => a.aluno === aluno && a.data.includes(dStr) && formatTime(a.hora) === hStr);
    
    if (!aula) return;

    document.getElementById('modal-aula-title').innerText = "Editar Aula";
    document.getElementById('aula-id-old').value = aula.aluno; // Simplificado para busca no update
    document.getElementById('au-aluno').value = aula.aluno;
    document.getElementById('au-data').value = dStr;
    document.getElementById('au-hora').value = hStr;
    document.getElementById('au-tipo').value = aula.tipo;
    document.getElementById('au-materia').value = aula.materia;
    document.getElementById('au-conteudo').value = aula.conteudo;
    document.getElementById('au-status').value = aula.status;

    document.getElementById('btn-delete-aula').style.display = 'block';
    openModal('modal-aula');
}

function setupForms() {
    document.getElementById('form-aluno').onsubmit = async (e) => {
        e.preventDefault();
        const oldId = document.getElementById('aluno-id-old').value;
        const data = [
            document.getElementById('al-nome').value,
            document.getElementById('al-end').value,
            document.getElementById('al-cid').value,
            document.getElementById('al-bairro').value,
            document.getElementById('al-resp').value,
            document.getElementById('al-whats').value,
            document.getElementById('al-tipo').value,
            document.getElementById('al-dias').value,
            document.getElementById('al-hora').value,
            document.getElementById('al-duracao').value
        ];
        await sendData('Alunos', data, oldId ? 'update' : 'create', oldId);
    };

    document.getElementById('form-aula').onsubmit = async (e) => {
        e.preventDefault();
        const oldId = document.getElementById('aula-id-old').value;
        const data = [
            document.getElementById('au-aluno').value,
            document.getElementById('au-data').value,
            document.getElementById('au-hora').value,
            document.getElementById('au-tipo').value,
            document.getElementById('au-materia').value,
            document.getElementById('au-conteudo').value,
            document.getElementById('au-status').value
        ];
        await sendData('Planejamento_aula', data, oldId ? 'update' : 'create', oldId);
    };
}

async function deleteAluno() {
    if (confirm("Deseja realmente excluir este aluno?")) {
        const id = document.getElementById('aluno-id-old').value;
        await sendData('Alunos', [], 'delete', id);
    }
}

async function deleteAula() {
    if (confirm("Deseja cancelar/excluir este planejamento?")) {
        const id = document.getElementById('au-aluno').value; // Usando nome como referência
        await sendData('Planejamento_aula', [], 'delete', id);
    }
}

// --- 6. BUSCAS ---
function filterAlunos() {
    const term = document.getElementById('search-aluno').value.toLowerCase();
    const filtered = db.Alunos.filter(al => al.nome.toLowerCase().includes(term));
    const container = document.getElementById('lista-alunos');
    container.innerHTML = filtered.map(al => `
        <div class="item-aluno" onclick="editAluno('${al.nome}')">
            <strong>${al.nome}</strong>
            <span>${al.tipo} - ${al.dias} às ${formatTime(al.hora)}</span>
        </div>
    `).join('');
}

function filterPlanejamento() {
    const term = document.getElementById('search-aula').value.toLowerCase();
    const filtered = db.Planejamento_aula.filter(a => a.aluno.toLowerCase().includes(term) || a.materia.toLowerCase().includes(term));
    displayLessons(filtered, 'cronograma-completo');
}
