:root {
      --green:     #2a7a3b;
      --green-dk:  #1e5c2c;
      --green-lt:  #e8f4ea;
      --green-mid: #c8e6cc;
      --black:     #111a11;
      --white:     #ffffff;
      --bg:        #f4f6f4;
      --surface:   #ffffff;
      --border:    #d8e4d8;
      --text:      #111a11;
      --text-sub:  #5a7060;
      --red:       #c0392b;
      --red-lt:    #fdf0ef;
      --r: 10px; --r-sm: 6px;
      --font-display: 'Barlow Condensed', sans-serif;
      --font-body: 'Inter', sans-serif;
    }
<<<<<<< HEAD
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
  const fichas    = catalogData.filter(i => i.tipo === 'ficha').length;
  $('st-total').textContent     = productos.size;
  $('st-hojas').textContent     = hojas;
  $('st-panfletos').textContent = panfletos;
  $('st-fichas').textContent    = fichas;
}

/* Etiquetas legibles por tipo de documento */
const TIPO_LABELS = {
  hoja: 'Hoja',
  panfleto: 'Panfleto',
  ficha: 'Ficha Técnica'
};

/* ─── LISTA CATÁLOGO ─────────────────────────────────────── */
function renderLista(data) {
  const list = $('cat-list');

  // Agrupar por producto, manteniendo cada documento individual
  const productos = {};
  data.forEach(item => {
    const k = item.producto.toUpperCase();
    if (!productos[k]) productos[k] = { nombre: item.producto, docs: [] };
    productos[k].docs.push(item);
  });

  const entries = Object.values(productos).sort((a,b) => a.nombre.localeCompare(b.nombre, 'es'));

  if (entries.length === 0) {
    list.innerHTML = '<div class="empty">Sin resultados</div>';
    return;
  }

  list.innerHTML = entries.map(p => `
    <div class="cat-item">
      <div class="cat-item-name">${escHtml(p.nombre)}</div>
      <div class="cat-item-docs">
        ${p.docs.map(d => `
          <div class="doc-row">
            <span class="tag ${escHtml(d.tipo)}">${escHtml(TIPO_LABELS[d.tipo] || d.tipo)}</span>
            <span class="doc-file" title="${escHtml(d.nombre)}">${escHtml(d.nombre)}</span>
            <button class="btn-del" data-producto="${escHtml(d.producto)}" data-tipo="${escHtml(d.tipo)}" data-nombre="${escHtml(d.nombre)}">Eliminar</button>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

// Delegación de eventos para los botones de eliminar (evita problemas
// con comillas/caracteres especiales en nombres de producto o archivo)
document.addEventListener('DOMContentLoaded', () => {
  $('cat-list').addEventListener('click', e => {
    const btn = e.target.closest('.btn-del');
    if (!btn) return;
    eliminarDocumento(btn.dataset.producto, btn.dataset.tipo, btn.dataset.nombre);
  });
});

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
=======
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-body);
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      -webkit-font-smoothing: antialiased;
>>>>>>> cf8195b3ebbee340fec5d48e9fdef77aa2cd676e
    }

    /* ── HEADER ── */
    header {
      background: var(--black);
      border-bottom: 3px solid var(--green);
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .logo-badge {
      background: var(--green);
      color: var(--white);
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.1em;
      padding: 5px 12px;
      border-radius: var(--r-sm);
    }
    .brand-text { display: flex; flex-direction: column; line-height: 1.2; }
    .brand-name { font-family: var(--font-display); font-size: 17px; font-weight: 700; color: var(--white); }
    .brand-sub  { font-size: 11px; color: var(--green-mid); text-transform: uppercase; letter-spacing: 0.07em; }
    .header-right { display: flex; align-items: center; gap: 10px; }
    .btn-logout {
      background: none; border: 1px solid #444; color: #aaa;
      padding: 6px 12px; border-radius: var(--r-sm); cursor: pointer;
      font-size: 12px; font-family: var(--font-body); transition: all 0.15s;
    }
    .btn-logout:hover { border-color: var(--red); color: var(--red); }
    #user-info { font-size: 12px; color: var(--green-mid); }

    /* ── MAIN ── */
    main { flex: 1; max-width: 960px; width: 100%; margin: 0 auto; padding: 32px 24px; }

    /* ── LOGIN ── */
    #login-screen {
      max-width: 460px; margin: 60px auto;
      background: var(--surface);
      border: 1.5px solid var(--border);
      border-radius: var(--r);
      padding: 40px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }
    #login-screen h2 {
      font-family: var(--font-display);
      font-size: 26px; font-weight: 700;
      margin-bottom: 6px;
    }
    #login-screen p { font-size: 13px; color: var(--text-sub); margin-bottom: 28px; line-height: 1.5; }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    .field label { font-size: 13px; font-weight: 500; color: var(--text); }
    .field input, .field select {
      padding: 11px 14px;
      border: 1.5px solid var(--border);
      border-radius: var(--r-sm);
      font-family: var(--font-body);
      font-size: 14px;
      color: var(--text);
      background: var(--white);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .field input:focus, .field select:focus {
      border-color: var(--green);
      box-shadow: 0 0 0 3px rgba(42,122,59,0.12);
    }
    .field .hint { font-size: 11px; color: var(--text-sub); }
    .field .hint a { color: var(--green); text-decoration: none; }

    /* ── BUTTONS ── */
    .btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 10px 18px; border-radius: var(--r-sm);
      font-family: var(--font-body); font-size: 14px; font-weight: 500;
      cursor: pointer; border: none; transition: all 0.15s;
    }
    .btn-primary { background: var(--green); color: var(--white); width: 100%; justify-content: center; }
    .btn-primary:hover { background: var(--green-dk); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-danger  { background: var(--red-lt); color: var(--red); border: 1px solid #f5c6c2; }
    .btn-danger:hover  { background: var(--red); color: var(--white); }
    .btn-ghost { background: none; border: 1.5px solid var(--border); color: var(--text-sub); }
    .btn-ghost:hover { border-color: var(--green); color: var(--green); }

    /* ── ADMIN PANEL ── */
    #admin-panel { display: none; }
    .panel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
    @media (max-width: 700px) { .panel-grid { grid-template-columns: 1fr; } }

    /* ── CARDS ── */
    .card {
      background: var(--surface); border: 1.5px solid var(--border);
      border-radius: var(--r); padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .card h3 {
      font-family: var(--font-display); font-size: 20px; font-weight: 700;
      margin-bottom: 18px; display: flex; align-items: center; gap: 8px;
    }
    .card h3 .pill {
      font-family: var(--font-body); font-size: 11px; font-weight: 500;
      background: var(--green-lt); color: var(--green); padding: 2px 8px;
      border-radius: 20px; letter-spacing: 0.03em;
    }

    /* ── UPLOAD ZONE ── */
    .upload-zone {
      border: 2px dashed var(--border);
      border-radius: var(--r-sm);
      padding: 28px 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.15s;
      margin-bottom: 14px;
      background: var(--bg);
    }
    .upload-zone:hover, .upload-zone.drag-over {
      border-color: var(--green);
      background: var(--green-lt);
    }
    .upload-zone input { display: none; }
    .upload-zone .icon { font-size: 28px; margin-bottom: 8px; }
    .upload-zone p { font-size: 13px; color: var(--text-sub); }
    .upload-zone .file-name {
      font-size: 13px; font-weight: 500; color: var(--green);
      margin-top: 6px;
    }

    /* ── PROGRESS ── */
    .progress-wrap { margin-top: 12px; display: none; }
    .progress-bar {
      height: 6px; background: var(--border); border-radius: 3px; overflow: hidden;
    }
    .progress-fill {
      height: 100%; background: var(--green);
      width: 0%; transition: width 0.3s;
      border-radius: 3px;
    }
    .progress-label { font-size: 12px; color: var(--text-sub); margin-top: 6px; }

    /* ── CATALOG LIST ── */
    .cat-search {
      width: 100%; padding: 9px 12px;
      border: 1.5px solid var(--border); border-radius: var(--r-sm);
      font-family: var(--font-body); font-size: 13px;
      outline: none; margin-bottom: 14px;
      transition: border-color 0.15s;
    }
    .cat-search:focus { border-color: var(--green); }

    .cat-list { display: flex; flex-direction: column; gap: 8px; max-height: 480px; overflow-y: auto; }
    .cat-item {
      padding: 10px 12px; border-radius: var(--r-sm);
      background: var(--bg); border: 1px solid var(--border);
    }
    .cat-item-name {
      font-size: 13px; font-weight: 600; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; margin-bottom: 8px;
    }
    .cat-item-docs { display: flex; flex-direction: column; gap: 6px; }
    .doc-row {
      display: flex; align-items: center; gap: 8px;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r-sm); padding: 6px 8px;
    }
    .doc-file {
      flex: 1; min-width: 0; font-size: 12px; color: var(--text-sub);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .tag {
      font-size: 10px; font-weight: 500; padding: 2px 7px; flex-shrink: 0;
      border-radius: 20px; text-transform: uppercase; letter-spacing: 0.04em;
    }
    .tag.hoja { background: var(--green-lt); color: var(--green); }
    .tag.panfleto { background: #111a11; color: #c8e6cc; }
    .tag.ficha { background: #fff4d9; color: #8a6210; }
    .btn-del {
      background: none; border: 1px solid #f5c6c2; color: var(--red);
      padding: 4px 10px; border-radius: var(--r-sm); font-size: 12px;
      cursor: pointer; font-family: var(--font-body); transition: all 0.15s;
      flex-shrink: 0;
    }
    .btn-del:hover { background: var(--red); color: white; }

    /* ── TOAST ── */
    #toast {
      position: fixed; bottom: 24px; right: 24px;
      padding: 12px 18px; border-radius: var(--r-sm);
      font-size: 13px; font-weight: 500;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      transform: translateY(80px); opacity: 0;
      transition: all 0.25s; z-index: 100;
    }
    #toast.show { transform: translateY(0); opacity: 1; }
    #toast.success { background: var(--green); color: white; }
    #toast.error   { background: var(--red); color: white; }

    /* ── STATS BAR ── */
    .stats {
      display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
    }
    .stat {
      background: var(--surface); border: 1.5px solid var(--border);
      border-radius: var(--r); padding: 14px 20px; flex: 1; min-width: 120px;
    }
    .stat-val { font-family: var(--font-display); font-size: 28px; font-weight: 700; color: var(--green); line-height: 1; }
    .stat-lbl { font-size: 11px; color: var(--text-sub); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 3px; }

    /* ── EMPTY ── */
    .empty { text-align: center; padding: 30px; color: var(--text-sub); font-size: 13px; }

<<<<<<< HEAD
/* ─── ELIMINAR (documento individual) ────────────────────── */
async function eliminarDocumento(producto, tipo, nombre) {
  const tipoLabel = TIPO_LABELS[tipo] || tipo;

  if (!confirm(`¿Eliminar "${nombre}" (${tipoLabel}) de "${producto}"?\n\nNota: el archivo PDF en el repositorio NO se elimina, solo se quita del catálogo.`)) return;

  try {
    const catRes = await gh(`/repos/${OWNER}/${REPO}/contents/${CATALOG}?ref=${BRANCH}`);
    if (!catRes.ok) throw new Error('No se pudo leer catalogo.json');
    const catFile = await catRes.json();

    // Elimina solo la entrada que coincide exactamente en producto + tipo + nombre de archivo
    const updatedData = catalogData.filter(i =>
      !(
        i.producto.toUpperCase() === producto.toUpperCase() &&
        i.tipo === tipo &&
        i.nombre === nombre
      )
    );

    if (updatedData.length === catalogData.length) {
      throw new Error('No se encontró el documento a eliminar');
    }

    const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(updatedData, null, 2))));

    const commitRes = await gh(`/repos/${OWNER}/${REPO}/contents/${CATALOG}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Eliminar documento: ${nombre} (${producto} · ${tipo})`,
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
=======
    /* ── FOOTER ── */
    footer {
      background: var(--black); border-top: 2px solid var(--green);
      padding: 14px 24px; text-align: center;
      font-size: 12px; color: #7a9a80;
    }
    footer a { color: var(--green-mid); text-decoration: none; }
>>>>>>> cf8195b3ebbee340fec5d48e9fdef77aa2cd676e
