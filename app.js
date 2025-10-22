import { produtos } from './data.js';

// Utilitários
const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));
const formatBRL = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const YEAR = new Date().getFullYear();

// Estado simples (persistência em localStorage)
const CART_KEY = 'minha-loja:carrinho';
const PROD_KEY = 'minha-loja:produtos'; // produtos adicionados pelo usuário
const loadCart = () => {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; } catch { return {}; }
};
const saveCart = (cart) => localStorage.setItem(CART_KEY, JSON.stringify(cart));
let carrinho = loadCart();

// Store de produtos (mock + adicionados pelo usuário)
const loadUserProducts = () => {
  try { return JSON.parse(localStorage.getItem(PROD_KEY)) || []; } catch { return []; }
};
const saveUserProducts = (arr) => localStorage.setItem(PROD_KEY, JSON.stringify(arr));
function allProducts(){
  // Evita ids duplicados: se usuário cadastrar com id existente (não expomos id no form), geramos outro id
  return [...produtos, ...loadUserProducts()];
}
function addUserProduct(data){
  const arr = loadUserProducts();
  const id = genId(data.nome);
  const novo = { id, ...data };
  arr.push(novo);
  saveUserProducts(arr);
  return novo;
}
function genId(nome='item'){
  return (
    (nome || 'item')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/(^-|-$)/g,'')
  ) + '-' + Math.random().toString(36).slice(2,8);
}
function exportAllProducts(){
  const data = JSON.stringify(allProducts(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'produtos.json';
  a.click();
  URL.revokeObjectURL(url);
}
async function importUserProducts(file, { mode = 'replace' } = {}){
  const text = await file.text();
  const arr = JSON.parse(text);
  if (!Array.isArray(arr)) throw new Error('JSON inválido: esperado array');
  const sanitized = arr.map(p => ({
    id: p.id || genId(p.nome || 'item'),
    nome: String(p.nome || '').slice(0,120),
    preco: Number(p.preco || 0),
    descricao: String(p.descricao || ''),
    imagem: String(p.imagem || ''),
    categoria: String(p.categoria || 'Outros')
  }));
  if (mode === 'replace'){
    // Guarda somente na área de usuário; produtos mock permanecem separados
    saveUserProducts(sanitized);
  } else {
    const current = loadUserProducts();
    // mescla por id (sobrescreve existentes)
    const map = new Map(current.map(x=>[x.id,x]));
    sanitized.forEach(x=> map.set(x.id, x));
    saveUserProducts(Array.from(map.values()));
  }
}

// Header: badge de quantidade
function updateCartBadge(){
  const count = Object.values(carrinho).reduce((acc, c) => acc + c.qty, 0);
  const el = $('#cart-count');
  if (el) el.textContent = count;
}

// Componentes
function ProductCard(p){
  const wrap = document.createElement('div');
  wrap.className = 'card';
  wrap.innerHTML = `
    <img src="${p.imagem}" alt="${p.nome}" loading="lazy" onerror="this.style.display='none'" />
    <div class="card-body">
      <h3 class="card-title">${p.nome}</h3>
      <div class="card-desc">${p.descricao}</div>
      <div class="card-price">${formatBRL(p.preco)}</div>
      <div class="card-actions">
        <button class="btn add">Adicionar</button>
        <button class="btn btn-ghost detalhes">Detalhes</button>
      </div>
    </div>
  `;
  $('.add', wrap).addEventListener('click', () => addToCart(p.id));
  $('.detalhes', wrap).addEventListener('click', () => navigateTo(`#/produto/${p.id}`));
  return wrap;
}

function Header(title, actions=''){
  const div = document.createElement('div');
  div.className = 'toolbar';
  div.innerHTML = `<h2 style="margin:0">${title}</h2>${actions}`;
  return div;
}

// Carrinho
function addToCart(id){
  const item = carrinho[id] || { id, qty: 0 };
  item.qty += 1;
  carrinho[id] = item;
  saveCart(carrinho);
  updateCartBadge();
  // feedback sutil
  const btn = document.activeElement;
  if (btn) { btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(1)' }], { duration: 220 }); }
}
function removeFromCart(id){
  if (!carrinho[id]) return;
  carrinho[id].qty -= 1;
  if (carrinho[id].qty <= 0) delete carrinho[id];
  saveCart(carrinho);
  updateCartBadge();
  render();
}
function deleteFromCart(id){
  delete carrinho[id];
  saveCart(carrinho);
  updateCartBadge();
  render();
}

// Views
function HomeView(){
  const el = document.createElement('div');

  // Toolbar com busca
  const toolbar = Header('Todos os produtos', `
    <div class="search">
      <input id="search-home" type="search" placeholder="Buscar produtos" />
      <select id="cat-home">
        <option value="">Todas categorias</option>
        ${[...new Set(allProducts().map(p=>p.categoria))].map(c=>`<option>${c}</option>`).join('')}
      </select>
    </div>
  `);

  const grid = document.createElement('div');
  grid.className = 'grid';

  function applyFilter(){
    const shValEl = $('#search-home', toolbar);
    const chValEl = $('#cat-home', toolbar);
    const q = (shValEl && shValEl.value ? shValEl.value : '').toLowerCase();
    const cat = (chValEl && chValEl.value ? chValEl.value : '').toLowerCase();
    grid.innerHTML = '';
    allProducts()
      .filter(p => (!q || `${p.nome} ${p.descricao}`.toLowerCase().includes(q)))
      .filter(p => (!cat || (p.categoria || '').toLowerCase() === cat))
      .forEach(p => grid.appendChild(ProductCard(p)));
  }

  const sh = $('#search-home', toolbar);
  const ch = $('#cat-home', toolbar);
  if (sh) sh.addEventListener('input', applyFilter);
  if (ch) ch.addEventListener('change', applyFilter);

  el.appendChild(toolbar);
  el.appendChild(grid);
  applyFilter();
  return el;
}

function ProdutosView(){
  const el = document.createElement('div');

  // Pesquisar/filtrar
  const toolbar = Header('Produtos', `
    <div class="search">
      <input id="search" type="search" placeholder="Buscar produtos" />
      <select id="cat">
        <option value="">Todas categorias</option>
        ${[...new Set(produtos.map(p=>p.categoria))].map(c=>`<option>${c}</option>`).join('')}
      </select>
    </div>
  `);

  const grid = document.createElement('div');
  grid.className = 'grid';

  function applyFilter(){
    const siValEl = $('#search', toolbar);
    const scValEl = $('#cat', toolbar);
    const q = (siValEl && siValEl.value ? siValEl.value : '').toLowerCase();
    const cat = (scValEl && scValEl.value ? scValEl.value : '').toLowerCase();
    grid.innerHTML = '';
    allProducts()
      .filter(p => (!q || `${p.nome} ${p.descricao}`.toLowerCase().includes(q)))
      .filter(p => (!cat || p.categoria.toLowerCase() === cat))
      .forEach(p => grid.appendChild(ProductCard(p)));
  }

  const si = $('#search', toolbar);
  const sc = $('#cat', toolbar);
  if (si) si.addEventListener('input', applyFilter);
  if (sc) sc.addEventListener('change', applyFilter);

  el.appendChild(toolbar);
  el.appendChild(grid);
  applyFilter();
  return el;
}

function ProdutoDetalheView(id){
  const p = allProducts().find(x=>x.id===id);
  const el = document.createElement('div');
  if (!p){
    el.innerHTML = `<div class="empty">Produto não encontrado.</div>`;
    return el;
  }
  el.innerHTML = `
    <section class="hero">
      ${Header(p.nome).outerHTML}
      <div class="card" style="overflow:hidden;">
        <img src="${p.imagem}" alt="${p.nome}" />
        <div class="card-body">
          <div class="card-desc">${p.descricao}</div>
          <div class="card-price" style="margin:6px 0;">${formatBRL(p.preco)}</div>
          <div style="display:flex; gap:8px;">
            <button class="btn" id="add">Adicionar ao carrinho</button>
            <a class="btn btn-ghost" href="#/produtos">Voltar</a>
          </div>
        </div>
      </div>
    </section>
  `;
  const addBtn = $('#add', el);
  if (addBtn) addBtn.addEventListener('click', () => addToCart(p.id));
  return el;
}

function CarrinhoView(){
  const el = document.createElement('div');
  const items = Object.values(carrinho);
  const map = new Map(allProducts().map(p=>[p.id,p]));

  if (items.length === 0){
    el.innerHTML = `
      ${Header('Carrinho').outerHTML}
      <div class="empty">Seu carrinho está vazio. <a href="#/produtos">Ver produtos</a></div>
    `;
    return el;
  }

  const lista = document.createElement('div');
  lista.style.display = 'grid';
  lista.style.gap = '12px';

  let subtotal = 0;
  items.forEach(it => {
    const p = map.get(it.id);
    const linha = document.createElement('div');
    const totalLinha = p.preco * it.qty;
    subtotal += totalLinha;
    linha.className = 'cart-item';
    linha.innerHTML = `
      <img src="${p.imagem}" alt="${p.nome}" />
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong>${p.nome}</strong>
          <button class="btn btn-ghost" data-del="${p.id}">Remover</button>
        </div>
        <small class="muted">${formatBRL(p.preco)} un.</small>
        <div class="qty" style="margin-top:6px;">
          <button class="btn btn-ghost" data-dec="${p.id}">-</button>
          <span>${it.qty}</span>
          <button class="btn" data-inc="${p.id}">+</button>
        </div>
      </div>
      <div style="text-align:right; min-width:90px;">
        <div><strong>${formatBRL(totalLinha)}</strong></div>
      </div>
    `;
    lista.appendChild(linha);
  });

  const resumo = document.createElement('div');
  resumo.className = 'cart-summary';
  const frete = subtotal >= 299 ? 0 : 19.9;
  const total = subtotal + frete;
  resumo.innerHTML = `
    <h3 style="margin-top:0">Resumo</h3>
    <div style="display:flex; justify-content:space-between"><span>Subtotal</span><strong>${formatBRL(subtotal)}</strong></div>
    <div style="display:flex; justify-content:space-between"><span>Frete</span><strong>${frete===0? 'Grátis' : formatBRL(frete)}</strong></div>
    <hr class="sep" />
    <div style="display:flex; justify-content:space-between; font-size:1.1rem"><span>Total</span><strong>${formatBRL(total)}</strong></div>
    <button class="btn" style="width:100%; margin-top:12px">Finalizar compra</button>
    <small class="muted">Exemplo sem pagamento real.</small>
  `;

  el.appendChild(Header('Carrinho'));
  const grid = document.createElement('div');
  grid.className = 'cart';
  grid.appendChild(lista);
  grid.appendChild(resumo);
  el.appendChild(grid);

  // Eventos
  el.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const idInc = t.getAttribute('data-inc');
    const idDec = t.getAttribute('data-dec');
    const idDel = t.getAttribute('data-del');
    if (idInc) { addToCart(idInc); render(); }
    if (idDec) { removeFromCart(idDec); }
    if (idDel) { deleteFromCart(idDel); }
  });

  return el;
}

function AdminView(){
  const el = document.createElement('div');
  el.appendChild(Header('Adicionar produto'));

  const form = document.createElement('form');
  form.className = 'form';
  form.innerHTML = `
    <div class="form-row">
      <div class="form-group">
        <label>Nome</label>
        <input name="nome" required placeholder="Ex.: Camiseta Premium" />
      </div>
      <div class="form-group">
        <label>Preço (R$)</label>
        <input name="preco" type="number" min="0" step="0.01" required placeholder="Ex.: 99.90" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Categoria</label>
        <input name="categoria" placeholder="Ex.: Roupas" />
      </div>
      <div class="form-group">
        <label>Imagem (URL)</label>
        <input name="imagem" placeholder="https://..." />
      </div>
    </div>
    <div class="form-group">
      <label>Descrição</label>
      <textarea name="descricao" placeholder="Detalhes do produto"></textarea>
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-ghost" id="exportar">Exportar JSON</button>
      <label class="btn btn-ghost" for="importar" style="display:inline-flex; align-items:center; cursor:pointer;">Importar JSON
        <input type="file" id="importar" accept="application/json" style="display:none" />
      </label>
      <button type="submit" class="btn">Salvar produto</button>
    </div>
  `;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {
      nome: (fd.get('nome')||'').toString().trim(),
      preco: Number(fd.get('preco')||0),
      descricao: (fd.get('descricao')||'').toString().trim(),
      imagem: (fd.get('imagem')||'').toString().trim(),
      categoria: (fd.get('categoria')||'Outros').toString().trim() || 'Outros'
    };
    if (!data.nome || !isFinite(data.preco) || data.preco < 0){
      alert('Preencha nome e preço válidos.');
      return;
    }
    addUserProduct(data);
    form.reset();
    alert('Produto adicionado com sucesso!');
  });

  const exportBtn = $('#exportar', form);
  if (exportBtn) exportBtn.addEventListener('click', () => exportAllProducts());
  const importInput = $('#importar', form);
  if (importInput) importInput.addEventListener('change', async (e) => {
    const tgt = e.target;
    const files = (tgt && tgt.files) ? tgt.files : null;
    const file = files && files[0] ? files[0] : null;
    if (!file) return;
    try {
      await importUserProducts(file, { mode: 'replace' });
      alert('Produtos importados com sucesso.');
    } catch(err){
      alert('Falha ao importar: ' + err.message);
    } finally {
      if (tgt) tgt.value = '';
    }
  });

  el.appendChild(form);
  const tip = document.createElement('p');
  tip.className = 'muted';
  tip.textContent = 'Dica: exporte seus produtos para JSON para fazer backup e importe novamente quando quiser.';
  el.appendChild(tip);
  return el;
}

// =========================
// Autenticação (localStorage + hash de senha)
// =========================
const USERS_KEY = 'minha-loja:users';
const SESSION_KEY = 'minha-loja:session';

function getUsers(){
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch { return []; }
}
function saveUsers(arr){ localStorage.setItem(USERS_KEY, JSON.stringify(arr)); }
function setSession(userId){ localStorage.setItem(SESSION_KEY, JSON.stringify({ userId })); }
function clearSession(){ localStorage.removeItem(SESSION_KEY); }
function currentSession(){ try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch { return null; } }
function currentUser(){
  const s = currentSession();
  if (!s) return null;
  const users = getUsers();
  return users.find(u=>u.id===s.userId) || null;
}

function genUserId(email){
  return 'u-' + (email||'').toLowerCase().replace(/[^a-z0-9]+/g,'-') + '-' + Math.random().toString(36).slice(2,8);
}
function genSalt(len=16){
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode.apply(null, bytes));
}
async function sha256Base64(str){
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hash);
  let bin = '';
  for (let i=0;i<bytes.length;i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
async function hashPassword(password, salt){
  return sha256Base64(salt + ':' + password);
}

async function createUser({ name, email, password }){
  const users = getUsers();
  const exists = users.some(u=>u.email.toLowerCase()===email.toLowerCase());
  if (exists) throw new Error('E-mail já cadastrado');
  const salt = genSalt();
  const passHash = await hashPassword(password, salt);
  const user = { id: genUserId(email), name, email, salt, passHash, createdAt: Date.now() };
  users.push(user);
  saveUsers(users);
  setSession(user.id);
  return user;
}

async function loginUser({ email, password }){
  const users = getUsers();
  const user = users.find(u=>u.email.toLowerCase()===email.toLowerCase());
  if (!user) throw new Error('Credenciais inválidas');
  const passHash = await hashPassword(password, user.salt);
  if (passHash !== user.passHash) throw new Error('Credenciais inválidas');
  setSession(user.id);
  return user;
}

function logoutUser(){ clearSession(); }

function updateAuthLink(){
  const link = document.getElementById('auth-link');
  if (!link) return;
  const u = currentUser();
  if (u){
    link.textContent = 'Conta (' + (u.name || u.email) + ')';
  } else {
    link.textContent = 'Entrar';
  }
}

function LoginView(){
  const el = document.createElement('div');
  const u = currentUser();
  if (u){
    el.appendChild(Header('Minha conta'));
    const box = document.createElement('div');
    box.className = 'form';
    box.innerHTML = `
      <p>Você está autenticado como <strong>${u.name || u.email}</strong>.</p>
      <div class="form-actions">
        <button class="btn" id="logout">Sair</button>
      </div>
    `;
    el.appendChild(box);
    const btn = box.querySelector('#logout');
    if (btn) btn.addEventListener('click', () => { logoutUser(); updateAuthLink(); navigateTo('#/'); });
    return el;
  }

  el.appendChild(Header('Entrar ou criar conta'));
  const tabs = document.createElement('div');
  tabs.className = 'form';
  tabs.innerHTML = `
    <div class="form-actions" style="justify-content:flex-start; margin-bottom:10px;">
      <button class="btn" id="tab-login">Entrar</button>
      <button class="btn btn-ghost" id="tab-register">Criar conta</button>
    </div>
    <div id="pane"></div>
  `;
  el.appendChild(tabs);
  const pane = tabs.querySelector('#pane');

  function renderLogin(){
    pane.innerHTML = `
      <form class="form" id="login-form">
        <div class="form-group">
          <label>E-mail</label>
          <input name="email" type="email" required />
        </div>
        <div class="form-group">
          <label>Palavra-passe</label>
          <input name="password" type="password" required />
        </div>
        <div class="form-actions">
          <button class="btn" type="submit">Entrar</button>
        </div>
      </form>`;
    const form = pane.querySelector('#login-form');
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = new FormData(form);
      try{
        await loginUser({ email: String(fd.get('email')||''), password: String(fd.get('password')||'') });
        updateAuthLink();
        navigateTo('#/');
      }catch(err){ alert(err.message); }
    });
  }

  function renderRegister(){
    pane.innerHTML = `
      <form class="form" id="register-form">
        <div class="form-group">
          <label>Nome</label>
          <input name="name" required />
        </div>
        <div class="form-group">
          <label>E-mail</label>
          <input name="email" type="email" required />
        </div>
        <div class="form-group">
          <label>Palavra-passe</label>
          <input name="password" type="password" minlength="6" required />
        </div>
        <div class="form-actions">
          <button class="btn" type="submit">Criar conta</button>
        </div>
      </form>`;
    const form = pane.querySelector('#register-form');
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = new FormData(form);
      const name = String(fd.get('name')||'').trim();
      const email = String(fd.get('email')||'').trim();
      const password = String(fd.get('password')||'');
      if (!name || !email || password.length < 6){ alert('Preencha os campos corretamente.'); return; }
      try{
        await createUser({ name, email, password });
        updateAuthLink();
        navigateTo('#/');
      }catch(err){ alert(err.message); }
    });
  }

  const tabLogin = tabs.querySelector('#tab-login');
  const tabRegister = tabs.querySelector('#tab-register');
  if (tabLogin) tabLogin.addEventListener('click', (e)=>{ e.preventDefault(); renderLogin(); });
  if (tabRegister) tabRegister.addEventListener('click', (e)=>{ e.preventDefault(); renderRegister(); });
  renderLogin();
  return el;
}

// Roteador simples por hash
const routes = {
  '#/': HomeView,
  '#/produtos': ProdutosView,
  '#/carrinho': CarrinhoView,
  '#/admin': AdminView,
  '#/login': LoginView
};

function navigateTo(hash){
  if (location.hash === hash) return render();
  location.hash = hash;
}

function render(){
  $('#year').textContent = YEAR;
  const root = $('#app');
  const path = location.hash || '#/';

  // produto detalhado
  if (path.startsWith('#/produto/')){
    const id = path.split('/')[2];
    root.innerHTML = '';
    root.appendChild(ProdutoDetalheView(id));
    updateCartBadge();
    return;
  }

  const View = routes[path] || HomeView;
  root.innerHTML = '';
  root.appendChild(View());
  updateCartBadge();
  updateAuthLink();
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', render);
