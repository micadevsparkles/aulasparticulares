const API_URL = 'https://script.google.com/macros/s/AKfycbzJz9_BK4CiNNaGsLHKrczTJ9URUf116KGqxdttFlsv50RfXlvQ0-3GwacJ5EbVSoBnXg/exec';

let db = { Alunos: [], Planejamento_aula: [], financeiro: [] };

document.addEventListener('DOMContentLoaded', () => {
    updateGreeting();
    fetchData();
    setupForms();
});

// --- SISTEMA DE HORAS E DATAS ---
function formatTime(timeStr) {
    if (!timeStr) return "00:00";
    // Se vier o formato ISO do Google (1899-12-30T20:34...), extrai o HH:mm
    if (timeStr.toString().includes('T')) {
        const parts = timeStr.split('T')[1].split(':');
        return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
}

function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
}

// --- BUSCA E NAVEGAÇÃO ---
async function fetchData() {
    const loadingDiv = document.getElementById('loading');
    try {
        console.log("Iniciando busca de dados...");
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Validação básica dos dados recebidos
        if (!data.Alunos || !data.Planejamento_aula) {
            throw new Error("Dados recebidos em formato inválido ou abas da planilha faltando.");
        }

        db = data;
        console.log("Dados carregados com sucesso:", db);
        
        renderHome();
        updateAlunosDropdown();

    } catch (e) {
        console.error("Falha no fetchData:", e);
        loadingDiv.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #3c4043;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #d93025;"></i>
                <p><strong>Não foi possível carregar os dados</strong></p>
                <small style="display: block; margin-bottom: 10px; color: #666;">
                    Provavelmente um erro de permissão ou nome de aba na planilha.
                </small>
                <code style="background: #eee; padding: 5px; font-size: 0.8rem;">${e.message}</code><br><br>
                <button onclick="location.reload()" style="padding: 8px 16px; background: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Tentar Novamente
                </button>
            </div>
        `;
    } finally {
        // Isso garante que o overlay suma independentemente de erro ou sucesso
        if (db.Alunos.length > 0 || db.Planejamento_aula.length > 0) {
            loadingDiv.style.display = 'none';
        }
    }
}

// --- RENDERIZAÇÃO ---
function renderHome() {
    const today = new Date().setHours(0,0,0,0);
    const nextWeek = today + (7 * 24 * 60 * 60 * 1000);
    const lastWeek = today - (7 * 24 * 60 * 60 * 1000);

    const nextAulas = db.Planejamento_aula.filter(a => {
        const d = new Date(a.data).getTime();
        return d >= today && d <= nextWeek;
    });

    const lastAulas = db.Planejamento_aula.filter(a => {
        const d = new Date(a.data).getTime();
        return d < today && d >= lastWeek;
    });

    displayLessons(nextAulas, 'next-7-days');
    displayLessons(lastAulas, 'last-7-days');
}

function displayLessons(aulas, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = aulas.map(a => `
        <div class="item-aula" onclick="editAula('${a.aluno}', '${a.data}', '${formatTime(a.hora)}')">
            <strong>${a.aluno}</strong> - ${formatDate(a.data)} às ${formatTime(a.hora)}
            <span>${a.tipo} | ${a.materia}</span>
            <small>${a.conteudo || ''} | <b>${a.status}</b></small>
        </div>
    `).join('') || '<p>Sem aulas para este período.</p>';
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

// --- MODAIS E CRUD ---
function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
    document.getElementById('form-aluno').reset();
    document.getElementById('form-aula').reset();
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

async function sendData(sheet, data, action, id) {
    document.getElementById('loading').style.display = 'flex';
    try {
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action, sheet, data, id })
        });
        location.reload(); // Recarrega para atualizar dados
    } catch (e) {
        alert("Erro ao salvar dados.");
        document.getElementById('loading').style.display = 'none';
    }
}

async function deleteAluno() {
    if (!confirm("Excluir este aluno permanentemente?")) return;
    const id = document.getElementById('aluno-id-old').value;
    await sendData('Alunos', [], 'delete', id);
}

function updateAlunosDropdown() {
    const select = document.getElementById('au-aluno');
    select.innerHTML = db.Alunos.map(al => `<option value="${al.nome}">${al.nome}</option>`).join('');
}

// Funções de utilidade mantidas
function toggleMenu() { document.getElementById('sidebar').classList.toggle('active'); }
function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(`view-${viewName}`).style.display = 'block';
    if(viewName === 'alunos') renderAlunos();
    if(viewName === 'planejamento') renderPlanejamento();
    if(viewName === 'financas') renderFinancas();
    toggleMenu();
}
