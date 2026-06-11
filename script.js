/* ─── ICONS ───────────────────────────────────────────────── */
const ICON_DOC = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

const ICON_DOWNLOAD = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/* ─── STATE ───────────────────────────────────────────────── */
let datosGlobal = [];

const $ = id => document.getElementById(id);
const loader      = $('loader');
const catalogo    = $('catalogo');
const errorState  = $('error-state');
const emptyState  = $('empty-state');
const statusBar   = $('status-bar');
const resultCount = $('result-count');
const docCount    = $('doc-count');

/* ─── INIT ────────────────────────────────────────────────── */
fetch('catalogo.json')
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then(data => {
    loader.classList.add('hidden');
    datosGlobal = Array.isArray(data) ? data : (data.data || []);

    if (datosGlobal.length === 0) {
      showError();
      return;
    }

    const productos = agrupar(datosGlobal);
    docCount.textContent = Object.keys(productos).length;
    renderCatalogo(productos);
  })
  .catch(err => {
    console.error('Error cargando catálogo:', err);
    loader.classList.add('hidden');
    errorState.classList.remove('hidden');
  });

/* ─── AGRUPAR ─────────────────────────────────────────────── */
function agrupar(data) {
  const productos = {};

  data.forEach(item => {
    const key = (item.producto || 'SIN NOMBRE').trim().toUpperCase();

    if (!productos[key]) {
      productos[key] = {
        nombre: (item.producto || 'SIN NOMBRE').trim(),
        hoja: null,
        panfleto: null
      };
    }

    const tipo = (item.tipo || '').toLowerCase();
    if (tipo.includes('hoja'))     productos[key].hoja     = item;
    if (tipo.includes('panfleto')) productos[key].panfleto = item;
  });

  return productos;
}

/* ─── RENDER ──────────────────────────────────────────────── */
function renderCatalogo(productos) {
  catalogo.innerHTML = '';
  emptyState.classList.add('hidden');

  const entries = Object.values(productos).filter(p => p.hoja || p.panfleto);

  if (entries.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  // Ordenar alfabéticamente
  entries.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const fragment = document.createDocumentFragment();

  entries.forEach(prod => {
    const card = document.createElement('div');
    card.className = 'card';

    card.innerHTML = `
      <div class="card-header">
        <div class="card-icon">${ICON_DOC}</div>
        <div class="card-title">${escapeHtml(prod.nombre)}</div>
      </div>
      <div class="btn-group"></div>
    `;

    const grupo = card.querySelector('.btn-group');

    if (prod.hoja?.url) {
      grupo.appendChild(crearBoton(
        'Hoja de Seguridad',
        'hoja',
        prod.hoja.url,
        prod.hoja.nombre || prod.nombre + ' - HDS.pdf'
      ));
    }

    if (prod.panfleto?.url) {
      grupo.appendChild(crearBoton(
        'Panfleto técnico',
        'panfleto',
        prod.panfleto.url,
        prod.panfleto.nombre || prod.nombre + ' - Panfleto.pdf'
      ));
    }

    fragment.appendChild(card);
  });

  catalogo.appendChild(fragment);
}

/* ─── CREAR BOTÓN ─────────────────────────────────────────── */
function crearBoton(texto, clase, url, nombre) {
  const a = document.createElement('a');
  a.className = `boton ${clase}`;
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.download = nombre;

  a.innerHTML = `
    <span class="boton-inner">
      ${ICON_DOWNLOAD}
      ${escapeHtml(texto)}
    </span>
    <span class="boton-arrow">↗</span>
  `;

  return a;
}

/* ─── BÚSQUEDA ────────────────────────────────────────────── */
$('buscar').addEventListener('input', function () {
  const termino = this.value.trim();
  const texto   = termino.toLowerCase();

  if (!texto) {
    statusBar.classList.add('hidden');
    const productos = agrupar(datosGlobal);
    docCount.textContent = Object.keys(productos).length;
    renderCatalogo(productos);
    return;
  }

  const filtrados = datosGlobal.filter(item =>
    (item.producto || '').toLowerCase().includes(texto)
  );

  const productos = agrupar(filtrados);
  const n = Object.keys(productos).length;

  docCount.textContent = n;
  statusBar.classList.remove('hidden');
  resultCount.textContent = `${n} resultado${n !== 1 ? 's' : ''} para "${termino}"`;
  $('empty-term').textContent = termino;

  renderCatalogo(productos);
});

$('buscar').addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    this.value = '';
    this.dispatchEvent(new Event('input'));
    this.blur();
  }
});

$('clear-search').addEventListener('click', () => {
  $('buscar').value = '';
  $('buscar').dispatchEvent(new Event('input'));
});

/* ─── HELPERS ─────────────────────────────────────────────── */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showError() {
  errorState.classList.remove('hidden');
}
