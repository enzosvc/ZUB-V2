// ZUB · Painel Pessoal

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser  = null;
let assuntosData = [];
let notasData    = [];
let calYear      = new Date().getFullYear();
let editingId    = null;
let editingNotaId = null;
let selectedStatus = 'ativo';
let selectedZona   = 'transmissao';

const ZONA_LABELS = {
  transmissao: 'Transmissão',
  geracao: 'Geração e Armazenamento',
  ma: 'M&A',
  outros: 'Outros'
};

// ── INIT ─────────────────────────────────
// Registra o listener ANTES de verificar sessão para garantir que
// qualquer mudança de estado dispare showApp() imediatamente
window.addEventListener('DOMContentLoaded', async () => {
  db.auth.onAuthStateChange((_event, session) => {
    if (session) { currentUser = session.user; showApp(); }
    else { currentUser = null; showLogin(); }
  });

  const { data: { session } } = await db.auth.getSession();
  if (session) { currentUser = session.user; showApp(); }
  else showLogin();
});

// ── AUTH ─────────────────────────────────
function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  const email = currentUser?.email || '';
  document.getElementById('user-badge').textContent = email.split('@')[0];
  loadCotacoes();
  loadAssuntos();
  loadNotas();
  loadPastas();
  setInterval(loadCotacoes, 5 * 60 * 1000);
}

async function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl  = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');

  errorEl.textContent = '';
  if (!email || !password) { errorEl.textContent = 'Preencha e-mail e senha.'; return; }

  btn.textContent = 'Entrando...'; btn.disabled = true;

  try {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) {
      errorEl.textContent = 'E-mail ou senha incorretos.';
    } else if (data?.session) {
      currentUser = data.session.user;
      showApp(); // chama diretamente sem depender do listener
    } else {
      errorEl.textContent = 'Erro ao entrar. Tente novamente.';
    }
  } catch (err) {
    errorEl.textContent = 'Erro de conexão: ' + err.message;
  } finally {
    btn.textContent = 'Entrar'; btn.disabled = false;
  }
}

async function handleLogout() { await db.auth.signOut(); }

// ── COTAÇÕES ─────────────────────────────
async function loadCotacoes() {
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('cotacao-time').textContent = `Atualizado às ${now}`;
  await loadDolar();
  if (METALS_API_KEY) await loadMetals(); else setDemoMetals();
}

async function loadDolar() {
  try {
    const res  = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    const data = await res.json();
    const usd  = data.USDBRL;
    const val  = parseFloat(usd.bid).toFixed(2);
    const pct  = parseFloat(usd.pctChange).toFixed(2);
    setCotacao('cot-dolar', `R$ ${val}`, pct, parseFloat(pct) >= 0);
  } catch { setCotacao('cot-dolar', 'Indisponível', null, null); }
}

async function loadMetals() {
  try {
    const res  = await fetch(`https://metals-api.com/api/latest?access_key=${METALS_API_KEY}&base=USD&symbols=ALU,LITHIUM,STEEL_HRC`);
    const data = await res.json();
    if (data.success) {
      setCotacao('cot-aluminio', `$${Math.round(1/data.rates.ALU*1000)}`, null, null);
      setCotacao('cot-litio',    `$${Math.round(1/data.rates.LITHIUM*1000)}`, null, null);
      setCotacao('cot-aco',      `$${Math.round(1/data.rates.STEEL_HRC)}`, null, null);
    } else setDemoMetals();
  } catch { setDemoMetals(); }
}

function setDemoMetals() {
  setCotacao('cot-aluminio', '$2.487', '+0.82', true);
  setCotacao('cot-litio',    '$11.200', '-1.14', false);
  setCotacao('cot-aco',      '$548', '+0.20', true);
}

function setCotacao(id, val, pct, up) {
  const card = document.getElementById(id);
  if (!card) return;
  card.querySelector('.cot-val').textContent = val;
  const el = card.querySelector('.cot-change');
  if (pct !== null) {
    el.textContent  = `${parseFloat(pct) >= 0 ? '+' : ''}${pct}% hoje`;
    el.className    = 'cot-change ' + (up ? 'up' : 'down');
  } else {
    el.textContent = 'Sem variação';
    el.className   = 'cot-change neutral';
  }
}

// ── ASSUNTOS ─────────────────────────────
async function loadAssuntos() {
  const { data, error } = await db.from('assuntos').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  assuntosData = data || [];
  renderAssuntos();
  renderCalendario();
}

function renderAssuntos() {
  const zonas = ['transmissao', 'geracao', 'ma', 'outros'];
  let total = 0, ativos = 0;

  zonas.forEach(zona => {
    const items = assuntosData.filter(a => a.zona === zona);
    total  += items.length;
    ativos += items.filter(a => a.status !== 'concluido').length;

    const countEl = document.getElementById('count-' + zona);
    const bodyEl  = document.getElementById('zona-' + zona);
    if (countEl) countEl.textContent = items.length;
    if (bodyEl) bodyEl.innerHTML = items.length === 0
      ? '<div class="zona-empty">Nenhum assunto ainda</div>'
      : items.map(renderCardBloco).join('');

    const lcountEl = document.getElementById('lcount-' + zona);
    const listaEl  = document.getElementById('lista-' + zona);
    if (lcountEl) lcountEl.textContent = items.length;
    if (listaEl) listaEl.innerHTML = items.length === 0
      ? '<div class="zona-empty-row">Nenhum assunto ainda</div>'
      : items.map(renderItemLista).join('');
  });

  const el = document.getElementById('assuntos-count');
  if (el) el.textContent = `${total} assuntos · ${ativos} ativos`;
}

function renderCardBloco(a) {
  const desc = a.descricao ? a.descricao.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().substring(0,100) : '';
  return `
    <div class="card-assunto" onclick="openModal('${a.zona}','${a.id}')" id="card-${a.id}">
      <div class="card-header">
        <div class="card-nome">${escHtml(a.nome)}</div>
        <span class="card-status ${statusClass(a.status)}">${statusLabel(a.status)}</span>
      </div>
      ${desc ? `<div class="card-desc">${escHtml(desc)}${(a.descricao||'').length>100?'...':''}</div>` : ''}
      ${a.data ? `<div class="card-datas"><div class="card-data"><div class="card-data-label">Data</div><div class="card-data-val">${formatDate(a.data)}</div></div></div>` : ''}
    </div>`;
}

function renderItemLista(a) {
  const desc     = a.descricao ? a.descricao.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().substring(0,60) : '';
  const diasStr  = getDiasRestantes(a.data, a.status);
  const diasCls  = diasStr.includes('atrasado') ? 'li-dias atrasado' : diasStr === 'Sem data' ? 'li-dias sem-prazo' : 'li-dias';
  return `
    <div class="list-item" onclick="openModal('${a.zona}','${a.id}')" id="card-${a.id}">
      <div><div class="li-nome">${escHtml(a.nome)}</div>${desc ? `<div class="li-desc">${escHtml(desc)}</div>` : ''}</div>
      <span class="li-status ${statusClass(a.status)}">${statusLabel(a.status)}</span>
      <span class="li-data">${a.data ? formatDate(a.data) : '—'}</span>
      <span class="${diasCls}">${diasStr}</span>
    </div>`;
}

// ── VIEW TOGGLE ──────────────────────────
function setView(v) {
  document.getElementById('view-blocos').style.display = v === 'blocos' ? 'block' : 'none';
  document.getElementById('view-lista').style.display  = v === 'lista'  ? 'block' : 'none';
  document.getElementById('btn-blocos').classList.toggle('active', v === 'blocos');
  document.getElementById('btn-lista').classList.toggle('active',  v === 'lista');
}

// ── MODAL ASSUNTO ────────────────────────
function openModal(zona, id = null) {
  editingId    = id;
  selectedZona = zona;
  document.getElementById('modal-zona-badge').textContent = ZONA_LABELS[zona] || zona;
  const title = document.getElementById('modal-title-text');

  if (id) {
    const a = assuntosData.find(x => x.id === id);
    if (!a) return;
    title.textContent = a.nome;
    document.getElementById('form-nome').value      = a.nome || '';
    document.getElementById('form-desc-rich').innerHTML = a.descricao || '';
    document.getElementById('form-data').value      = a.data || '';
    selectedStatus = a.status || 'ativo';
    selectedZona   = a.zona   || zona;
    document.getElementById('modal-meta').textContent = `Criado em ${formatDate(a.created_at?.split('T')[0])}`;
    document.getElementById('btn-del').style.display  = 'inline-block';
  } else {
    title.textContent = 'Novo assunto';
    document.getElementById('form-nome').value          = '';
    document.getElementById('form-desc-rich').innerHTML = '';
    document.getElementById('form-data').value          = '';
    selectedStatus = 'ativo';
    document.getElementById('modal-meta').textContent   = '';
    document.getElementById('btn-del').style.display    = 'none';
  }

  document.querySelectorAll('.status-pill').forEach(p => p.classList.toggle('active', p.dataset.status === selectedStatus));
  document.querySelectorAll('.zona-pill').forEach(p   => p.classList.toggle('active', p.dataset.zona   === selectedZona));
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() { document.getElementById('modal-overlay').style.display = 'none'; editingId = null; }
function closeModalOutside(e) { if (e.target === document.getElementById('modal-overlay')) closeModal(); }

function selectStatus(el) {
  selectedStatus = el.dataset.status;
  document.querySelectorAll('.status-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
}

function selectZona(el) {
  selectedZona = el.dataset.zona;
  document.querySelectorAll('.zona-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('modal-zona-badge').textContent = ZONA_LABELS[selectedZona];
}

async function saveAssunto() {
  const nome = document.getElementById('form-nome').value.trim();
  if (!nome) { alert('Preencha o nome do assunto.'); return; }
  const payload = {
    nome,
    descricao: document.getElementById('form-desc-rich').innerHTML || '',
    data:      document.getElementById('form-data').value || null,
    status:    selectedStatus,
    zona:      selectedZona,
    user_id:   currentUser?.id
  };
  const btn = document.querySelector('.btn-save');
  btn.textContent = 'Salvando...'; btn.disabled = true;
  let error;
  if (editingId) { ({ error } = await db.from('assuntos').update(payload).eq('id', editingId)); }
  else           { ({ error } = await db.from('assuntos').insert(payload)); }
  btn.textContent = 'Salvar'; btn.disabled = false;
  if (error) { alert('Erro ao salvar: ' + error.message); return; }
  closeModal(); loadAssuntos();
}

async function deleteAssunto() {
  if (!confirm('Remover este assunto?')) return;
  const { error } = await db.from('assuntos').delete().eq('id', editingId);
  if (error) { alert('Erro ao excluir: ' + error.message); return; }
  closeModal(); loadAssuntos();
}

function fmt(cmd) { document.getElementById('form-desc-rich').focus(); document.execCommand(cmd, false, null); }

// ── CALENDÁRIO ───────────────────────────
const MESES    = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const mesAtual = new Date().getMonth();
const anoAtual = new Date().getFullYear();

function changeYear(delta) { calYear += delta; renderCalendario(); }

function renderCalendario() {
  document.getElementById('cal-year-title').textContent = `Calendário ${calYear}`;
  const row    = document.getElementById('months-row');
  const legend = document.getElementById('cal-legend');
  const byMonth = {};
  for (let m = 0; m < 12; m++) byMonth[m] = [];

  assuntosData.forEach(a => {
    if (!a.data) return;
    const d = new Date(a.data + 'T00:00:00');
    if (d.getFullYear() === calYear) {
      byMonth[d.getMonth()].push({
        label: (a.nome || '').substring(0, 18) + (a.status === 'concluido' ? ' ✓' : ''),
        zona: a.zona || 'outros',
        id: a.id
      });
    }
  });

  row.innerHTML = MESES.map((mes, i) => {
    const isCur  = calYear === anoAtual && i === mesAtual;
    const evHtml = byMonth[i].map(ev =>
      `<div class="cal-event ${ev.zona}" title="${escHtml(ev.label)}" onclick="goToAssunto('${ev.id}')">${escHtml(ev.label)}</div>`
    ).join('');
    return `<div class="month-col ${isCur ? 'current' : ''}"><div class="month-label">${mes}</div><div class="month-events">${evHtml}</div></div>`;
  }).join('');

  const zonasComEvento = new Set(
    assuntosData.filter(a => a.data && new Date(a.data + 'T00:00:00').getFullYear() === calYear).map(a => a.zona || 'outros')
  );
  legend.innerHTML = [...zonasComEvento].map(z =>
    `<div class="leg-item"><div class="leg-dot ${z}"></div>${ZONA_LABELS[z] || z}</div>`
  ).join('') || `<span style="font-size:11px;color:#9AAAC0">Nenhum evento em ${calYear}</span>`;
}

function goToAssunto(id) {
  showTab('agenda', null);
  document.querySelectorAll('.nav-tab').forEach(btn => {
    if (btn.getAttribute('onclick')?.includes('agenda')) btn.classList.add('active');
  });
  setTimeout(() => {
    const card = document.getElementById('card-' + id);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.style.outline = '2.5px solid #6DD400';
      setTimeout(() => { card.style.outline = 'none'; }, 2000);
    }
  }, 100);
}

// ── DESENVOLVIMENTO ──────────────────────
async function loadNotas() {
  const { data, error } = await db.from('notas').select('*').order('updated_at', { ascending: false });
  if (error) { console.error(error); return; }
  notasData = data || [];
  renderNotasSidebar();
}

function renderNotasSidebar() {
  const lista = document.getElementById('dev-lista');
  const count = document.getElementById('dev-count');
  if (count) count.textContent = `Desenvolvimento · ${notasData.length} temas`;
  if (!lista) return;

  if (notasData.length === 0) {
    lista.innerHTML = '<div style="padding:20px 14px;font-size:12px;color:#9AAAC0;text-align:center;font-weight:500">Nenhum tema ainda.<br>Clique em "+ Novo tema".</div>';
    return;
  }

  lista.innerHTML = notasData.map(n => {
    const preview = n.conteudo ? n.conteudo.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().substring(0,50) : '';
    const dataStr = n.updated_at ? new Date(n.updated_at).toLocaleDateString('pt-BR') : '—';
    const isActive = n.id === editingNotaId;
    return `<div class="dev-topic-item ${isActive ? 'active' : ''}" onclick="openNota('${n.id}')">
      <div class="dev-topic-name">${escHtml(n.titulo || 'Sem título')}</div>
      <div class="dev-topic-date">${dataStr}</div>
      ${preview ? `<div class="dev-topic-preview">${escHtml(preview)}</div>` : ''}
    </div>`;
  }).join('');
}

function novoTema() {
  editingNotaId = null;
  document.getElementById('dev-empty').style.display = 'none';
  const editor = document.getElementById('dev-editor-content');
  editor.style.display = 'flex';
  document.getElementById('dev-titulo').value      = '';
  document.getElementById('dev-conteudo').innerHTML = '';
  document.getElementById('dev-data-edit').textContent = 'Novo tema';
  document.getElementById('dev-meta-text').textContent = '';
  document.getElementById('dev-titulo').focus();
  renderNotasSidebar();
}

function openNota(id) {
  const n = notasData.find(x => x.id === id);
  if (!n) return;
  editingNotaId = id;
  document.getElementById('dev-empty').style.display = 'none';
  const editor = document.getElementById('dev-editor-content');
  editor.style.display = 'flex';
  document.getElementById('dev-titulo').value       = n.titulo || '';
  document.getElementById('dev-conteudo').innerHTML  = n.conteudo || '';
  const dataStr = n.updated_at ? new Date(n.updated_at).toLocaleString('pt-BR') : '—';
  document.getElementById('dev-data-edit').textContent = `Editado em ${dataStr}`;
  document.getElementById('dev-meta-text').textContent = `Criado em ${n.created_at ? new Date(n.created_at).toLocaleDateString('pt-BR') : '—'}`;
  renderNotasSidebar();
}

async function saveNota() {
  const titulo   = document.getElementById('dev-titulo').value.trim() || 'Sem título';
  const conteudo = document.getElementById('dev-conteudo').innerHTML || '';
  const payload  = { titulo, conteudo, updated_at: new Date().toISOString(), user_id: currentUser?.id };
  const btn = document.querySelector('.dev-save-btn');
  btn.textContent = 'Salvando...'; btn.disabled = true;
  let error;
  if (editingNotaId) {
    ({ error } = await db.from('notas').update(payload).eq('id', editingNotaId));
  } else {
    const res = await db.from('notas').insert({ ...payload, created_at: new Date().toISOString() }).select().single();
    error = res.error;
    if (!error && res.data) editingNotaId = res.data.id;
  }
  btn.textContent = 'Salvar'; btn.disabled = false;
  if (error) { alert('Erro ao salvar: ' + error.message); return; }
  await loadNotas();
  document.getElementById('dev-data-edit').textContent = `Editado em ${new Date().toLocaleString('pt-BR')}`;
}

async function deleteNota() {
  if (!editingNotaId) return;
  if (!confirm('Remover este tema?')) return;
  const { error } = await db.from('notas').delete().eq('id', editingNotaId);
  if (error) { alert('Erro ao excluir: ' + error.message); return; }
  editingNotaId = null;
  document.getElementById('dev-editor-content').style.display = 'none';
  document.getElementById('dev-empty').style.display = 'flex';
  await loadNotas();
}

function fmtDev(cmd) { document.getElementById('dev-conteudo').focus(); document.execCommand(cmd, false, null); }

// ── NAVEGAÇÃO ────────────────────────────
function showTab(tabId, btnEl) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tabId)?.classList.add('active');
  if (btnEl) btnEl.classList.add('active');
  if (tabId === 'agenda')   renderCalendario();
  if (tabId === 'arquivos') loadPastas();
}

// ── HELPERS ──────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function getDiasRestantes(data, status) {
  if (status === 'concluido') return 'Encerrado';
  if (!data) return 'Sem data';
  const diff = Math.ceil((new Date(data + 'T00:00:00') - new Date()) / 86400000);
  if (diff < 0)  return `${Math.abs(diff)}d atrasado`;
  if (diff === 0) return 'Hoje!';
  if (diff === 1) return '1 dia';
  return `${diff} dias`;
}
function statusClass(s) { return { ativo:'s-ativo', andamento:'s-and', analise:'s-anal', concluido:'s-conc' }[s] || 's-ativo'; }
function statusLabel(s) { return { ativo:'Ativo', andamento:'Em andamento', analise:'Análise', concluido:'Concluído' }[s] || s; }

// ── ARQUIVOS ─────────────────────────────
let pastasData   = [];
let linksData    = [];
let pastaAtiva   = null;
let editingLinkId = null;
let selectedTipo  = 'drive';

const TIPO_EMOJI = { drive:'📄', pdf:'📋', sheet:'📊', ppt:'📑', link:'🔗' };

async function loadPastas() {
  const { data, error } = await db.from('pastas').select('*').order('created_at', { ascending: true });
  if (error) { console.error(error); return; }
  pastasData = data || [];
  renderPastasSidebar();
}

function renderPastasSidebar() {
  const lista = document.getElementById('pastas-lista');
  if (!lista) return;
  if (pastasData.length === 0) {
    lista.innerHTML = '<div style="padding:20px 14px;font-size:12px;color:#9AAAC0;text-align:center;font-weight:500">Nenhuma pasta ainda.<br>Clique em "+ Nova pasta".</div>';
    return;
  }
  lista.innerHTML = pastasData.map(p => {
    const count = linksData.filter(l => l.pasta_id === p.id).length;
    const isActive = p.id === pastaAtiva?.id;
    return `<div class="pasta-item ${isActive ? 'active' : ''}" onclick="selecionarPasta('${p.id}')">
      <span class="pasta-icon">📁</span>
      <div class="pasta-info">
        <div class="pasta-nome">${escHtml(p.nome)}</div>
        <div class="pasta-count">${count} ${count === 1 ? 'arquivo' : 'arquivos'}</div>
      </div>
    </div>`;
  }).join('');
}

async function selecionarPasta(id) {
  pastaAtiva = pastasData.find(p => p.id === id) || null;
  const { data } = await db.from('links').select('*').eq('pasta_id', id).order('created_at', { ascending: false });
  linksData = data || [];
  renderPastasSidebar();
  renderLinksLista();
  document.getElementById('pasta-empty').style.display = 'none';
  document.getElementById('pasta-editor').style.display = 'flex';
  document.getElementById('pasta-titulo-display').textContent = '📁 ' + (pastaAtiva?.nome || '');
  document.getElementById('search-links').value = '';
}

function renderLinksLista(filtro = '') {
  const lista = document.getElementById('links-lista');
  if (!lista) return;
  const items = filtro
    ? linksData.filter(l => l.nome.toLowerCase().includes(filtro.toLowerCase()) || (l.descricao||'').toLowerCase().includes(filtro.toLowerCase()))
    : linksData;
  if (items.length === 0) {
    lista.innerHTML = '<div class="links-empty"><div style="font-size:28px;opacity:0.2">🔗</div><div>Nenhum arquivo nesta pasta ainda</div></div>';
    return;
  }
  lista.innerHTML = items.map(l => {
    const emoji = TIPO_EMOJI[l.tipo] || '🔗';
    const data  = l.created_at ? new Date(l.created_at).toLocaleDateString('pt-BR') : '—';
    return `<div style="display:flex;align-items:center;gap:12px;background:#F5F7FC;border-radius:8px;padding:12px 14px;border:1.5px solid transparent;transition:background .1s;cursor:pointer" onmouseover="this.style.background='#EAF0FB'" onmouseout="this.style.background='#F5F7FC'" onclick="editarLink('${l.id}')">
      <div class="link-tipo ${l.tipo}" style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:8px;font-size:16px;flex-shrink:0">${emoji}</div>
      <div class="link-info">
        <div class="link-nome">${escHtml(l.nome)}</div>
        ${l.descricao ? `<div class="link-desc-text">${escHtml(l.descricao)}</div>` : ''}
      </div>
      <div class="link-data">${data}</div>
      <a href="${escHtml(l.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="font-size:16px;color:#9AAAC0;text-decoration:none;flex-shrink:0">↗</a>
    </div>`;
  }).join('');
}

function filtrarLinks() {
  const q = document.getElementById('search-links').value;
  renderLinksLista(q);
}

async function novaPasta() {
  const nome = prompt('Nome da nova pasta:');
  if (!nome?.trim()) return;
  const { error } = await db.from('pastas').insert({ nome: nome.trim(), user_id: currentUser?.id });
  if (error) { alert('Erro: ' + error.message); return; }
  await loadPastas();
}

async function renomearPasta() {
  if (!pastaAtiva) return;
  const nome = prompt('Novo nome:', pastaAtiva.nome);
  if (!nome?.trim()) return;
  const { error } = await db.from('pastas').update({ nome: nome.trim() }).eq('id', pastaAtiva.id);
  if (error) { alert('Erro: ' + error.message); return; }
  pastaAtiva.nome = nome.trim();
  await loadPastas();
  document.getElementById('pasta-titulo-display').textContent = '📁 ' + nome.trim();
}

async function deletarPasta() {
  if (!pastaAtiva) return;
  if (!confirm(`Excluir a pasta "${pastaAtiva.nome}" e todos os seus links?`)) return;
  await db.from('links').delete().eq('pasta_id', pastaAtiva.id);
  const { error } = await db.from('pastas').delete().eq('id', pastaAtiva.id);
  if (error) { alert('Erro: ' + error.message); return; }
  pastaAtiva = null;
  linksData  = [];
  document.getElementById('pasta-editor').style.display = 'none';
  document.getElementById('pasta-empty').style.display  = 'flex';
  await loadPastas();
}

// MODAL LINK
function abrirModalLink() {
  editingLinkId = null;
  selectedTipo  = 'drive';
  document.getElementById('link-nome').value = '';
  document.getElementById('link-url').value  = '';
  document.getElementById('link-desc').value = '';
  document.getElementById('modal-link-title').textContent = 'Adicionar link';
  document.getElementById('btn-del-link').style.display   = 'none';
  document.querySelectorAll('[data-tipo]').forEach(p => p.classList.toggle('active', p.dataset.tipo === 'drive'));
  document.getElementById('modal-link-overlay').style.display = 'flex';
}

function editarLink(id) {
  const l = linksData.find(x => x.id === id);
  if (!l) return;
  editingLinkId = id;
  selectedTipo  = l.tipo || 'drive';
  document.getElementById('link-nome').value = l.nome || '';
  document.getElementById('link-url').value  = l.url  || '';
  document.getElementById('link-desc').value = l.descricao || '';
  document.getElementById('modal-link-title').textContent = 'Editar link';
  document.getElementById('btn-del-link').style.display   = 'inline-block';
  document.querySelectorAll('[data-tipo]').forEach(p => p.classList.toggle('active', p.dataset.tipo === selectedTipo));
  document.getElementById('modal-link-overlay').style.display = 'flex';
}

function closeModalLink() { document.getElementById('modal-link-overlay').style.display = 'none'; editingLinkId = null; }
function closeModalLinkOutside(e) { if (e.target === document.getElementById('modal-link-overlay')) closeModalLink(); }

function selectTipo(el) {
  selectedTipo = el.dataset.tipo;
  document.querySelectorAll('[data-tipo]').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
}

async function saveLink() {
  const nome = document.getElementById('link-nome').value.trim();
  const url  = document.getElementById('link-url').value.trim();
  if (!nome) { alert('Preencha o nome.'); return; }
  if (!url)  { alert('Preencha a URL.'); return; }
  const payload = { nome, url, descricao: document.getElementById('link-desc').value.trim(), tipo: selectedTipo, pasta_id: pastaAtiva?.id, user_id: currentUser?.id };
  const btn = document.querySelector('#modal-link-overlay .btn-save');
  btn.textContent = 'Salvando...'; btn.disabled = true;
  let error;
  if (editingLinkId) { ({ error } = await db.from('links').update(payload).eq('id', editingLinkId)); }
  else               { ({ error } = await db.from('links').insert(payload)); }
  btn.textContent = 'Salvar'; btn.disabled = false;
  if (error) { alert('Erro: ' + error.message); return; }
  closeModalLink();
  await selecionarPasta(pastaAtiva.id);
  renderPastasSidebar();
}

async function deleteLink() {
  if (!editingLinkId) return;
  if (!confirm('Remover este link?')) return;
  const { error } = await db.from('links').delete().eq('id', editingLinkId);
  if (error) { alert('Erro: ' + error.message); return; }
  closeModalLink();
  await selecionarPasta(pastaAtiva.id);
  renderPastasSidebar();
}
