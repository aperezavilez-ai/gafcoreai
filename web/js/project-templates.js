// ============================================================
//  Imports de templates extra
// ============================================================
import { TEMPLATES_EXTRA }  from "./templates-extra.js";
import { TEMPLATES_EXTRA2 } from "./templates-extra2.js";
import { TEMPLATES_EXTRA3 } from "./templates-extra3.js";
import { TEMPLATES_EXTRA4 } from "./templates-extra4.js";
// ============================================================
//  GafCoreAI - Plantillas profesionales de proyectos
//  Cada template genera archivos listos para web + mobile
// ============================================================

const TEMPLATES_BASE = {
  // ── Landing de alta gama con efectos ──
  "landing-premium": {
    name: "Landing Premium",
    icon: "🚀",
    description: "Landing page con hero animado, gradientes, glassmorphism, scroll effects",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#0a0a0c">
  <title>Mi Landing Premium</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="cursor-glow" id="cursorGlow"></div>

  <nav class="nav glass">
    <div class="nav-logo">◆ MiMarca</div>
    <ul class="nav-links">
      <li><a href="#features">Features</a></li>
      <li><a href="#showcase">Showcase</a></li>
      <li><a href="#contact">Contacto</a></li>
    </ul>
    <button class="nav-cta">Comenzar</button>
  </nav>

  <section class="hero">
    <div class="hero-bg">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>
    <div class="hero-content">
      <span class="hero-badge">✨ Nuevo en 2026</span>
      <h1 class="hero-title">
        Crea experiencias
        <span class="gradient-text">digitales únicas</span>
      </h1>
      <p class="hero-subtitle">
        La plataforma que combina diseño premium con tecnología de punta.
      </p>
      <div class="hero-actions">
        <button class="btn-primary">Comenzar gratis</button>
        <button class="btn-ghost">Ver demo →</button>
      </div>
      <div class="hero-stats">
        <div><b>10K+</b><span>Usuarios</span></div>
        <div><b>99.9%</b><span>Uptime</span></div>
        <div><b>4.9★</b><span>Rating</span></div>
      </div>
    </div>
  </section>

  <section class="features" id="features">
    <h2 class="section-title">Todo lo que necesitas</h2>
    <div class="features-grid">
      <div class="feature-card glass">
        <div class="feature-icon">⚡</div>
        <h3>Ultra rápido</h3>
        <p>Rendimiento optimizado desde el primer byte.</p>
      </div>
      <div class="feature-card glass">
        <div class="feature-icon">🎨</div>
        <h3>Diseño premium</h3>
        <p>Interfaces modernas con animaciones fluidas.</p>
      </div>
      <div class="feature-card glass">
        <div class="feature-icon">📱</div>
        <h3>100% responsive</h3>
        <p>Perfecto en móvil, tablet y escritorio.</p>
      </div>
      <div class="feature-card glass">
        <div class="feature-icon">🔒</div>
        <h3>Seguro</h3>
        <p>Cifrado de extremo a extremo en todo momento.</p>
      </div>
    </div>
  </section>

  <footer class="footer">
    <p>© 2026 MiMarca. Todos los derechos reservados.</p>
  </footer>

  <script src="script.js"></script>
</body>
</html>`,
      "styles.css": `* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg: #0a0a0c;
  --bg-2: #131318;
  --text: #eaeaf0;
  --text-dim: #8a8a96;
  --accent: #6d7cff;
  --accent-2: #a673ff;
  --accent-3: #ff6ba8;
}

html { scroll-behavior: smooth; }
body {
  font-family: -apple-system, "Inter", "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--text);
  overflow-x: hidden;
  line-height: 1.6;
}

/* Cursor glow */
.cursor-glow {
  position: fixed;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(109,124,255,.15), transparent 70%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
  transform: translate(-50%, -50%);
  transition: transform .3s ease-out;
}

/* Glass morphism */
.glass {
  background: rgba(19, 19, 24, .6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,.06);
}

/* Nav */
.nav {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 40px);
  max-width: 1200px;
  padding: 14px 24px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 100;
}
.nav-logo { font-weight: 700; color: var(--accent); }
.nav-links { display: flex; gap: 32px; list-style: none; }
.nav-links a {
  color: var(--text-dim);
  text-decoration: none;
  font-size: 14px;
  transition: color .2s;
}
.nav-links a:hover { color: var(--text); }
.nav-cta {
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 10px 22px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
  transition: transform .2s, background .2s;
}
.nav-cta:hover { background: #5a6bef; transform: scale(1.05); }

/* Hero */
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 140px 24px 80px;
  position: relative;
  overflow: hidden;
}
.hero-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: .5;
  animation: float 20s infinite ease-in-out;
}
.blob-1 {
  width: 500px; height: 500px;
  background: var(--accent);
  top: 10%; left: 10%;
}
.blob-2 {
  width: 400px; height: 400px;
  background: var(--accent-2);
  top: 30%; right: 10%;
  animation-delay: -7s;
}
.blob-3 {
  width: 350px; height: 350px;
  background: var(--accent-3);
  bottom: 10%; left: 40%;
  animation-delay: -14s;
}
@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(80px, -50px) scale(1.1); }
  66% { transform: translate(-60px, 40px) scale(.9); }
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 800px;
  animation: fadeUp .8s ease-out;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.hero-badge {
  display: inline-block;
  padding: 6px 16px;
  background: rgba(109,124,255,.15);
  color: var(--accent);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 24px;
  border: 1px solid rgba(109,124,255,.3);
}
.hero-title {
  font-size: clamp(36px, 6vw, 72px);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -.02em;
  margin-bottom: 24px;
}
.gradient-text {
  background: linear-gradient(135deg, #6d7cff, #a673ff, #ff6ba8);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.hero-subtitle {
  font-size: clamp(16px, 2vw, 20px);
  color: var(--text-dim);
  margin-bottom: 40px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}
.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 60px;
}
.btn-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #fff;
  border: none;
  padding: 14px 32px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform .2s, box-shadow .2s;
  box-shadow: 0 8px 32px rgba(109,124,255,.3);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(109,124,255,.5);
}
.btn-ghost {
  background: transparent;
  color: var(--text);
  border: 1px solid rgba(255,255,255,.15);
  padding: 14px 32px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all .2s;
}
.btn-ghost:hover {
  background: rgba(255,255,255,.05);
  border-color: rgba(255,255,255,.3);
}

.hero-stats {
  display: flex;
  gap: 60px;
  justify-content: center;
  flex-wrap: wrap;
}
.hero-stats > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.hero-stats b {
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, #fff, #8a8a96);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.hero-stats span {
  font-size: 12px;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Features */
.features {
  padding: 120px 24px;
  max-width: 1200px;
  margin: 0 auto;
}
.section-title {
  font-size: clamp(28px, 4vw, 44px);
  text-align: center;
  margin-bottom: 60px;
  font-weight: 800;
  letter-spacing: -.02em;
}
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}
.feature-card {
  padding: 32px 24px;
  border-radius: 20px;
  transition: transform .3s, border-color .3s;
}
.feature-card:hover {
  transform: translateY(-6px);
  border-color: rgba(109,124,255,.3);
}
.feature-icon {
  font-size: 40px;
  margin-bottom: 16px;
}
.feature-card h3 {
  font-size: 18px;
  margin-bottom: 8px;
  font-weight: 700;
}
.feature-card p {
  color: var(--text-dim);
  font-size: 14px;
}

/* Footer */
.footer {
  text-align: center;
  padding: 40px 24px;
  color: var(--text-dim);
  font-size: 13px;
  border-top: 1px solid rgba(255,255,255,.05);
}

/* ── RESPONSIVE ── */
@media (max-width: 768px) {
  .nav-links { display: none; }
  .nav { padding: 12px 18px; }
  .hero { padding: 120px 20px 60px; }
  .hero-stats { gap: 32px; }
  .hero-stats b { font-size: 24px; }
  .blob { filter: blur(80px); }
  .cursor-glow { display: none; }
}
@media (max-width: 480px) {
  .hero-actions { flex-direction: column; width: 100%; }
  .btn-primary, .btn-ghost { width: 100%; }
}`,
      "script.js": `// Cursor glow effect
const glow = document.getElementById('cursorGlow');
document.addEventListener('mousemove', (e) => {
  if (glow) {
    glow.style.transform = \`translate(\${e.clientX}px, \${e.clientY}px)\`;
  }
});

// Smooth scroll nav
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// Reveal on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.feature-card').forEach(card => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(30px)';
  card.style.transition = 'opacity .6s, transform .6s';
  observer.observe(card);
});`
    }
  },

  // ── App Mobile (PWA) ──
  "mobile-app": {
    name: "App Mobile (PWA)",
    icon: "📱",
    description: "App progresiva con navegacion inferior, gestos, offline",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#6d7cff">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <link rel="manifest" href="manifest.json">
  <title>Mi App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="app-header">
    <h1>Mi App</h1>
    <button class="icon-btn">⚙</button>
  </header>

  <main class="app-main">
    <div class="card">
      <div class="card-icon">👋</div>
      <h2>Bienvenido</h2>
      <p>Tu app está lista para usar.</p>
    </div>

    <div class="card">
      <div class="card-icon">📊</div>
      <h2>Estadísticas</h2>
      <div class="stats-row">
        <div><b>120</b><span>Items</span></div>
        <div><b>45</b><span>Activos</span></div>
      </div>
    </div>

    <div class="card">
      <div class="card-icon">⚡</div>
      <h2>Acciones rápidas</h2>
      <button class="btn-primary">Nueva tarea</button>
    </div>
  </main>

  <nav class="bottom-nav">
    <button class="nav-btn active">
      <span class="nav-icon">🏠</span>
      <span class="nav-label">Inicio</span>
    </button>
    <button class="nav-btn">
      <span class="nav-icon">🔍</span>
      <span class="nav-label">Buscar</span>
    </button>
    <button class="nav-btn">
      <span class="nav-icon">➕</span>
      <span class="nav-label">Crear</span>
    </button>
    <button class="nav-btn">
      <span class="nav-icon">👤</span>
      <span class="nav-label">Perfil</span>
    </button>
  </nav>

  <script src="script.js"></script>
</body>
</html>`,
      "styles.css": `* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg: #0f0f14;
  --bg-2: #1a1a22;
  --bg-3: #23232e;
  --text: #eaeaf0;
  --text-dim: #8a8a96;
  --accent: #6d7cff;
}

html, body {
  height: 100%;
  overflow: hidden;
}
body {
  font-family: -apple-system, "Inter", "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
}

/* Header */
.app-header {
  padding: 16px 20px;
  padding-top: max(16px, env(safe-area-inset-top));
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 10;
}
.app-header h1 { font-size: 20px; font-weight: 700; }
.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-2);
  border: none;
  color: var(--text);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Main */
.app-main {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 100px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  -webkit-overflow-scrolling: touch;
}

.card {
  background: var(--bg-2);
  border-radius: 20px;
  padding: 24px;
  transition: transform .2s;
}
.card:active { transform: scale(.98); }
.card-icon {
  font-size: 40px;
  margin-bottom: 12px;
}
.card h2 {
  font-size: 18px;
  margin-bottom: 6px;
}
.card p {
  color: var(--text-dim);
  font-size: 14px;
}

.stats-row {
  display: flex;
  gap: 32px;
  margin-top: 16px;
}
.stats-row > div {
  display: flex;
  flex-direction: column;
}
.stats-row b {
  font-size: 28px;
  font-weight: 800;
  color: var(--accent);
}
.stats-row span {
  font-size: 12px;
  color: var(--text-dim);
}

.btn-primary {
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 14px 24px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  margin-top: 16px;
  transition: transform .15s;
}
.btn-primary:active { transform: scale(.97); }

/* Bottom nav */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(15,15,20,.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255,255,255,.06);
  display: flex;
  padding: 8px 0 max(8px, env(safe-area-inset-bottom));
  z-index: 10;
}
.nav-btn {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-dim);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
  cursor: pointer;
  transition: color .2s;
}
.nav-btn.active { color: var(--accent); }
.nav-icon { font-size: 20px; }
.nav-label { font-size: 11px; font-weight: 500; }

/* Desktop: mostrar como mobile centrado */
@media (min-width: 768px) {
  body {
    max-width: 480px;
    margin: 0 auto;
    border-left: 1px solid rgba(255,255,255,.06);
    border-right: 1px solid rgba(255,255,255,.06);
  }
  .bottom-nav {
    max-width: 480px;
    left: 50%;
    transform: translateX(-50%);
  }
}`,
      "script.js": `// Bottom nav interactions
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Service Worker (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    console.log('PWA listo');
  });
}`,
      "manifest.json": `{
  "name": "Mi App",
  "short_name": "MiApp",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#0f0f14",
  "theme_color": "#6d7cff",
  "orientation": "portrait",
  "icons": []
}`
    }
  },

  // ── Dashboard / SaaS ──
  "dashboard-saas": {
    name: "Dashboard SaaS",
    icon: "📊",
    description: "Panel de control con sidebar, gráficos y tarjetas de stats",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <aside class="sidebar">
    <div class="sidebar-brand">◆ Panel</div>
    <nav class="sidebar-nav">
      <a class="active">📊 Dashboard</a>
      <a>📁 Proyectos</a>
      <a>👥 Equipo</a>
      <a>💬 Mensajes</a>
      <a>⚙ Ajustes</a>
    </nav>
  </aside>

  <main class="main">
    <header class="main-header">
      <h1>Dashboard</h1>
      <div class="user">
        <div class="avatar">A</div>
        <span>Admin</span>
      </div>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-label">Ingresos</span>
        <b class="stat-value">$48,290</b>
        <span class="stat-trend up">+12.5%</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Usuarios</span>
        <b class="stat-value">2,847</b>
        <span class="stat-trend up">+8.2%</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Órdenes</span>
        <b class="stat-value">1,234</b>
        <span class="stat-trend down">-3.1%</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Conversión</span>
        <b class="stat-value">3.48%</b>
        <span class="stat-trend up">+0.8%</span>
      </div>
    </div>

    <div class="chart-card">
      <h3>Actividad semanal</h3>
      <div class="chart">
        <div class="bar" style="height: 40%"></div>
        <div class="bar" style="height: 65%"></div>
        <div class="bar" style="height: 45%"></div>
        <div class="bar" style="height: 80%"></div>
        <div class="bar" style="height: 55%"></div>
        <div class="bar" style="height: 90%"></div>
        <div class="bar" style="height: 70%"></div>
      </div>
    </div>
  </main>

  <script src="script.js"></script>
</body>
</html>`,
      "styles.css": `* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg: #0f0f14;
  --bg-2: #1a1a22;
  --bg-3: #23232e;
  --text: #eaeaf0;
  --text-dim: #8a8a96;
  --accent: #6d7cff;
  --ok: #4ec9a0;
  --err: #ef5a5a;
}

html, body { height: 100%; }
body {
  font-family: -apple-system, "Inter", "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--text);
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}

.sidebar {
  background: var(--bg-2);
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  border-right: 1px solid rgba(255,255,255,.05);
}
.sidebar-brand {
  font-size: 18px;
  font-weight: 800;
  color: var(--accent);
  padding: 0 12px;
}
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sidebar-nav a {
  padding: 10px 12px;
  color: var(--text-dim);
  text-decoration: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13.5px;
  transition: all .15s;
}
.sidebar-nav a:hover { background: var(--bg-3); color: var(--text); }
.sidebar-nav a.active { background: var(--bg-3); color: var(--accent); }

.main {
  padding: 28px 32px;
  overflow-y: auto;
}
.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}
.main-header h1 { font-size: 24px; font-weight: 700; }
.user {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #a673ff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.stat-card {
  background: var(--bg-2);
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stat-label {
  font-size: 11.5px;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: .5px;
}
.stat-value {
  font-size: 26px;
  font-weight: 800;
}
.stat-trend {
  font-size: 11.5px;
  font-weight: 600;
}
.stat-trend.up { color: var(--ok); }
.stat-trend.down { color: var(--err); }

.chart-card {
  background: var(--bg-2);
  border-radius: 14px;
  padding: 24px;
}
.chart-card h3 { font-size: 14px; margin-bottom: 20px; }
.chart {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  height: 200px;
}
.bar {
  flex: 1;
  background: linear-gradient(180deg, var(--accent), #a673ff);
  border-radius: 8px 8px 0 0;
  min-height: 20px;
  transition: height .4s ease-out;
}

@media (max-width: 768px) {
  body { grid-template-columns: 1fr; }
  .sidebar { display: none; }
  .main { padding: 20px; }
}`
    }
  }
};

/**
 * Aplica un template al state.projectFiles
 */
export const TEMPLATES = Object.assign({},
  TEMPLATES_BASE,
  TEMPLATES_EXTRA,
  TEMPLATES_EXTRA2,
  TEMPLATES_EXTRA3,
  TEMPLATES_EXTRA4
);
export function applyTemplate(templateId, state) {
  const tpl = TEMPLATES[templateId];
  if (!tpl) return { ok: false, error: "Template no existe" };

  if (!state.projectFiles) state.projectFiles = {};

  Object.keys(tpl.files).forEach(path => {
    state.projectFiles[path] = tpl.files[path];
  });

  return { ok: true, files: Object.keys(tpl.files).length };
}

/**
 * Lista de templates disponibles
 */
export function listTemplates() {
  return Object.keys(TEMPLATES).map(id => ({
    id,
    name: TEMPLATES[id].name,
    icon: TEMPLATES[id].icon,
    description: TEMPLATES[id].description,
    filesCount: Object.keys(TEMPLATES[id].files).length
  }));
}