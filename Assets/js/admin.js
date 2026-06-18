/* ─── CONFIG ────────────────────────────────────────────── */
const OWNER   = 'FelixOb1990';
const REPO    = 'Docuentacion-Tecnica';
const BRANCH  = 'main';
const CATALOG = 'catalogo.json';
const RELEASE_TAG = 'v1.0';   // tag del release donde se suben los PDFs

/* ─── STATE ─────────────────────────────────────────────── */
let token = '';
let catalogData = [];
let selectedFile = null;

/* ─── HELPERS ───────────────────────────────────────────── */
const $  = id => document.getElementById(id);
const gh = (path, opts = {}) =>
  fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.headers || {})
    }
  });

function toast(msg, type = 'success') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `show ${type}`;
  setTimeout(() => t.className = '', 3000);
}

function setProgress(pct, label) {
  $('progress-fill').style.width = pct + '%';
  $('progress-label').textContent = label;
}

/* ─── LOGIN ─────────────────────────────────────────────── */
async function login() {
  token = $('token-input').value.trim();
  if (!token) return;

  const btn = $('btn-login');
  btn.disabled = true;
  btn.textContent = 'Verificando...';
  $('login-error').style.display = 'none';

  try {
    const res = await gh(`/repos/${OWNER}/${REPO}`);
    if (!res.ok) throw new Error('Token inválido o sin acceso al repo');
    const data = await res.json();

    // Save token in sessionStorage (cleared when tab closes)
    sessionStorage.setItem('gh_token', token);

    $('login-screen').style.display  = 'none';
    $('admin-panel').style.display   = 'block';
    $('btn-logout').style.display    = 'inline-flex';
    $('user-info').textContent       = `📂 ${data.full_name}`;

    await cargarCatalogo();
  } catch (e) {
    $('login-error').textContent = e.message;
    $('login-error').style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Ingresar';
    token = '';
  }
}

function logout() {
  sessionStorage.removeItem('gh_token');
  location.reload();
}

// Auto-login if token saved in session
window.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('gh_token');
  if (saved) {
    $('token-input').value = saved;
    login();
  }

  $('token-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
  });
});

/* ─── CARGAR CATÁLOGO ────────────────────────────────────── */
async function cargarCatalogo() {
  try {
    const res = await gh(`/repos/${OWNER}/${REPO}/contents/${CATALOG}?ref=${BRANCH}`);
    if (!res.ok) throw new Error('No se encontró catalogo.json');
    const data = await res.json();
    catalogData = JSON.parse(atob(data.content.replace(/\n/g, '')));
    renderStats();
    renderLista(catalogData);
  } catch (e) {
    toast('Error cargando catálogo: ' + e.message, 'error');
  }
}

/* ─── ESTADÍSTICAS ───────────────────────────────────────── */
function renderStats() {
  const productos = new Set(catalogData.map(i => i.producto.toUpperCase()));
  const hojas     = catalogData.filter(i => i.tipo === 'hoja').length;
  const panfletos = catalogData.filter(i => i.tipo === 'panfleto').length;
  $('st-total').textContent     = productos.size;
  $('st-hojas').textContent     = hojas;
  $('st-panfletos').textContent = panfletos;
}

/* ─── LISTA CATÁLOGO ─────────────────────────────────────── */
function renderLista(data) {
  const list = $('cat-list');

  // Agrupar por producto
  const productos = {};
  data.forEach(item => {
    const k = item.producto.toUpperCase();
    if (!productos[k]) productos[k] = { nombre: item.producto, hojas: [], panfletos: [] };
    if (item.tipo === 'hoja')     productos[k].hojas.push(item);
    if (item.tipo === 'panfleto') productos[k].panfletos.push(item);
  });

  const entries = Object.values(productos).sort((a,b) => a.nombre.localeCompare(b.nombre, 'es'));

  if (entries.length === 0) {
    list.innerHTML = '<div class="empty">Sin resultados</div>';
    return;
  }

  list.innerHTML = entries.map(p => `
    <div class="cat-item">
      <div class="cat-item-info">
        <div class="cat-item-name">${escHtml(p.nombre)}</div>
        <div class="cat-item-type">
          ${p.hojas.length    ? '<span class="tag hoja">Hoja</span>'         : ''}
          ${p.panfletos.length ? '<span class="tag panfleto">Panfleto</span>' : ''}
        </div>
      </div>
      <div class="cat-item-actions">
        <button class="btn-del" onclick="eliminarProducto('${escHtml(p.nombre)}')">Eliminar</button>
      </div>
    </div>
  `).join('');
}

function filtrarLista() {
  const q = $('cat-search').value.toLowerCase();
  const filtrado = catalogData.filter(i => i.producto.toLowerCase().includes(q));
  renderLista(filtrado);
}

/* ─── ARCHIVO ────────────────────────────────────────────── */
function onFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  selectedFile = file;
  $('file-name-label').textContent = file.name;
  $('btn-upload').disabled = false;
}

function handleDrop(e) {
  e.preventDefault();
  $('upload-zone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') {
    selectedFile = file;
    $('file-name-label').textContent = file.name;
    $('btn-upload').disabled = false;
  }
}

/* ─── SUBIR DOCUMENTO (CORREGIDO SIN CORS) ───────────────── */
async function subirDocumento() {
  const producto = $('f-producto').value.trim();
  const tipo     = $('f-tipo').value;

  if (!producto) {
    toast('Escribí el nombre del producto', 'error');
    return;
  }

  if (!selectedFile) {
    toast('Seleccioná un archivo PDF', 'error');
    return;
  }

  const btn = $('btn-upload');
  btn.disabled = true;
  $('progress-wrap').style.display = 'block';

  try {
    /* 1. Convertir archivo a base64 */
    setProgress(10, 'Leyendo archivo...');
    const base64 = await fileToBase64(selectedFile);

    /* 2. Nombre seguro del archivo */
    const safeName = selectedFile.name
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9.\-_]/g, '');

    const path = `uploads/${safeName}`;

    /* 3. Verificar si ya existe */
    setProgress(25, 'Verificando archivo...');
    let existingSha = null;

    const checkRes = await gh(`/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`);
    if (checkRes.ok) {
      const existing = await checkRes.json();
      existingSha = existing.sha;
    }

    /* 4. Subir archivo al repo */
    setProgress(50, existingSha ? 'Actualizando archivo...' : 'Subiendo archivo...');

    const uploadRes = await gh(`/repos/${OWNER}/${REPO}/contents/${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: existingSha
          ? `Actualizar archivo: ${safeName}`
          : `Subir archivo: ${safeName}`,
        content: base64,
        sha: existingSha || undefined,
        branch: BRANCH
      })
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      throw new Error('Error subiendo archivo: ' + (err.message || uploadRes.status));
    }

    /* 5. URL pública */
    const fileUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/uploads/${encodeURIComponent(safeName)}`;

    /* 6. Obtener catalogo */
    setProgress(70, 'Actualizando catálogo...');
    const catRes = await gh(`/repos/${OWNER}/${REPO}/contents/${CATALOG}?ref=${BRANCH}`);
    if (!catRes.ok) throw new Error('No se pudo leer catalogo.json');

    const catFile = await catRes.json();

    /* 7. Crear entrada */
    const newEntry = {
      producto: producto,
      tipo: tipo,
      nombre: safeName,
      url: fileUrl
    };

    /* 8. Evitar duplicados exactos */
    const exists = catalogData.some(i =>
      i.producto.toLowerCase() === producto.toLowerCase() &&
      i.tipo === tipo &&
      i.nombre === safeName
    );

    if (exists) {
      throw new Error('Este documento ya existe en el catálogo');
    }

    const updatedData = [...catalogData, newEntry];

    const newContent = btoa(
      unescape(encodeURIComponent(JSON.stringify(updatedData, null, 2)))
    );

    /* 9. Guardar catalogo */
    const commitRes = await gh(`/repos/${OWNER}/${REPO}/contents/${CATALOG}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Agregar ${tipo}: ${producto} (${safeName})`,
        content: newContent,
        sha: catFile.sha,
        branch: BRANCH
      })
    });

    if (!commitRes.ok) {
      throw new Error('Error actualizando catálogo');
    }

    /* 10. UI update */
    setProgress(100, '¡Listo!');

    catalogData = updatedData;
    renderStats();
    renderLista(catalogData);

    toast(`✓ "${producto}" agregado correctamente`);

    /* Reset */
    setTimeout(() => {
      $('f-producto').value = '';
      selectedFile = null;
      $('f-file').value = '';
      $('file-name-label').textContent = '';
      $('btn-upload').disabled = true;
      $('progress-wrap').style.display = 'none';
      setProgress(0, '');
    }, 1500);

  } catch (e) {
    toast(e.message, 'error');
    $('progress-wrap').style.display = 'none';
    btn.disabled = false;
  }
}

/* ─── ELIMINAR ───────────────────────────────────────────── */
async function eliminarProducto(nombre) {
  if (!confirm(`¿Eliminar todas las entradas de "${nombre}" del catálogo?\n\nNota: el archivo PDF en el release NO se elimina.`)) return;

  try {
    const catRes = await gh(`/repos/${OWNER}/${REPO}/contents/${CATALOG}?ref=${BRANCH}`);
    const catFile = await catRes.json();

    const updatedData = catalogData.filter(i =>
      i.producto.toUpperCase() !== nombre.toUpperCase()
    );

    const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(updatedData, null, 2))));

    const commitRes = await gh(`/repos/${OWNER}/${REPO}/contents/${CATALOG}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Eliminar producto: ${nombre}`,
        content: newContent,
        sha: catFile.sha,
        branch: BRANCH
      })
    });

    if (!commitRes.ok) throw new Error('Error al eliminar');

    catalogData = updatedData;
    renderStats();
    renderLista(catalogData);
    toast(`"${nombre}" eliminado del catálogo`);
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

/* ─── UTILS ──────────────────────────────────────────────── */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}