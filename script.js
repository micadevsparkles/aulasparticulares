// Configuração Inicial
const API_URL = 'https://script.google.com/macros/s/AKfycbzJz9_BK4CiNNaGsLHKrczTJ9URUf116KGqxdttFlsv50RfXlvQ0-3GwacJ5EbVSoBnXg/exec';

let db = { Alunos: [], Planejamento_aula: [], financeiro: [] };

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    updateGreeting();
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

// --- 2. FORMATAÇÃO DE DADOS (TEXTO PURO) ---

// Retorna exatamente o texto da célula (Hora)
function formatTime(timeStr) {
    if (!timeStr) return "";
    let str = timeStr.toString();
    // Se por acaso vier o formato ISO do Google, limpa para pegar só a hora
    if (str.includes('T')) return str.split('T')[1].substring(0, 5);
    return str; 
}

// Retorna exatamente o texto da célula (Data)
function formatDate(dateStr) {
    if (!dateStr) return "";
    let str = dateStr.toString();
    // Se vier no formato AAAA-MM-DD (do input), apenas exibe como está ou inverte se quiser ver DD/MM
    if (str.includes('-') && str.length === 10) {
        const p = str.split('-');
        return `${p[2]}/${p[1]}/${p[0]}`;
    }
    return str;
}

// --- 3. COMUNICAÇÃO COM O BANCO DE DADOS ---
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
    // Na Home, mostramos tudo o que está no banco sem filtros de data complexos para não dar erro
    displayLessons(db.Planejamento_aula.slice(0, 10), 'next-7-days'); 
    displayLessons(db.Planejamento_aula.slice(10, 20), 'last-7-days');
}

function displayLessons(aulas, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = aulas.map(a => `
        <div class="item-aula" onclick="editAula('${a.aluno}', '${a.data}', '${a.hora}')">
            <strong>${a.aluno}</strong> - ${formatDate(a.data)} às ${formatTime(a.hora)}
            <span>${a.tipo} | ${a.materia}</span>
            <small>${a.conteudo || 'Sem conteúdo'} | <b>${a.status}</b></small>
        </div>
    `).join('') || '<p>Nenhuma aula encontrada.</p>';
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
    displayLessons(db.Planejamento_aula, 'cronograma-completo');
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
                <small>${aulasConcluidas} aulas concluídas</small>
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
    const aula = db.Planejamento_aula.find(a => a.aluno === aluno && a.data === data && a.hora === hora);
    if (!aula) return;

    document.getElementById('modal-aula-title').innerText = "Editar Aula";
    document.getElementById('aula-id-old').value = aula.aluno;
    document.getElementById('au-aluno').value = aula.aluno;
    document.getElementById('au-data').value = aula.data;
    document.getElementById('au-hora').value = formatTime(aula.hora);
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
        const id = document.getElementById('au-aluno').value;
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
