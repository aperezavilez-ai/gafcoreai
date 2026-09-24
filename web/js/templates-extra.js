// ============================================================
//  GafCoreAI - Templates Extra (batch 1/4)
//  E-commerce, Blog, Portfolio, CRM
// ============================================================

export const TEMPLATES_EXTRA = {

  // ═══════════════════════════════════════════════════════════
  //  1. E-COMMERCE TIENDA
  // ═══════════════════════════════════════════════════════════
  "ecommerce-store": {
    name: "E-commerce Tienda",
    icon: "&#128717;",
    description: "Tienda online con catálogo, carrito, checkout y filtros",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mi Tienda</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<header class="header">
  <a href="#" class="logo">&#9670; Tienda</a>
  <nav class="nav">
    <a href="#catalogo">Catálogo</a>
    <a href="#ofertas">Ofertas</a>
    <a href="#contacto">Contacto</a>
  </nav>
  <button class="cart-btn" id="cartBtn">
    &#128722; <span class="cart-count" id="cartCount">0</span>
  </button>
</header>

<section class="hero">
  <h1 class="hero-title">Descubre lo último</h1>
  <p class="hero-sub">Productos seleccionados con envío gratis</p>
  <button class="btn-primary" onclick="scrollToCatalog()">Ver catálogo</button>
</section>

<section class="filters" id="catalogo">
  <div class="filter-group">
    <button class="filter active" data-filter="all">Todos</button>
    <button class="filter" data-filter="nuevo">Nuevos</button>
    <button class="filter" data-filter="oferta">Ofertas</button>
    <button class="filter" data-filter="premium">Premium</button>
  </div>
  <input class="search" id="search" placeholder="Buscar producto...">
</section>

<section class="products" id="products"></section>

<aside class="cart-panel" id="cartPanel">
  <div class="cart-header">
    <h3>Carrito</h3>
    <button class="close-btn" onclick="toggleCart()">&times;</button>
  </div>
  <div class="cart-items" id="cartItems"></div>
  <div class="cart-footer">
    <div class="cart-total">Total: <b id="cartTotal">$0</b></div>
    <button class="btn-primary" onclick="checkout()">Ir a pagar</button>
  </div>
</aside>

<div class="overlay" id="overlay" onclick="toggleCart()"></div>

<footer class="footer">
  <p>&copy; 2026 Mi Tienda. Todos los derechos reservados.</p>
</footer>

<script src="script.js"></script>
</body>
</html>`,
      "styles.css": `* { margin:0; padding:0; box-sizing:border-box; }
:root {
  --bg:#0a0a0c; --bg-2:#141418; --bg-3:#1e1e24;
  --text:#f0f0f5; --text-dim:#8a8a96;
  --accent:#ff6b35; --accent-2:#f7931e;
  --ok:#4ec9a0;
}
body {
  font-family:-apple-system,"Inter","Segoe UI",sans-serif;
  background:var(--bg); color:var(--text);
  line-height:1.5;
}
.header {
  position:sticky; top:0; z-index:100;
  display:flex; align-items:center; justify-content:space-between;
  padding:20px 40px; background:rgba(10,10,12,.8);
  backdrop-filter:blur(20px); border-bottom:1px solid rgba(255,255,255,.05);
}
.logo { font-weight:800; font-size:20px; color:var(--text); text-decoration:none; }
.nav { display:flex; gap:32px; }
.nav a { color:var(--text-dim); text-decoration:none; font-size:14px; transition:color .2s; }
.nav a:hover { color:var(--text); }
.cart-btn {
  position:relative; background:var(--bg-2); border:none;
  color:var(--text); padding:10px 16px; border-radius:10px;
  cursor:pointer; font-size:16px; transition:background .2s;
}
.cart-btn:hover { background:var(--bg-3); }
.cart-count {
  position:absolute; top:-4px; right:-4px;
  background:var(--accent); color:#fff;
  font-size:10px; padding:2px 6px; border-radius:10px;
  font-weight:700;
}

.hero {
  padding:100px 40px; text-align:center;
  background:radial-gradient(circle at 50% 0%, rgba(255,107,53,.15), transparent 70%);
}
.hero-title { font-size:clamp(40px,7vw,80px); font-weight:800; letter-spacing:-.03em; margin-bottom:16px; }
.hero-sub { color:var(--text-dim); font-size:18px; margin-bottom:32px; }
.btn-primary {
  background:linear-gradient(135deg,var(--accent),var(--accent-2));
  color:#fff; border:none; padding:14px 32px;
  border-radius:12px; cursor:pointer; font-weight:600;
  font-size:15px; transition:transform .2s;
}
.btn-primary:hover { transform:translateY(-2px); }

.filters {
  padding:40px; display:flex; justify-content:space-between;
  align-items:center; gap:20px; flex-wrap:wrap;
  max-width:1400px; margin:0 auto;
}
.filter-group { display:flex; gap:8px; flex-wrap:wrap; }
.filter {
  background:var(--bg-2); border:none; color:var(--text-dim);
  padding:8px 16px; border-radius:999px; cursor:pointer;
  font-size:13px; transition:all .2s;
}
.filter:hover { background:var(--bg-3); color:var(--text); }
.filter.active { background:var(--accent); color:#fff; }
.search {
  background:var(--bg-2); border:none; color:var(--text);
  padding:10px 16px; border-radius:10px; font-size:13px;
  width:280px; outline:none;
}

.products {
  display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr));
  gap:24px; padding:20px 40px 80px; max-width:1400px; margin:0 auto;
}
.product {
  background:var(--bg-2); border-radius:16px; overflow:hidden;
  transition:transform .3s, box-shadow .3s;
  cursor:pointer;
}
.product:hover { transform:translateY(-6px); box-shadow:0 20px 40px rgba(0,0,0,.4); }
.product-img {
  aspect-ratio:1; background:var(--bg-3);
  display:flex; align-items:center; justify-content:center;
  font-size:64px;
}
.product-info { padding:16px; }
.product-name { font-weight:600; font-size:15px; margin-bottom:4px; }
.product-price { color:var(--accent); font-weight:700; font-size:18px; margin-bottom:12px; }
.product-add {
  width:100%; background:var(--accent); color:#fff;
  border:none; padding:10px; border-radius:8px;
  cursor:pointer; font-weight:600; font-size:13px;
  transition:background .2s;
}
.product-add:hover { background:var(--accent-2); }

.cart-panel {
  position:fixed; top:0; right:0; bottom:0; width:400px;
  max-width:100vw; background:var(--bg-2); z-index:200;
  transform:translateX(100%); transition:transform .3s cubic-bezier(.4,0,.2,1);
  display:flex; flex-direction:column;
}
.cart-panel.open { transform:translateX(0); }
.cart-header {
  padding:20px; display:flex; justify-content:space-between;
  align-items:center; border-bottom:1px solid rgba(255,255,255,.05);
}
.close-btn { background:none; border:none; color:var(--text); font-size:24px; cursor:pointer; }
.cart-items { flex:1; overflow-y:auto; padding:20px; }
.cart-item {
  display:flex; gap:12px; padding:12px 0;
  border-bottom:1px solid rgba(255,255,255,.05);
}
.cart-item-img {
  width:60px; height:60px; background:var(--bg-3);
  border-radius:8px; display:flex; align-items:center; justify-content:center;
  font-size:28px; flex-shrink:0;
}
.cart-item-info { flex:1; }
.cart-item-name { font-size:13px; margin-bottom:4px; }
.cart-item-price { color:var(--accent); font-weight:600; font-size:13px; }
.cart-item-remove {
  background:none; border:none; color:var(--text-dim);
  cursor:pointer; font-size:14px; padding:0 8px;
}
.cart-footer {
  padding:20px; border-top:1px solid rgba(255,255,255,.05);
}
.cart-total { font-size:18px; margin-bottom:16px; }
.cart-total b { color:var(--accent); }

.overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.6);
  z-index:150; opacity:0; pointer-events:none;
  transition:opacity .3s;
}
.overlay.show { opacity:1; pointer-events:auto; }

.footer {
  text-align:center; padding:40px;
  color:var(--text-dim); font-size:13px;
  border-top:1px solid rgba(255,255,255,.05);
}

@media (max-width:768px) {
  .header { padding:16px 20px; }
  .nav { display:none; }
  .hero { padding:60px 20px; }
  .products { padding:20px; gap:16px; }
  .filters { padding:20px; }
  .search { width:100%; }
  .cart-panel { width:100%; }
}`,
      "script.js": `const PRODUCTS = [
  { id:1, name:"Sneaker Pro X", price:129, emoji:"👟", tag:"nuevo" },
  { id:2, name:"Running Air", price:159, emoji:"🏃", tag:"premium" },
  { id:3, name:"Urban Classic", price:89, emoji:"👞", tag:"oferta" },
  { id:4, name:"Sport Max", price:199, emoji:"🥾", tag:"premium" },
  { id:5, name:"Casual Flex", price:79, emoji:"👟", tag:"nuevo" },
  { id:6, name:"Trail Runner", price:149, emoji:"⛰️", tag:"oferta" },
  { id:7, name:"Street Lite", price:99, emoji:"👞", tag:"nuevo" },
  { id:8, name:"Elite Boost", price:229, emoji:"🏆", tag:"premium" },
];

let cart = JSON.parse(localStorage.getItem("cart") || "[]");
let activeFilter = "all";
let searchQuery = "";

function renderProducts() {
  const grid = document.getElementById("products");
  const filtered = PRODUCTS.filter(p => {
    const matchFilter = activeFilter === "all" || p.tag === activeFilter;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });

  grid.innerHTML = filtered.map(p => \`
    <div class="product">
      <div class="product-img">\${p.emoji}</div>
      <div class="product-info">
        <div class="product-name">\${p.name}</div>
        <div class="product-price">$\${p.price}</div>
        <button class="product-add" onclick="addToCart(\${p.id})">Agregar</button>
      </div>
    </div>
  \`).join("");
}

function addToCart(id) {
  const product = PRODUCTS.find(p => p.id === id);
  const existing = cart.find(c => c.id === id);
  if (existing) existing.qty++;
  else cart.push({ ...product, qty: 1 });
  saveCart();
  updateCartUI();
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  saveCart();
  updateCartUI();
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function updateCartUI() {
  const count = cart.reduce((sum, c) => sum + c.qty, 0);
  document.getElementById("cartCount").textContent = count;

  const items = document.getElementById("cartItems");
  if (!cart.length) {
    items.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:40px 0">Carrito vacío</p>';
  } else {
    items.innerHTML = cart.map(c => \`
      <div class="cart-item">
        <div class="cart-item-img">\${c.emoji}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">\${c.name} × \${c.qty}</div>
          <div class="cart-item-price">$\${(c.price * c.qty).toFixed(2)}</div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(\${c.id})">✕</button>
      </div>
    \`).join("");
  }

  const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  document.getElementById("cartTotal").textContent = "$" + total.toFixed(2);
}

function toggleCart() {
  document.getElementById("cartPanel").classList.toggle("open");
  document.getElementById("overlay").classList.toggle("show");
}

function checkout() {
  if (!cart.length) { alert("Carrito vacío"); return; }
  alert("Checkout próximo a implementar. Integra Stripe aquí.");
}

function scrollToCatalog() {
  document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" });
}

document.querySelectorAll(".filter").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    renderProducts();
  };
});

document.getElementById("search").oninput = (e) => {
  searchQuery = e.target.value;
  renderProducts();
};

document.getElementById("cartBtn").onclick = toggleCart;

renderProducts();
updateCartUI();`
    }
  },

  // ═══════════════════════════════════════════════════════════
  //  2. BLOG PERSONAL
  // ═══════════════════════════════════════════════════════════
  "blog-personal": {
    name: "Blog Personal",
    icon: "&#128221;",
    description: "Blog con markdown, tags, búsqueda y dark mode",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="es" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mi Blog</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<header class="header">
  <a href="#" class="logo">Mi Blog</a>
  <nav class="nav">
    <a href="#posts">Posts</a>
    <a href="#tags">Tags</a>
    <a href="#about">About</a>
  </nav>
  <button class="theme-toggle" id="themeToggle">🌙</button>
</header>

<main class="container">
  <section class="intro">
    <h1>Hola, soy <span class="gradient">desarrollador</span></h1>
    <p>Escribo sobre código, diseño y productividad.</p>
  </section>

  <section class="tags" id="tags"></section>

  <section class="posts" id="posts"></section>
</main>

<footer class="footer">
  <p>&copy; 2026 Mi Blog</p>
</footer>

<script src="script.js"></script>
</body>
</html>`,
      "styles.css": `* { margin:0; padding:0; box-sizing:border-box; }
:root {
  --bg:#0a0a0c; --bg-2:#15151a; --border:rgba(255,255,255,.08);
  --text:#f0f0f5; --text-dim:#8a8a96;
  --accent:#a673ff;
}
[data-theme="light"] {
  --bg:#ffffff; --bg-2:#f5f5f7; --border:rgba(0,0,0,.08);
  --text:#0a0a0c; --text-dim:#6a6a76;
}
body {
  font-family:-apple-system,"Inter","Segoe UI",sans-serif;
  background:var(--bg); color:var(--text);
  line-height:1.7; transition:background .3s, color .3s;
}
.header {
  position:sticky; top:0; z-index:100;
  display:flex; justify-content:space-between; align-items:center;
  padding:20px 40px; background:var(--bg);
  border-bottom:1px solid var(--border);
  backdrop-filter:blur(20px);
}
.logo { font-weight:800; color:var(--text); text-decoration:none; font-size:18px; }
.nav { display:flex; gap:24px; }
.nav a { color:var(--text-dim); text-decoration:none; font-size:14px; transition:color .2s; }
.nav a:hover { color:var(--text); }
.theme-toggle {
  background:var(--bg-2); border:none; color:var(--text);
  width:40px; height:40px; border-radius:50%;
  cursor:pointer; font-size:18px; transition:transform .2s;
}
.theme-toggle:hover { transform:scale(1.1); }

.container { max-width:780px; margin:0 auto; padding:60px 24px; }
.intro { margin-bottom:60px; }
.intro h1 { font-size:clamp(32px,5vw,56px); font-weight:800; letter-spacing:-.02em; margin-bottom:16px; }
.gradient {
  background:linear-gradient(135deg,#a673ff,#5b7cfa);
  -webkit-background-clip:text; background-clip:text;
  -webkit-text-fill-color:transparent;
}
.intro p { font-size:18px; color:var(--text-dim); }

.tags { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:40px; }
.tag {
  background:var(--bg-2); padding:6px 14px; border-radius:999px;
  font-size:12px; color:var(--text-dim); cursor:pointer;
  transition:all .2s; border:1px solid transparent;
}
.tag:hover { border-color:var(--accent); color:var(--accent); }
.tag.active { background:var(--accent); color:#fff; }

.posts { display:flex; flex-direction:column; gap:32px; }
.post {
  padding:24px; background:var(--bg-2);
  border-radius:16px; border:1px solid var(--border);
  cursor:pointer; transition:transform .3s, box-shadow .3s;
}
.post:hover { transform:translateY(-4px); box-shadow:0 20px 40px rgba(0,0,0,.3); }
.post-meta { font-size:12px; color:var(--text-dim); margin-bottom:12px; }
.post-title { font-size:22px; font-weight:700; margin-bottom:8px; letter-spacing:-.01em; }
.post-excerpt { color:var(--text-dim); font-size:15px; }
.post-tags { display:flex; gap:6px; margin-top:16px; flex-wrap:wrap; }
.post-tag { font-size:11px; color:var(--accent); padding:2px 8px; background:rgba(166,115,255,.1); border-radius:6px; }

.footer { text-align:center; padding:40px; color:var(--text-dim); font-size:13px; border-top:1px solid var(--border); }

@media (max-width:768px) {
  .header { padding:16px 20px; }
  .nav { display:none; }
  .container { padding:40px 20px; }
}`,
      "script.js": `const POSTS = [
  {
    id: 1, title: "Cómo estructurar un proyecto React",
    excerpt: "Guía práctica sobre organización de carpetas, componentes y lógica.",
    date: "2026-01-15", tags: ["react", "arquitectura"], readTime: "5 min"
  },
  {
    id: 2, title: "CSS moderno en 2026",
    excerpt: "Container queries, :has(), subgrid y todas las novedades que debes conocer.",
    date: "2026-01-10", tags: ["css", "frontend"], readTime: "8 min"
  },
  {
    id: 3, title: "TypeScript avanzado: tipos condicionales",
    excerpt: "Domina los tipos condicionales, mapped types y template literals.",
    date: "2026-01-05", tags: ["typescript", "tips"], readTime: "6 min"
  },
  {
    id: 4, title: "Productividad para developers",
    excerpt: "Mis extensiones, atajos y setup diario para programar más rápido.",
    date: "2025-12-28", tags: ["productividad"], readTime: "4 min"
  }
];

let activeTag = null;

function renderTags() {
  const allTags = [...new Set(POSTS.flatMap(p => p.tags))];
  const html = ['<button class="tag' + (!activeTag ? ' active' : '') + '" data-tag="">Todos</button>']
    .concat(allTags.map(t => '<button class="tag' + (activeTag === t ? ' active' : '') + '" data-tag="' + t + '">' + t + '</button>'));
  document.getElementById("tags").innerHTML = html.join("");
  document.querySelectorAll(".tag").forEach(btn => {
    btn.onclick = () => { activeTag = btn.dataset.tag || null; renderTags(); renderPosts(); };
  });
}

function renderPosts() {
  const filtered = activeTag ? POSTS.filter(p => p.tags.includes(activeTag)) : POSTS;
  document.getElementById("posts").innerHTML = filtered.map(p => \`
    <article class="post">
      <div class="post-meta">\${p.date} · \${p.readTime} de lectura</div>
      <h2 class="post-title">\${p.title}</h2>
      <p class="post-excerpt">\${p.excerpt}</p>
      <div class="post-tags">\${p.tags.map(t => '<span class="post-tag">#' + t + '</span>').join("")}</div>
    </article>
  \`).join("");
}

document.getElementById("themeToggle").onclick = () => {
  const html = document.documentElement;
  const current = html.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  document.getElementById("themeToggle").textContent = next === "dark" ? "🌙" : "☀️";
  localStorage.setItem("blog-theme", next);
};

const saved = localStorage.getItem("blog-theme");
if (saved) {
  document.documentElement.setAttribute("data-theme", saved);
  document.getElementById("themeToggle").textContent = saved === "dark" ? "🌙" : "☀️";
}

renderTags();
renderPosts();`
    }
  },

  // ═══════════════════════════════════════════════════════════
  //  3. PORTFOLIO DESARROLLADOR
  // ═══════════════════════════════════════════════════════════
  "portfolio-dev": {
    name: "Portfolio Desarrollador",
    icon: "&#128104;",
    description: "Portfolio con proyectos, skills y contacto",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Portfolio</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<nav class="nav">
  <a href="#" class="nav-logo">&#9670;</a>
  <ul class="nav-links">
    <li><a href="#about">Sobre mí</a></li>
    <li><a href="#projects">Proyectos</a></li>
    <li><a href="#contact">Contacto</a></li>
  </ul>
</nav>

<header class="hero">
  <span class="hero-eyebrow">Hola, soy</span>
  <h1 class="hero-name">Tu Nombre</h1>
  <h2 class="hero-role">Desarrollador <span class="text-gradient">Full Stack</span></h2>
  <p class="hero-desc">Construyo aplicaciones web modernas con React, Node.js y diseño de alto nivel.</p>
  <div class="hero-actions">
    <a href="#projects" class="btn btn-primary">Ver proyectos</a>
    <a href="#contact" class="btn btn-ghost">Contactar</a>
  </div>
</header>

<section class="section" id="about">
  <h2 class="section-title"><span class="num">01.</span> Sobre mí</h2>
  <div class="about-grid">
    <p>Llevo 5 años construyendo productos digitales. Especializado en crear experiencias web rápidas, accesibles y visualmente impactantes.</p>
    <div class="skills">
      <h4>Skills</h4>
      <div class="skill-grid">
        <span>TypeScript</span>
        <span>React</span>
        <span>Next.js</span>
        <span>Node.js</span>
        <span>PostgreSQL</span>
        <span>Tailwind</span>
      </div>
    </div>
  </div>
</section>

<section class="section" id="projects">
  <h2 class="section-title"><span class="num">02.</span> Proyectos</h2>
  <div class="projects" id="projectsList"></div>
</section>

<section class="section contact" id="contact">
  <h2 class="section-title"><span class="num">03.</span> Contacto</h2>
  <p>¿Tienes un proyecto en mente? Hablemos.</p>
  <a href="mailto:hola@ejemplo.com" class="btn btn-primary">Escribir email</a>
</section>

<footer class="footer">
  <p>Diseñado y construido por Tu Nombre</p>
</footer>

<script src="script.js"></script>
</body>
</html>`,
      "styles.css": `* { margin:0; padding:0; box-sizing:border-box; }
:root {
  --bg:#0a192f; --bg-2:#112240; --bg-3:#1d2d50;
  --text:#ccd6f6; --text-dim:#8892b0;
  --accent:#64ffda;
}
body {
  font-family:-apple-system,"Inter","Segoe UI",sans-serif;
  background:var(--bg); color:var(--text-dim);
  line-height:1.6; scroll-behavior:smooth;
}
.nav {
  position:fixed; top:0; left:0; right:0; z-index:100;
  display:flex; justify-content:space-between; align-items:center;
  padding:20px 40px; background:rgba(10,25,47,.85);
  backdrop-filter:blur(20px);
}
.nav-logo { color:var(--accent); font-size:24px; text-decoration:none; }
.nav-links { display:flex; gap:28px; list-style:none; }
.nav-links a { color:var(--text); text-decoration:none; font-size:13px; font-family:Consolas,monospace; transition:color .2s; }
.nav-links a:hover { color:var(--accent); }

.hero {
  min-height:100vh; max-width:1000px; margin:0 auto;
  padding:120px 40px; display:flex; flex-direction:column;
  justify-content:center;
}
.hero-eyebrow { color:var(--accent); font-family:Consolas,monospace; font-size:15px; margin-bottom:20px; }
.hero-name { font-size:clamp(40px,7vw,80px); font-weight:800; color:var(--text); letter-spacing:-.02em; line-height:1.1; margin-bottom:8px; }
.hero-role { font-size:clamp(28px,5vw,56px); font-weight:800; color:var(--text-dim); margin-bottom:24px; }
.text-gradient { background:linear-gradient(90deg,#64ffda,#5b7cfa); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.hero-desc { max-width:540px; font-size:17px; line-height:1.7; margin-bottom:48px; }
.hero-actions { display:flex; gap:16px; flex-wrap:wrap; }

.btn {
  padding:16px 28px; border-radius:6px; text-decoration:none;
  font-family:Consolas,monospace; font-size:14px;
  transition:all .25s;
}
.btn-primary { background:var(--accent); color:var(--bg); }
.btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 20px rgba(100,255,218,.25); }
.btn-ghost { border:1px solid var(--accent); color:var(--accent); }
.btn-ghost:hover { background:rgba(100,255,218,.08); }

.section { max-width:1000px; margin:0 auto; padding:100px 40px; }
.section-title { font-size:28px; color:var(--text); font-weight:700; margin-bottom:40px; display:flex; align-items:baseline; gap:12px; }
.section-title .num { color:var(--accent); font-family:Consolas,monospace; font-size:20px; }
.section-title::after { content:""; flex:1; height:1px; background:var(--bg-3); }

.about-grid { display:grid; gap:40px; }
.about-grid p { font-size:15px; }
.skills h4 { color:var(--text); margin-bottom:12px; font-size:14px; }
.skill-grid { display:flex; flex-wrap:wrap; gap:8px; }
.skill-grid span {
  background:var(--bg-2); color:var(--text); padding:6px 14px;
  border-radius:6px; font-family:Consolas,monospace; font-size:12px;
}

.projects { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:20px; }
.project {
  background:var(--bg-2); border-radius:12px; overflow:hidden;
  transition:transform .3s;
  display:flex; flex-direction:column;
}
.project:hover { transform:translateY(-6px); }
.project-header {
  padding:20px; display:flex; justify-content:space-between;
  align-items:center;
}
.project-icon { font-size:32px; }
.project-links { display:flex; gap:12px; }
.project-links a { color:var(--text-dim); text-decoration:none; font-size:16px; transition:color .2s; }
.project-links a:hover { color:var(--accent); }
.project-body { padding:0 20px 20px; flex:1; }
.project-title { color:var(--text); font-size:18px; font-weight:600; margin-bottom:8px; }
.project-desc { font-size:13.5px; line-height:1.7; }
.project-tech {
  padding:14px 20px; display:flex; gap:10px; flex-wrap:wrap;
  font-family:Consolas,monospace; font-size:11px;
  color:var(--accent);
}

.contact { text-align:center; }
.contact p { margin-bottom:32px; font-size:16px; }
.contact .section-title { justify-content:center; }
.contact .section-title::after { display:none; }

.footer { text-align:center; padding:40px; font-family:Consolas,monospace; font-size:12px; }`,
      "script.js": `const PROJECTS = [
  { icon: "🎨", title: "Design System", desc: "Sistema de componentes reutilizables con Storybook y tokens de diseño.", tech: ["React","TypeScript","Storybook"] },
  { icon: "🛒", title: "E-commerce Platform", desc: "Tienda online completa con carrito, checkout y panel admin.", tech: ["Next.js","Stripe","Prisma"] },
  { icon: "📊", title: "Analytics Dashboard", desc: "Dashboard interactivo con gráficos en tiempo real y filtros.", tech: ["React","D3.js","WebSocket"] },
  { icon: "💬", title: "Chat en tiempo real", desc: "Aplicación de chat con salas, notificaciones y archivos.", tech: ["Node.js","Socket.io","Redis"] },
  { icon: "📱", title: "App Mobile Fitness", desc: "PWA de entrenamiento con tracking y estadísticas.", tech: ["React","PWA","IndexedDB"] },
  { icon: "🎮", title: "Browser Game", desc: "Juego multijugador con WebRTC y física en canvas.", tech: ["Canvas","WebRTC","Node.js"] },
];

document.getElementById("projectsList").innerHTML = PROJECTS.map(p => \`
  <div class="project">
    <div class="project-header">
      <span class="project-icon">\${p.icon}</span>
      <div class="project-links">
        <a href="#" title="GitHub">&#128279;</a>
        <a href="#" title="Ver más">&#8599;</a>
      </div>
    </div>
    <div class="project-body">
      <h3 class="project-title">\${p.title}</h3>
      <p class="project-desc">\${p.desc}</p>
    </div>
    <div class="project-tech">
      \${p.tech.map(t => '<span>' + t + '</span>').join("")}
    </div>
  </div>
\`).join("");`
    }
  },

  // ═══════════════════════════════════════════════════════════
  //  4. CRM DASHBOARD
  // ═══════════════════════════════════════════════════════════
  "crm-dashboard": {
    name: "CRM Dashboard",
    icon: "&#128188;",
    description: "CRM con clientes, deals, pipeline y métricas",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CRM</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<aside class="sidebar">
  <div class="sidebar-logo">&#9670; CRM</div>
  <nav class="sidebar-nav">
    <a class="active" data-view="dashboard">&#128202; Dashboard</a>
    <a data-view="clients">&#128101; Clientes</a>
    <a data-view="deals">&#128176; Deals</a>
    <a data-view="tasks">&#9989; Tareas</a>
    <a data-view="settings">&#9881; Config</a>
  </nav>
</aside>

<main class="main">
  <header class="topbar">
    <h1 id="pageTitle">Dashboard</h1>
    <button class="btn-primary">+ Nuevo</button>
  </header>

  <section id="view-dashboard" class="view active">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Ingresos mes</div>
        <div class="stat-value">$48,290</div>
        <div class="stat-trend up">+12.5%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Clientes activos</div>
        <div class="stat-value">247</div>
        <div class="stat-trend up">+8.2%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Deals cerrados</div>
        <div class="stat-value">34</div>
        <div class="stat-trend up">+15%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tasa conversión</div>
        <div class="stat-value">24.8%</div>
        <div class="stat-trend down">-2.1%</div>
      </div>
    </div>

    <div class="chart-card">
      <h3>Actividad últimos 7 días</h3>
      <div class="chart" id="chart"></div>
    </div>
  </section>

  <section id="view-clients" class="view">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Cliente</th><th>Email</th><th>Empresa</th><th>Estado</th><th>Valor</th></tr></thead>
        <tbody id="clientsTable"></tbody>
      </table>
    </div>
  </section>

  <section id="view-deals" class="view">
    <div class="pipeline">
      <div class="pipeline-col">
        <h4>Prospecto</h4>
        <div class="deal-card"><b>Proyecto A</b><span>$5,000</span></div>
        <div class="deal-card"><b>Proyecto B</b><span>$3,200</span></div>
      </div>
      <div class="pipeline-col">
        <h4>Negociación</h4>
        <div class="deal-card"><b>Proyecto C</b><span>$12,000</span></div>
      </div>
      <div class="pipeline-col">
        <h4>Cerrado</h4>
        <div class="deal-card"><b>Proyecto D</b><span>$8,500</span></div>
        <div class="deal-card"><b>Proyecto E</b><span>$15,000</span></div>
      </div>
    </div>
  </section>
</main>

<script src="script.js"></script>
</body>
</html>`,
      "styles.css": `* { margin:0; padding:0; box-sizing:border-box; }
:root {
  --bg:#0a0a0c; --bg-2:#15151a; --bg-3:#1e1e26;
  --border:rgba(255,255,255,.06);
  --text:#f0f0f5; --text-dim:#8a8a96;
  --accent:#5b7cfa; --ok:#4ec9a0; --err:#ef5a5a;
}
body {
  font-family:-apple-system,"Inter","Segoe UI",sans-serif;
  background:var(--bg); color:var(--text);
  display:grid; grid-template-columns:240px 1fr;
  min-height:100vh;
}
.sidebar {
  background:var(--bg-2); padding:24px 16px;
  border-right:1px solid var(--border);
  display:flex; flex-direction:column; gap:32px;
}
.sidebar-logo { font-weight:800; color:var(--accent); padding:0 12px; font-size:16px; }
.sidebar-nav { display:flex; flex-direction:column; gap:4px; }
.sidebar-nav a {
  padding:10px 12px; color:var(--text-dim); text-decoration:none;
  border-radius:8px; font-size:13.5px; cursor:pointer;
  transition:all .15s;
}
.sidebar-nav a:hover { background:var(--bg-3); color:var(--text); }
.sidebar-nav a.active { background:var(--bg-3); color:var(--accent); }

.main { padding:28px 32px; overflow-y:auto; }
.topbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:32px; }
.topbar h1 { font-size:24px; font-weight:700; }
.btn-primary {
  background:var(--accent); color:#fff; border:none;
  padding:10px 20px; border-radius:8px; cursor:pointer;
  font-weight:600; font-size:13px;
}

.view { display:none; }
.view.active { display:block; }

.stats-grid {
  display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
  gap:16px; margin-bottom:24px;
}
.stat-card {
  background:var(--bg-2); padding:20px; border-radius:12px;
  border:1px solid var(--border);
}
.stat-label { font-size:11.5px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.5px; margin-bottom:8px; }
.stat-value { font-size:28px; font-weight:800; margin-bottom:6px; }
.stat-trend { font-size:12px; font-weight:600; }
.stat-trend.up { color:var(--ok); }
.stat-trend.down { color:var(--err); }

.chart-card {
  background:var(--bg-2); padding:24px; border-radius:12px;
  border:1px solid var(--border);
}
.chart-card h3 { font-size:14px; margin-bottom:20px; }
.chart { display:flex; align-items:flex-end; gap:12px; height:200px; }
.chart .bar {
  flex:1; background:linear-gradient(180deg,var(--accent),#a673ff);
  border-radius:6px 6px 0 0; min-height:20px;
  transition:height .4s;
}

.table-wrap { background:var(--bg-2); border-radius:12px; overflow:hidden; border:1px solid var(--border); }
table { width:100%; border-collapse:collapse; }
th { text-align:left; padding:14px 20px; font-size:11.5px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.5px; border-bottom:1px solid var(--border); }
td { padding:14px 20px; font-size:13.5px; border-bottom:1px solid var(--border); }
tr:last-child td { border-bottom:none; }
.badge { font-size:11px; padding:3px 10px; border-radius:10px; font-weight:600; }
.badge.active { background:rgba(78,201,160,.15); color:var(--ok); }
.badge.pending { background:rgba(240,165,69,.15); color:#f0a545; }

.pipeline { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:16px; }
.pipeline-col { background:var(--bg-2); padding:16px; border-radius:12px; border:1px solid var(--border); }
.pipeline-col h4 { font-size:12px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.5px; margin-bottom:12px; }
.deal-card {
  background:var(--bg-3); padding:14px; border-radius:8px;
  margin-bottom:8px; display:flex; justify-content:space-between;
  font-size:13px;
}
.deal-card span { color:var(--ok); font-weight:600; }

@media (max-width:768px) {
  body { grid-template-columns:1fr; }
  .sidebar { display:none; }
  .main { padding:20px; }
}`,
      "script.js": `const CLIENTS = [
  { name: "Ana García", email: "ana@tech.com", company: "TechCorp", status: "active", value: 12500 },
  { name: "Carlos Ruiz", email: "carlos@design.io", company: "Design.io", status: "pending", value: 8200 },
  { name: "María López", email: "maria@startup.co", company: "Startup.co", status: "active", value: 24000 },
  { name: "Juan Pérez", email: "juan@bigco.com", company: "BigCo", status: "active", value: 48000 },
  { name: "Sofía Martín", email: "sofia@agency.es", company: "Agency", status: "pending", value: 5200 },
];

document.getElementById("clientsTable").innerHTML = CLIENTS.map(c => \`
  <tr>
    <td><b>\${c.name}</b></td>
    <td>\${c.email}</td>
    <td>\${c.company}</td>
    <td><span class="badge \${c.status}">\${c.status === "active" ? "Activo" : "Pendiente"}</span></td>
    <td>$\${c.value.toLocaleString()}</td>
  </tr>
\`).join("");

const CHART_DATA = [65, 45, 80, 55, 90, 70, 85];
document.getElementById("chart").innerHTML = CHART_DATA.map(v =>
  '<div class="bar" style="height:' + v + '%"></div>'
).join("");

document.querySelectorAll(".sidebar-nav a").forEach(link => {
  link.onclick = () => {
    document.querySelectorAll(".sidebar-nav a").forEach(l => l.classList.remove("active"));
    link.classList.add("active");
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    const viewId = "view-" + link.dataset.view;
    const target = document.getElementById(viewId);
    if (target) target.classList.add("active");
    document.getElementById("pageTitle").textContent =
      link.textContent.replace(/[^a-zA-Z ]/g, "").trim();
  };
});`
    }
  }
};