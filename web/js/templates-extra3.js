// ============================================================
//  GafCoreAI - Templates Extra (batch 3/4)
//  Premium: Awwwards Portfolio, 3D Landing, Agency
//  Usan GSAP + ScrollTrigger + Three.js + Lenis
// ============================================================

export const TEMPLATES_EXTRA3 = {

  // ═══════════════════════════════════════════════════════════
  //  10. PORTFOLIO AWWWARDS
  // ═══════════════════════════════════════════════════════════
  "portfolio-awwwards": {
    name: "Portfolio Awwwards",
    icon: "&#127942;",
    description: "Portfolio premium con GSAP, cursor custom, scroll suave y animaciones avanzadas",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Studio — Portfolio</title>
<link rel="stylesheet" href="styles.css">
<!-- Librerias premium -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js"></script>
</head>
<body>
<div class="cursor" id="cursor"></div>
<div class="cursor-follower" id="cursorFollower"></div>

<div class="loader" id="loader">
  <div class="loader-text">STUDIO<span>.</span></div>
</div>

<nav class="nav">
  <div class="brand">STUDIO<span>.</span></div>
  <ul class="nav-links">
    <li><a href="#work" data-cursor="hover">Trabajo</a></li>
    <li><a href="#about" data-cursor="hover">Sobre mí</a></li>
    <li><a href="#contact" data-cursor="hover">Contacto</a></li>
  </ul>
  <div class="nav-time" id="navTime">00:00</div>
</nav>

<header class="hero">
  <div class="hero-inner">
    <div class="hero-line" data-reveal>
      <span class="hero-label">(01)</span>
      <h1 class="hero-title">
        <span class="word">Diseño</span>
        <span class="word">digital</span>
      </h1>
    </div>
    <div class="hero-line" data-reveal>
      <span class="hero-label">(02)</span>
      <h1 class="hero-title">
        <span class="word gradient">sin límites</span>
      </h1>
    </div>
  </div>
  <div class="hero-footer">
    <div class="hero-tagline">
      Creo experiencias digitales para marcas que quieren destacar.
    </div>
    <div class="hero-scroll">
      <span>Scroll</span>
      <div class="scroll-line"></div>
    </div>
  </div>
</header>

<section class="marquee">
  <div class="marquee-track">
    <span>CREATIVO</span><span>·</span>
    <span>MINIMALISTA</span><span>·</span>
    <span>FUNCIONAL</span><span>·</span>
    <span>PREMIUM</span><span>·</span>
    <span>CREATIVO</span><span>·</span>
    <span>MINIMALISTA</span><span>·</span>
    <span>FUNCIONAL</span><span>·</span>
    <span>PREMIUM</span><span>·</span>
  </div>
</section>

<section class="work" id="work">
  <div class="section-head">
    <span class="section-num">(03)</span>
    <h2 class="section-title">Trabajo reciente</h2>
  </div>

  <div class="work-grid">
    <article class="work-item" data-cursor="view">
      <div class="work-img" style="--c1:#ff6b9d;--c2:#a673ff">
        <div class="work-shape"></div>
      </div>
      <div class="work-info">
        <h3>Proyecto Aurora</h3>
        <p>Branding · Web · 2026</p>
      </div>
    </article>

    <article class="work-item" data-cursor="view">
      <div class="work-img" style="--c1:#5b7cfa;--c2:#4ec9a0">
        <div class="work-shape"></div>
      </div>
      <div class="work-info">
        <h3>Nexus Platform</h3>
        <p>Product Design · 2026</p>
      </div>
    </article>

    <article class="work-item" data-cursor="view">
      <div class="work-img" style="--c1:#f0a545;--c2:#ef5a5a">
        <div class="work-shape"></div>
      </div>
      <div class="work-info">
        <h3>Vermillion Studio</h3>
        <p>Web · Motion · 2025</p>
      </div>
    </article>

    <article class="work-item" data-cursor="view">
      <div class="work-img" style="--c1:#4ec9a0;--c2:#5b7cfa">
        <div class="work-shape"></div>
      </div>
      <div class="work-info">
        <h3>Kairos App</h3>
        <p>Mobile · UX · 2025</p>
      </div>
    </article>
  </div>
</section>

<section class="about" id="about">
  <div class="section-head">
    <span class="section-num">(04)</span>
    <h2 class="section-title">Sobre mí</h2>
  </div>
  <p class="about-text" data-reveal>
    Diseñador y desarrollador con 8 años creando productos digitales. 
    Especializado en interfaces de alto impacto visual sin sacrificar rendimiento.
  </p>
  <div class="skills-row">
    <span>Figma</span><span>GSAP</span><span>Three.js</span>
    <span>React</span><span>WebGL</span><span>Motion</span>
  </div>
</section>

<section class="contact" id="contact">
  <div class="contact-inner">
    <div class="section-head">
      <span class="section-num">(05)</span>
      <h2 class="section-title">Hablemos</h2>
    </div>
    <a href="mailto:hola@studio.com" class="contact-link" data-cursor="hover">
      hola@studio.com
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M7 17L17 7M17 7H8M17 7v9"/>
      </svg>
    </a>
    <div class="contact-social">
      <a href="#" data-cursor="hover">Instagram</a>
      <a href="#" data-cursor="hover">Dribbble</a>
      <a href="#" data-cursor="hover">LinkedIn</a>
      <a href="#" data-cursor="hover">X / Twitter</a>
    </div>
  </div>
  <footer class="footer">
    <div>&copy; 2026 Studio. Todos los derechos reservados.</div>
    <div>Diseñado en CDMX · Construido con GSAP + Lenis</div>
  </footer>
</section>

<script src="script.js"></script>
</body>
</html>`,
      "styles.css": `*{margin:0;padding:0;box-sizing:border-box}
::selection{background:#fff;color:#000}
:root{--bg:#0a0a0c;--bg-2:#13131a;--text:#f0f0f5;--dim:#8a8a96;--accent:#a673ff}
html,body{overflow-x:hidden}
body{font-family:-apple-system,"Inter",sans-serif;background:var(--bg);color:var(--text);line-height:1.4;cursor:none;-webkit-font-smoothing:antialiased}
a{cursor:none}

/* ═══════════════════════════════════════════
   CURSOR CUSTOM
   ═══════════════════════════════════════════ */
.cursor,.cursor-follower{position:fixed;pointer-events:none;z-index:9999;border-radius:50%;mix-blend-mode:difference;will-change:transform}
.cursor{width:8px;height:8px;background:#fff;transform:translate(-50%,-50%);transition:width .3s,height .3s,background .3s}
.cursor.hover{width:0;height:0}
.cursor.view{width:80px;height:80px;background:#a673ff;mix-blend-mode:normal;display:flex;align-items:center;justify-content:center}
.cursor.view::after{content:"VER";font-size:10px;font-weight:700;color:#fff;letter-spacing:1px;opacity:0;transition:opacity .2s}
.cursor.view.on::after{opacity:1}
.cursor-follower{width:40px;height:40px;border:1px solid rgba(255,255,255,.3);transform:translate(-50%,-50%);transition:all .15s ease-out}

@media (max-width:768px){.cursor,.cursor-follower{display:none}body{cursor:auto}a{cursor:pointer}}

/* ═══════════════════════════════════════════
   LOADER
   ═══════════════════════════════════════════ */
.loader{position:fixed;inset:0;background:var(--bg);z-index:10000;display:flex;align-items:center;justify-content:center}
.loader-text{font-size:clamp(48px,10vw,120px);font-weight:800;letter-spacing:-.04em;font-family:-apple-system,"Inter",sans-serif}
.loader-text span{color:var(--accent);display:inline-block;animation:dotpulse 1s infinite}
@keyframes dotpulse{0%,100%{opacity:1}50%{opacity:.3}}

/* ═══════════════════════════════════════════
   NAV
   ═══════════════════════════════════════════ */
.nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;justify-content:space-between;align-items:center;padding:24px 40px;mix-blend-mode:difference}
.brand{font-weight:800;font-size:18px;color:#fff;letter-spacing:-.02em}
.brand span{color:var(--accent)}
.nav-links{display:flex;gap:36px;list-style:none}
.nav-links a{color:#fff;text-decoration:none;font-size:13px;font-weight:500;letter-spacing:.02em;position:relative;padding:4px 0}
.nav-links a::after{content:"";position:absolute;bottom:0;left:0;width:0;height:1px;background:#fff;transition:width .3s ease}
.nav-links a:hover::after{width:100%}
.nav-time{font-size:12px;font-family:Consolas,monospace;color:#fff;font-weight:500}

/* ═══════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════ */
.hero{min-height:100vh;padding:120px 40px 40px;display:flex;flex-direction:column;justify-content:space-between;position:relative}
.hero-inner{max-width:1400px;width:100%;margin:0 auto;flex:1;display:flex;flex-direction:column;justify-content:center;gap:8px}
.hero-line{display:flex;align-items:baseline;gap:24px;margin-bottom:8px}
.hero-label{font-size:12px;color:var(--dim);font-family:Consolas,monospace;flex-shrink:0}
.hero-title{font-size:clamp(56px,12vw,180px);font-weight:800;letter-spacing:-.045em;line-height:.95;display:flex;flex-wrap:wrap;gap:0 32px}
.hero-title .word{display:inline-block;overflow:hidden;position:relative}
.hero-title .word::after{content:"";position:absolute;inset:0;background:var(--bg);transform-origin:right;transform:scaleX(0);z-index:1}
.gradient{background:linear-gradient(135deg,#5b7cfa,#a673ff,#ff6b9d);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}

.hero-footer{max-width:1400px;width:100%;margin:0 auto;display:flex;justify-content:space-between;align-items:flex-end;gap:40px}
.hero-tagline{max-width:400px;font-size:16px;color:var(--dim);line-height:1.6}
.hero-scroll{display:flex;flex-direction:column;align-items:center;gap:12px;font-size:11px;text-transform:uppercase;letter-spacing:.2em;color:var(--dim)}
.scroll-line{width:1px;height:60px;background:linear-gradient(180deg,var(--dim),transparent);position:relative;overflow:hidden}
.scroll-line::after{content:"";position:absolute;top:0;left:0;width:100%;height:30%;background:#fff;animation:scrolldown 2s infinite}
@keyframes scrolldown{0%{transform:translateY(-100%)}100%{transform:translateY(400%)}}

/* ═══════════════════════════════════════════
   MARQUEE
   ═══════════════════════════════════════════ */
.marquee{padding:60px 0;overflow:hidden;border-top:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08)}
.marquee-track{display:flex;gap:40px;white-space:nowrap;animation:marquee 25s linear infinite;will-change:transform}
.marquee-track span{font-size:clamp(40px,7vw,90px);font-weight:800;letter-spacing:-.03em;color:#fff}
.marquee-track span:nth-child(even){color:var(--accent);opacity:.5}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}

/* ═══════════════════════════════════════════
   WORK
   ═══════════════════════════════════════════ */
.work{padding:120px 40px}
.section-head{display:flex;align-items:baseline;gap:20px;margin-bottom:60px;max-width:1400px;margin-left:auto;margin-right:auto}
.section-num{font-size:13px;color:var(--dim);font-family:Consolas,monospace}
.section-title{font-size:clamp(32px,5vw,56px);font-weight:800;letter-spacing:-.03em}

.work-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:60px 40px;max-width:1400px;margin:0 auto}
.work-item{position:relative;cursor:none}
.work-img{aspect-ratio:4/3;border-radius:16px;overflow:hidden;background:linear-gradient(135deg,var(--c1),var(--c2));position:relative}
.work-shape{position:absolute;inset:0;background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.35),transparent 60%);transition:transform .8s cubic-bezier(.4,0,.2,1)}
.work-item:hover .work-shape{transform:scale(1.5)}
.work-info{margin-top:20px;display:flex;justify-content:space-between;align-items:baseline;gap:16px}
.work-info h3{font-size:22px;font-weight:700;letter-spacing:-.02em}
.work-info p{font-size:12.5px;color:var(--dim);font-family:Consolas,monospace}

/* ═══════════════════════════════════════════
   ABOUT
   ═══════════════════════════════════════════ */
.about{padding:120px 40px;max-width:1400px;margin:0 auto}
.about-text{font-size:clamp(24px,3.5vw,42px);font-weight:600;letter-spacing:-.025em;line-height:1.3;margin-bottom:60px;max-width:1000px}
.skills-row{display:flex;flex-wrap:wrap;gap:12px}
.skills-row span{background:var(--bg-2);border:1px solid rgba(255,255,255,.08);padding:8px 18px;border-radius:999px;font-size:13px;color:#c8c8d0;transition:all .2s;cursor:none}
.skills-row span:hover{background:#fff;color:#000;border-color:#fff}

/* ═══════════════════════════════════════════
   CONTACT
   ═══════════════════════════════════════════ */
.contact{padding:120px 40px 40px;min-height:80vh;display:flex;flex-direction:column;justify-content:space-between;border-top:1px solid rgba(255,255,255,.08)}
.contact-inner{max-width:1400px;width:100%;margin:0 auto;flex:1;display:flex;flex-direction:column;justify-content:center}
.contact-link{font-size:clamp(32px,6vw,72px);font-weight:800;color:#fff;text-decoration:none;letter-spacing:-.03em;display:inline-flex;align-items:center;gap:24px;margin-bottom:60px;transition:color .3s;position:relative}
.contact-link:hover{color:var(--accent)}
.contact-link svg{transition:transform .4s ease}
.contact-link:hover svg{transform:translate(12px,-12px) rotate(-15deg)}
.contact-social{display:flex;gap:40px;flex-wrap:wrap}
.contact-social a{color:var(--dim);text-decoration:none;font-size:14px;position:relative;padding:4px 0}
.contact-social a::after{content:"";position:absolute;bottom:0;left:0;width:0;height:1px;background:#fff;transition:width .3s}
.contact-social a:hover{color:#fff}
.contact-social a:hover::after{width:100%}

.footer{max-width:1400px;width:100%;margin:0 auto;display:flex;justify-content:space-between;align-items:center;padding-top:40px;border-top:1px solid rgba(255,255,255,.06);font-size:12px;color:var(--dim);font-family:Consolas,monospace;flex-wrap:wrap;gap:16px}

/* ═══════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════ */
@media (max-width:768px){
  .nav{padding:18px 20px}
  .nav-links{display:none}
  .hero{padding:100px 20px 30px}
  .hero-footer{flex-direction:column;align-items:flex-start;gap:24px}
  .work{padding:80px 20px}
  .work-grid{grid-template-columns:1fr;gap:40px}
  .about{padding:80px 20px}
  .contact{padding:80px 20px 30px}
  .contact-social{gap:20px}
  .footer{flex-direction:column;text-align:center;gap:8px}
}`,
      "script.js": `// ═══════════════════════════════════════════════════════════
//  PORTFOLIO AWWWARDS - Scripts premium
// ═══════════════════════════════════════════════════════════

gsap.registerPlugin(ScrollTrigger);

// ─── 1. Lenis (scroll suave) ───────────────────────────
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// ─── 2. Cursor custom ──────────────────────────────────
const cursor = document.getElementById("cursor");
const follower = document.getElementById("cursorFollower");
let mx = 0, my = 0, cx = 0, cy = 0;

document.addEventListener("mousemove", (e) => {
  mx = e.clientX;
  my = e.clientY;
  gsap.to(cursor, { x: mx, y: my, duration: 0.1 });
});

function animateFollower() {
  cx += (mx - cx) * 0.15;
  cy += (my - cy) * 0.15;
  follower.style.transform = "translate(" + cx + "px," + cy + "px) translate(-50%,-50%)";
  requestAnimationFrame(animateFollower);
}
animateFollower();

// Hover sobre links
document.querySelectorAll("a, [data-cursor='hover']").forEach(el => {
  el.addEventListener("mouseenter", () => cursor.classList.add("hover"));
  el.addEventListener("mouseleave", () => cursor.classList.remove("hover"));
});

// Ver proyecto
document.querySelectorAll("[data-cursor='view']").forEach(el => {
  el.addEventListener("mouseenter", () => {
    cursor.classList.add("view");
    setTimeout(() => cursor.classList.add("on"), 100);
  });
  el.addEventListener("mouseleave", () => {
    cursor.classList.remove("view");
    cursor.classList.remove("on");
  });
});

// ─── 3. Loader ─────────────────────────────────────────
const tl = gsap.timeline();
tl.to(".loader", { y: "-100%", duration: 1, ease: "expo.inOut", delay: 1.2 })
  .set(".loader", { display: "none" });

// ─── 4. Hero reveal ────────────────────────────────────
tl.from(".hero-title .word", {
  y: 120,
  opacity: 0,
  duration: 1.2,
  stagger: 0.15,
  ease: "expo.out"
}, "-=0.3");

tl.from(".hero-label", { opacity: 0, x: -20, duration: 0.8, stagger: 0.1 }, "-=1");
tl.from(".hero-footer > *", { opacity: 0, y: 30, duration: 0.8, stagger: 0.15 }, "-=0.6");

// ─── 5. Marquee infinito ────────────────────────────────
// ya esta en CSS con animation

// ─── 6. Work items reveal on scroll ─────────────────────
gsap.utils.toArray(".work-item").forEach((item, i) => {
  gsap.from(item, {
    scrollTrigger: {
      trigger: item,
      start: "top 85%",
      toggleActions: "play none none none"
    },
    y: 100,
    opacity: 0,
    duration: 1.2,
    delay: (i % 2) * 0.15,
    ease: "expo.out"
  });
});

// ─── 7. About text reveal ──────────────────────────────
gsap.from(".about-text", {
  scrollTrigger: {
    trigger: ".about-text",
    start: "top 80%"
  },
  y: 60,
  opacity: 0,
  duration: 1.2,
  ease: "expo.out"
});

// ─── 8. Skills stagger ─────────────────────────────────
gsap.from(".skills-row span", {
  scrollTrigger: {
    trigger: ".skills-row",
    start: "top 90%"
  },
  y: 30,
  opacity: 0,
  duration: 0.6,
  stagger: 0.06,
  ease: "power2.out"
});

// ─── 9. Contact link expand ─────────────────────────────
gsap.from(".contact-link", {
  scrollTrigger: {
    trigger: ".contact-link",
    start: "top 85%"
  },
  y: 80,
  opacity: 0,
  duration: 1.4,
  ease: "expo.out"
});

// ─── 10. Section titles reveal ─────────────────────────
gsap.utils.toArray(".section-title").forEach(title => {
  gsap.from(title, {
    scrollTrigger: { trigger: title, start: "top 85%" },
    y: 40,
    opacity: 0,
    duration: 1,
    ease: "expo.out"
  });
});

// ─── 11. Nav time ──────────────────────────────────────
function updateTime() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  document.getElementById("navTime").textContent = h + ":" + m;
}
updateTime();
setInterval(updateTime, 30000);

// ─── 12. Smooth anchors con Lenis ──────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute("href"));
    if (target) lenis.scrollTo(target, { duration: 1.6 });
  });
});
`
    }
  },

  // ═══════════════════════════════════════════════════════════
  //  11. LANDING 3D PRODUCTO
  // ═══════════════════════════════════════════════════════════
  "landing-3d-product": {
    name: "Landing 3D Producto",
    icon: "&#127760;",
    description: "Landing con Three.js, animación 3D del producto y scroll cinematográfico",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Producto 3D</title>
<link rel="stylesheet" href="styles.css">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js"></script>
</head>
<body>

<nav class="nav">
  <div class="brand">◆ AURORA</div>
  <ul class="nav-links">
    <li><a href="#features">Features</a></li>
    <li><a href="#specs">Specs</a></li>
    <li><a href="#buy">Comprar</a></li>
  </ul>
  <button class="nav-cta">Preordenar</button>
</nav>

<canvas id="scene3d"></canvas>

<section class="hero">
  <div class="hero-content">
    <div class="hero-eyebrow">NEW · 2026</div>
    <h1 class="hero-title">
      Aurora<br>
      <span class="gradient">Pro</span>
    </h1>
    <p class="hero-sub">El dispositivo definitivo. Diseño minimalista, potencia máxima.</p>
    <div class="hero-cta">
      <a href="#buy" class="btn-primary">Preordenar — $999</a>
      <a href="#features" class="btn-ghost">Ver más →</a>
    </div>
  </div>
  <div class="hero-scroll-hint">
    <span>Scroll</span>
    <div class="scroll-line"></div>
  </div>
</section>

<section class="features" id="features">
  <div class="section-inner">
    <div class="section-label">(01) Features</div>
    <h2 class="section-title">Diseñado para<br><em>rendir</em></h2>

    <div class="features-grid">
      <div class="feature">
        <div class="feature-icon">⚡</div>
        <h3>Procesador M4 Ultra</h3>
        <p>2x más rápido que la generación anterior. Consumo mínimo.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">🎨</div>
        <h3>Pantalla ProMotion</h3>
        <p>120Hz adaptativo, 2000 nits pico, HDR10+.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">🔋</div>
        <h3>Batería infinita</h3>
        <p>Hasta 48 horas de uso real. Carga en 20 minutos.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">🎧</div>
        <h3>Audio espacial</h3>
        <p>4 altavoces con audio tridimensional. Dolby Atmos.</p>
      </div>
    </div>
  </div>
</section>

<section class="specs" id="specs">
  <div class="section-inner">
    <div class="section-label">(02) Especificaciones</div>
    <div class="specs-grid">
      <div class="spec"><span>Pantalla</span><b>6.7" OLED ProMotion</b></div>
      <div class="spec"><span>Procesador</span><b>Aurora M4 Ultra</b></div>
      <div class="spec"><span>RAM</span><b>24 GB LPDDR5</b></div>
      <div class="spec"><span>Storage</span><b>512 GB / 1 TB / 2 TB</b></div>
      <div class="spec"><span>Batería</span><b>5000 mAh</b></div>
      <div class="spec"><span>Cámara</span><b>200 MP + 48 MP ultrawide</b></div>
      <div class="spec"><span>Peso</span><b>189 g</b></div>
      <div class="spec"><span>Conectividad</span><b>5G + WiFi 7 + BT 5.4</b></div>
    </div>
  </div>
</section>

<section class="buy" id="buy">
  <div class="section-inner">
    <div class="buy-card">
      <div class="buy-badge">Preorden</div>
      <h2>Aurora Pro</h2>
      <div class="buy-price">
        <span class="currency">$</span>999
        <small>o 24 pagos de $45</small>
      </div>
      <ul class="buy-features">
        <li>✓ Envío gratis mundial</li>
        <li>✓ Garantía 2 años</li>
        <li>✓ 30 días de devolución</li>
        <li>✓ Soporte 24/7</li>
      </ul>
      <button class="btn-primary full">Comprar ahora</button>
      <div class="buy-note">Disponible Noviembre 2026</div>
    </div>
  </div>
</section>

<footer class="footer">
  <div>◆ Aurora © 2026</div>
  <div>Made with Three.js + GSAP</div>
</footer>

<script src="script.js"></script>
</body>
</html>`,
      "styles.css": `*{margin:0;padding:0;box-sizing:border-box}
::selection{background:#fff;color:#000}
:root{--bg:#08080c;--bg-2:#13131a;--text:#f0f0f5;--dim:#8a8a96;--accent:#5b7cfa;--accent-2:#a673ff}
body{font-family:-apple-system,"Inter",sans-serif;background:var(--bg);color:var(--text);line-height:1.5;overflow-x:hidden;-webkit-font-smoothing:antialiased}

/* ═══════════════════════════════════════════
   THREE.JS CANVAS
   ═══════════════════════════════════════════ */
#scene3d{position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:0;pointer-events:none}

/* ═══════════════════════════════════════════
   NAV
   ═══════════════════════════════════════════ */
.nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;justify-content:space-between;align-items:center;padding:20px 40px;background:rgba(8,8,12,.6);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.05)}
.brand{font-weight:800;font-size:16px;letter-spacing:-.02em}
.nav-links{display:flex;gap:32px;list-style:none}
.nav-links a{color:var(--dim);text-decoration:none;font-size:13.5px;transition:.15s}
.nav-links a:hover{color:var(--text)}
.nav-cta{background:var(--accent);color:#fff;border:none;padding:10px 20px;border-radius:999px;font-weight:600;font-size:13px;cursor:pointer;transition:.15s}
.nav-cta:hover{background:#6d8cff;transform:translateY(-1px)}

/* ═══════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════ */
.hero{position:relative;z-index:2;min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding:100px 40px 40px;pointer-events:none}
.hero-content{max-width:900px;margin:0 auto;width:100%;pointer-events:auto}
.hero-eyebrow{display:inline-block;background:rgba(91,124,250,.15);color:#8b9eff;padding:6px 16px;border-radius:999px;font-size:11.5px;font-weight:700;letter-spacing:.15em;margin-bottom:24px;border:1px solid rgba(91,124,250,.3)}
.hero-title{font-size:clamp(72px,14vw,200px);font-weight:800;letter-spacing:-.05em;line-height:.88;margin-bottom:32px}
.gradient{background:linear-gradient(135deg,#5b7cfa,#a673ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.hero-sub{font-size:clamp(16px,2vw,20px);color:var(--dim);max-width:500px;margin-bottom:44px;line-height:1.6}
.hero-cta{display:flex;gap:16px;flex-wrap:wrap}
.btn-primary{background:linear-gradient(135deg,#5b7cfa,#a673ff);color:#fff;border:none;padding:16px 32px;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block;transition:.2s;box-shadow:0 8px 32px rgba(91,124,250,.35)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(91,124,250,.5)}
.btn-primary.full{display:block;text-align:center;width:100%}
.btn-ghost{background:transparent;color:var(--text);border:1px solid rgba(255,255,255,.15);padding:16px 32px;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block;transition:.2s}
.btn-ghost:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.3)}

.hero-scroll-hint{position:absolute;bottom:40px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:12px;font-size:10.5px;letter-spacing:.2em;color:var(--dim);text-transform:uppercase}
.scroll-line{width:1px;height:50px;background:linear-gradient(180deg,var(--dim),transparent);position:relative;overflow:hidden}
.scroll-line::after{content:"";position:absolute;top:0;left:0;width:100%;height:30%;background:#fff;animation:scrolldown 2s infinite}
@keyframes scrolldown{0%{transform:translateY(-100%)}100%{transform:translateY(400%)}}

/* ═══════════════════════════════════════════
   SECTIONS
   ═══════════════════════════════════════════ */
.features,.specs,.buy{position:relative;z-index:2;padding:140px 40px}
.features{background:linear-gradient(180deg,transparent 0%,var(--bg) 20%)}
.specs,.buy{background:var(--bg)}
.buy{padding-bottom:80px}
.section-inner{max-width:1200px;margin:0 auto}
.section-label{font-size:12px;color:var(--dim);font-family:Consolas,monospace;letter-spacing:.1em;margin-bottom:24px}
.section-title{font-size:clamp(40px,6vw,80px);font-weight:800;letter-spacing:-.04em;line-height:1;margin-bottom:80px}
.section-title em{font-style:italic;font-weight:400;background:linear-gradient(135deg,#5b7cfa,#a673ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}

.features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}
.feature{background:var(--bg-2);border:1px solid rgba(255,255,255,.06);border-radius:20px;padding:32px;transition:.3s}
.feature:hover{transform:translateY(-6px);border-color:rgba(91,124,250,.3);box-shadow:0 20px 60px rgba(91,124,250,.15)}
.feature-icon{font-size:36px;margin-bottom:20px}
.feature h3{font-size:19px;font-weight:700;margin-bottom:10px;letter-spacing:-.01em}
.feature p{color:var(--dim);font-size:14.5px;line-height:1.6}

.specs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1px;background:rgba(255,255,255,.06);border-radius:20px;overflow:hidden}
.spec{background:var(--bg);padding:28px 32px;display:flex;flex-direction:column;gap:8px}
.spec span{font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.1em;font-weight:700}
.spec b{font-size:18px;font-weight:600;letter-spacing:-.01em}

.buy-card{background:linear-gradient(180deg,rgba(91,124,250,.08),var(--bg-2));border:1px solid rgba(91,124,250,.25);border-radius:28px;padding:60px 48px;max-width:540px;margin:0 auto;position:relative;text-align:center}
.buy-badge{position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#5b7cfa,#a673ff);color:#fff;padding:6px 18px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;box-shadow:0 8px 24px rgba(91,124,250,.4)}
.buy-card h2{font-size:28px;font-weight:800;margin-bottom:20px;letter-spacing:-.02em}
.buy-price{font-size:72px;font-weight:800;letter-spacing:-.04em;margin-bottom:8px;display:flex;align-items:flex-start;justify-content:center;gap:8px}
.buy-price .currency{font-size:36px;margin-top:12px}
.buy-price small{display:block;font-size:13px;color:var(--dim);font-weight:500;letter-spacing:0;align-self:center;margin-top:20px}
.buy-features{list-style:none;margin:40px 0;display:flex;flex-direction:column;gap:14px;text-align:left}
.buy-features li{font-size:14.5px;color:#c8c8d0;padding-left:8px}
.buy-note{margin-top:20px;font-size:12.5px;color:var(--dim)}

.footer{position:relative;z-index:2;padding:40px;display:flex;justify-content:space-between;align-items:center;background:var(--bg);border-top:1px solid rgba(255,255,255,.06);font-size:12px;color:var(--dim);font-family:Consolas,monospace;flex-wrap:wrap;gap:12px}

@media (max-width:768px){
  .nav{padding:16px 20px}
  .nav-links{display:none}
  .hero{padding:100px 20px 40px}
  .features,.specs,.buy{padding:80px 20px}
  .buy-card{padding:48px 24px}
  .buy-price{font-size:56px}
  .footer{flex-direction:column;text-align:center;gap:8px}
}`,
      "script.js": `// ═══════════════════════════════════════════════════════════
//  LANDING 3D - Three.js + GSAP + Lenis
// ═══════════════════════════════════════════════════════════

gsap.registerPlugin(ScrollTrigger);

// ─── 1. Lenis (scroll suave) ───────────────────────────
const lenis = new Lenis({
  duration: 1.3,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true
});
function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// ─── 2. Three.js scene ────────────────────────────────
const canvas = document.getElementById("scene3d");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 6);

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ─── 3. Objeto 3D (torus + esfera interior) ───────────
const group = new THREE.Group();

const geometry = new THREE.TorusKnotGeometry(1, 0.35, 128, 32);
const material = new THREE.MeshPhysicalMaterial({
  color: 0x5b7cfa,
  emissive: 0x5b7cfa,
  emissiveIntensity: 0.3,
  metalness: 0.9,
  roughness: 0.15,
  clearcoat: 1,
  clearcoatRoughness: 0.1
});
const mesh = new THREE.Mesh(geometry, material);
group.add(mesh);

// Wireframe exterior
const wireGeo = new THREE.TorusKnotGeometry(1.4, 0.04, 128, 8);
const wireMat = new THREE.MeshBasicMaterial({
  color: 0xa673ff,
  transparent: true,
  opacity: 0.35,
  wireframe: true
});
const wire = new THREE.Mesh(wireGeo, wireMat);
group.add(wire);

scene.add(group);

// ─── 4. Luces ─────────────────────────────────────────
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const keyLight = new THREE.PointLight(0x5b7cfa, 3, 20);
keyLight.position.set(3, 3, 3);
scene.add(keyLight);

const rimLight = new THREE.PointLight(0xa673ff, 2.5, 20);
rimLight.position.set(-3, -2, 2);
scene.add(rimLight);

// ─── 5. Partículas ────────────────────────────────────
const particlesGeo = new THREE.BufferGeometry();
const count = 500;
const positions = new Float32Array(count * 3);
for (let i = 0; i < count * 3; i++) {
  positions[i] = (Math.random() - 0.5) * 30;
}
particlesGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
const particlesMat = new THREE.PointsMaterial({
  color: 0xa673ff,
  size: 0.04,
  transparent: true,
  opacity: 0.6,
  sizeAttenuation: true
});
const particles = new THREE.Points(particlesGeo, particlesMat);
scene.add(particles);

// ─── 6. Animación base (rotación continua) ────────────
let targetScroll = 0;
let currentScroll = 0;

function animate() {
  requestAnimationFrame(animate);

  currentScroll += (targetScroll - currentScroll) * 0.06;

  // Rotación base
  group.rotation.x += 0.003;
  group.rotation.y += 0.005;

  // Efectos según scroll
  const s = currentScroll;
  group.position.x = Math.sin(s * 0.5) * 2;
  group.position.y = -s * 2.5;
  group.scale.setScalar(1 - s * 0.3);
  group.rotation.z = s * 1.5;

  // Cámara
  camera.position.z = 6 - s * 2;
  camera.lookAt(group.position);

  // Partículas
  particles.rotation.y += 0.0003;
  particles.rotation.x += 0.0002;
  particles.position.y = -s * 1.5;

  renderer.render(scene, camera);
}
animate();

// ─── 7. Actualizar scroll según Lenis ─────────────────
lenis.on("scroll", ({ scroll, limit }) => {
  targetScroll = scroll / (limit || 1);
});

// ─── 8. Hero reveal ──────────────────────────────────
const tl = gsap.timeline({ delay: 0.3 });
tl.from(".hero-eyebrow", { opacity: 0, y: 20, duration: 0.8, ease: "power2.out" })
  .from(".hero-title", { opacity: 0, y: 60, duration: 1.2, ease: "expo.out" }, "-=0.4")
  .from(".hero-sub", { opacity: 0, y: 30, duration: 0.9 }, "-=0.7")
  .from(".hero-cta > *", { opacity: 0, y: 30, duration: 0.8, stagger: 0.15 }, "-=0.5")
  .from(".hero-scroll-hint", { opacity: 0, duration: 1 }, "-=0.3");

// ─── 9. Sections reveal ──────────────────────────────
gsap.utils.toArray(".section-title").forEach(el => {
  gsap.from(el, {
    scrollTrigger: { trigger: el, start: "top 85%" },
    y: 60, opacity: 0, duration: 1.2, ease: "expo.out"
  });
});

gsap.utils.toArray(".feature").forEach((el, i) => {
  gsap.from(el, {
    scrollTrigger: { trigger: el, start: "top 90%" },
    y: 50, opacity: 0, duration: 0.9, delay: (i % 4) * 0.1, ease: "power2.out"
  });
});

gsap.utils.toArray(".spec").forEach((el, i) => {
  gsap.from(el, {
    scrollTrigger: { trigger: el, start: "top 92%" },
    y: 30, opacity: 0, duration: 0.6, delay: (i % 4) * 0.08
  });
});

gsap.from(".buy-card", {
  scrollTrigger: { trigger: ".buy-card", start: "top 80%" },
  y: 80, opacity: 0, duration: 1.3, ease: "expo.out"
});

// ─── 10. Resize ──────────────────────────────────────
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── 11. Smooth anchors ──────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.onclick = (e) => {
    const target = document.querySelector(a.getAttribute("href"));
    if (target) {
      e.preventDefault();
      lenis.scrollTo(target, { duration: 1.8 });
    }
  };
});`
    }
  },

  // ═══════════════════════════════════════════════════════════
  //  12. AGENCIA CREATIVA
  // ═══════════════════════════════════════════════════════════
  "agency-creative": {
    name: "Agencia Creativa",
    icon: "&#127912;",
    description: "Sitio de agencia con casos, servicios y animaciones de alto nivel",
    files: {
      "index.html": `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Nova Agency</title>
<link rel="stylesheet" href="styles.css">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js"></script>
</head>
<body>
<div class="cursor-dot" id="cursorDot"></div>

<nav class="nav">
  <div class="brand">
    NOVA
    <span class="brand-dot"></span>
  </div>
  <ul class="nav-links">
    <li><a href="#casos">Casos</a></li>
    <li><a href="#servicios">Servicios</a></li>
    <li><a href="#nosotros">Nosotros</a></li>
    <li><a href="#contacto">Contacto</a></li>
  </ul>
  <div class="nav-info">
    <span>CDMX · BCN · MIA</span>
  </div>
</nav>

<section class="hero">
  <div class="hero-bg-text">NOVA</div>
  <div class="hero-inner">
    <div class="hero-num">(Agency © 2026)</div>
    <h1 class="hero-title">
      Creamos marcas<br>
      que <em>generan</em><br>
      <span class="outline">impacto</span>
    </h1>
    <div class="hero-footer">
      <p class="hero-desc">Somos un estudio creativo independiente. Trabajamos con marcas ambiciosas para construir identidades, productos y experiencias digitales memorables.</p>
      <div class="hero-stats">
        <div><b>85+</b><span>Proyectos</span></div>
        <div><b>12</b><span>Premios</span></div>
        <div><b>8</b><span>Países</span></div>
      </div>
    </div>
  </div>
</section>

<section class="marquee-band">
  <div class="marquee-inner">
    <span>BRANDING</span><span class="dot">●</span>
    <span>DIGITAL</span><span class="dot">●</span>
    <span>PRODUCT</span><span class="dot">●</span>
    <span>MOTION</span><span class="dot">●</span>
    <span>BRANDING</span><span class="dot">●</span>
    <span>DIGITAL</span><span class="dot">●</span>
    <span>PRODUCT</span><span class="dot">●</span>
    <span>MOTION</span><span class="dot">●</span>
  </div>
</section>

<section class="casos" id="casos">
  <div class="section-head">
    <div class="section-num">(01)</div>
    <h2 class="section-title">Casos<br>recientes</h2>
  </div>

  <div class="casos-list">
    <a href="#" class="caso" data-cursor="view">
      <div class="caso-num">01</div>
      <div class="caso-name">
        <h3>Lumen</h3>
        <span>Rebranding · 2026</span>
      </div>
      <div class="caso-tags">
        <span>Branding</span>
        <span>Web</span>
      </div>
      <div class="caso-arrow">↗</div>
    </a>

    <a href="#" class="caso" data-cursor="view">
      <div class="caso-num">02</div>
      <div class="caso-name">
        <h3>Vertex App</h3>
        <span>Product Design · 2026</span>
      </div>
      <div class="caso-tags">
        <span>Mobile</span>
        <span>UX</span>
      </div>
      <div class="caso-arrow">↗</div>
    </a>

    <a href="#" class="caso" data-cursor="view">
      <div class="caso-num">03</div>
      <div class="caso-name">
        <h3>Meridian</h3>
        <span>Identity · 2025</span>
      </div>
      <div class="caso-tags">
        <span>Branding</span>
        <span>Motion</span>
      </div>
      <div class="caso-arrow">↗</div>
    </a>

    <a href="#" class="caso" data-cursor="view">
      <div class="caso-num">04</div>
      <div class="caso-name">
        <h3>Kinetic</h3>
        <span>E-commerce · 2025</span>
      </div>
      <div class="caso-tags">
        <span>Web</span>
        <span>3D</span>
      </div>
      <div class="caso-arrow">↗</div>
    </a>
  </div>
</section>

<section class="servicios" id="servicios">
  <div class="section-head">
    <div class="section-num">(02)</div>
    <h2 class="section-title">Nuestros<br>servicios</h2>
  </div>
  <div class="servicios-grid">
    <div class="servicio">
      <div class="servicio-num">01</div>
      <h3>Branding & Identity</h3>
      <p>Logos, sistemas visuales, tipografía, tono de voz. Construimos marcas con significado.</p>
    </div>
    <div class="servicio">
      <div class="servicio-num">02</div>
      <h3>Diseño Web</h3>
      <p>Sitios de alto rendimiento con foco en conversión, accesibilidad y experiencia.</p>
    </div>
    <div class="servicio">
      <div class="servicio-num">03</div>
      <h3>Product Design</h3>
      <p>Aplicaciones móviles y plataformas SaaS diseñadas para escalar.</p>
    </div>
    <div class="servicio">
      <div class="servicio-num">04</div>
      <h3>Motion & 3D</h3>
      <p>Animación, storytelling visual y experiencias inmersivas en WebGL.</p>
    </div>
  </div>
</section>

<section class="nosotros" id="nosotros">
  <div class="nosotros-inner">
    <div class="section-num">(03)</div>
    <p class="nosotros-text">
      Somos un equipo de <em>diseñadores, desarrolladores y estrategas</em> que trabajan en colaboración con marcas que buscan diferenciarse. Sin intermediarios, sin capas corporativas. Solo trabajo directo y honesto.
    </p>
  </div>
</section>

<section class="contacto" id="contacto">
  <div class="contacto-inner">
    <div class="section-num">(04)</div>
    <h2 class="contacto-title">
      ¿Trabajamos<br>
      <span>juntos?</span>
    </h2>
    <a href="mailto:hola@nova.studio" class="contacto-link" data-cursor="view">
      hola@nova.studio
      <span class="arrow">↗</span>
    </a>
    <div class="contacto-footer">
      <div class="contacto-col">
        <h5>Social</h5>
        <a>Instagram</a>
        <a>Behance</a>
        <a>Dribbble</a>
        <a>LinkedIn</a>
      </div>
      <div class="contacto-col">
        <h5>Oficinas</h5>
        <span>CDMX · Roma Norte</span>
        <span>BCN · Gràcia</span>
        <span>MIA · Wynwood</span>
      </div>
      <div class="contacto-col">
        <h5>Contacto</h5>
        <span>+52 55 1234 5678</span>
        <span>hola@nova.studio</span>
      </div>
    </div>
  </div>
  <footer class="footer">
    <div>© 2026 Nova Agency</div>
    <div>Hecho con GSAP + Lenis</div>
  </footer>
</section>

<script src="script.js"></script>
</body>
</html>`,
      "styles.css": `*{margin:0;padding:0;box-sizing:border-box}
::selection{background:#ff5b3a;color:#fff}
:root{--bg:#0d0c0f;--bg-2:#161519;--text:#f0f0f5;--dim:#7a7a85;--accent:#ff5b3a;--accent-2:#ffb547}
html,body{overflow-x:hidden}
body{font-family:-apple-system,"Inter",sans-serif;background:var(--bg);color:var(--text);line-height:1.4;cursor:none;-webkit-font-smoothing:antialiased}
a{cursor:none}

/* ═══════════════════════════════════════════
   CURSOR
   ═══════════════════════════════════════════ */
.cursor-dot{position:fixed;width:12px;height:12px;background:var(--accent);border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);transition:width .25s,height .25s;mix-blend-mode:difference}
.cursor-dot.view{width:60px;height:60px;background:var(--text);mix-blend-mode:normal}
.cursor-dot.view::after{content:"VER";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:10px;font-weight:700;letter-spacing:.1em;color:#000;opacity:0;transition:.2s}
.cursor-dot.view.on::after{opacity:1}
@media (max-width:768px){.cursor-dot{display:none}body,a{cursor:auto}}

/* ═══════════════════════════════════════════
   NAV
   ═══════════════════════════════════════════ */
.nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;justify-content:space-between;align-items:center;padding:24px 40px;background:rgba(13,12,15,.7);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.06)}
.brand{display:flex;align-items:center;gap:8px;font-weight:900;font-size:20px;letter-spacing:.05em}
.brand-dot{width:8px;height:8px;background:var(--accent);border-radius:50%;animation:dotpulse 2s infinite}
@keyframes dotpulse{0%,100%{opacity:1}50%{opacity:.3}}
.nav-links{display:flex;gap:36px;list-style:none}
.nav-links a{color:var(--dim);text-decoration:none;font-size:14px;font-weight:500;position:relative;padding:4px 0}
.nav-links a::after{content:"";position:absolute;bottom:0;left:0;width:0;height:1px;background:var(--accent);transition:width .3s}
.nav-links a:hover{color:var(--text)}
.nav-links a:hover::after{width:100%}
.nav-info{font-size:11px;color:var(--dim);font-family:Consolas,monospace;letter-spacing:.1em}

/* ═══════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════ */
.hero{min-height:100vh;padding:140px 40px 60px;display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden}
.hero-bg-text{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:clamp(200px,40vw,600px);font-weight:900;color:rgba(255,255,255,.025);letter-spacing:-.06em;pointer-events:none;white-space:nowrap;line-height:1}
.hero-inner{max-width:1400px;width:100%;margin:0 auto;position:relative;z-index:1}
.hero-num{font-size:12px;color:var(--dim);font-family:Consolas,monospace;letter-spacing:.15em;margin-bottom:32px}
.hero-title{font-size:clamp(48px,9vw,140px);font-weight:800;letter-spacing:-.045em;line-height:.95;margin-bottom:60px}
.hero-title em{font-style:italic;font-weight:400;color:var(--accent)}
.outline{-webkit-text-stroke:2px var(--text);-webkit-text-fill-color:transparent;color:transparent}

.hero-footer{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:end;max-width:1200px}
.hero-desc{font-size:16.5px;color:var(--dim);line-height:1.7;max-width:520px}
.hero-stats{display:flex;gap:48px;justify-content:flex-end}
.hero-stats > div{display:flex;flex-direction:column;gap:4px}
.hero-stats b{font-size:38px;font-weight:800;letter-spacing:-.03em}
.hero-stats span{font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.15em;font-family:Consolas,monospace}

/* ═══════════════════════════════════════════
   MARQUEE
   ═══════════════════════════════════════════ */
.marquee-band{padding:36px 0;overflow:hidden;background:var(--accent);color:#000;border-top:1px solid rgba(0,0,0,.2);border-bottom:1px solid rgba(0,0,0,.2)}
.marquee-inner{display:flex;gap:32px;white-space:nowrap;animation:marquee 20s linear infinite;align-items:center;font-family:Consolas,monospace;font-weight:800;font-size:24px;letter-spacing:.05em}
.marquee-inner .dot{font-size:14px;opacity:.6}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}

/* ═══════════════════════════════════════════
   SECTIONS GENERICAS
   ═══════════════════════════════════════════ */
.casos,.servicios{padding:140px 40px}
.section-head{max-width:1400px;margin:0 auto 80px;display:grid;grid-template-columns:120px 1fr;gap:40px;align-items:start}
.section-num{font-size:12px;color:var(--dim);font-family:Consolas,monospace;letter-spacing:.15em;padding-top:12px}
.section-title{font-size:clamp(40px,6vw,80px);font-weight:800;letter-spacing:-.04em;line-height:.95}

/* ═══════════════════════════════════════════
   CASOS LIST
   ═══════════════════════════════════════════ */
.casos-list{max-width:1400px;margin:0 auto;border-top:1px solid rgba(255,255,255,.08)}
.caso{display:grid;grid-template-columns:80px 1fr auto 60px;gap:40px;align-items:center;padding:40px 20px;border-bottom:1px solid rgba(255,255,255,.08);text-decoration:none;color:inherit;transition:padding .4s cubic-bezier(.4,0,.2,1);position:relative;overflow:hidden}
.caso::before{content:"";position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,rgba(255,91,58,.12),transparent);transition:width .5s cubic-bezier(.4,0,.2,1);z-index:0}
.caso:hover{padding-left:40px}
.caso:hover::before{width:100%}
.caso > *{position:relative;z-index:1}
.caso-num{font-size:13px;color:var(--dim);font-family:Consolas,monospace}
.caso-name h3{font-size:clamp(28px,4vw,44px);font-weight:700;letter-spacing:-.03em;margin-bottom:6px;transition:color .3s}
.caso:hover .caso-name h3{color:var(--accent)}
.caso-name span{font-size:12.5px;color:var(--dim);font-family:Consolas,monospace}
.caso-tags{display:flex;gap:8px;flex-wrap:wrap}
.caso-tags span{background:var(--bg-2);border:1px solid rgba(255,255,255,.08);padding:5px 14px;border-radius:999px;font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.1em;font-weight:600}
.caso-arrow{font-size:28px;color:var(--dim);transition:all .4s;text-align:right}
.caso:hover .caso-arrow{color:var(--accent);transform:translate(6px,-6px) rotate(0deg)}

/* ═══════════════════════════════════════════
   SERVICIOS
   ═══════════════════════════════════════════ */
.servicios{background:var(--bg-2)}
.servicios-grid{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1px;background:rgba(255,255,255,.06);border-radius:24px;overflow:hidden}
.servicio{background:var(--bg);padding:48px 36px;transition:background .3s}
.servicio:hover{background:var(--bg-2)}
.servicio-num{font-size:12px;color:var(--accent);font-family:Consolas,monospace;letter-spacing:.15em;margin-bottom:32px}
.servicio h3{font-size:22px;font-weight:700;letter-spacing:-.02em;margin-bottom:16px}
.servicio p{font-size:14.5px;color:var(--dim);line-height:1.7}

/* ═══════════════════════════════════════════
   NOSOTROS
   ═══════════════════════════════════════════ */
.nosotros{padding:160px 40px}
.nosotros-inner{max-width:1200px;margin:0 auto}
.nosotros-text{font-size:clamp(26px,4vw,52px);font-weight:600;letter-spacing:-.03em;line-height:1.25;margin-top:40px}
.nosotros-text em{font-style:italic;font-weight:400;color:var(--accent)}

/* ═══════════════════════════════════════════
   CONTACTO
   ═══════════════════════════════════════════ */
.contacto{padding:140px 40px 40px;background:var(--bg);border-top:1px solid rgba(255,255,255,.06)}
.contacto-inner{max-width:1400px;margin:0 auto}
.contacto-title{font-size:clamp(56px,10vw,160px);font-weight:800;letter-spacing:-.05em;line-height:.9;margin:40px 0 80px}
.contacto-title span{font-style:italic;font-weight:400;color:var(--accent)}
.contacto-link{display:inline-flex;align-items:center;gap:20px;font-size:clamp(24px,3vw,42px);font-weight:600;color:var(--text);text-decoration:none;letter-spacing:-.02em;margin-bottom:100px;transition:color .3s}
.contacto-link:hover{color:var(--accent)}
.contacto-link .arrow{font-size:.8em;transition:transform .4s}
.contacto-link:hover .arrow{transform:translate(8px,-8px) rotate(0deg)}

.contacto-footer{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:60px;padding-top:60px;border-top:1px solid rgba(255,255,255,.08)}
.contacto-col h5{font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.15em;font-weight:700;margin-bottom:20px}
.contacto-col a,.contacto-col span{display:block;color:var(--text);text-decoration:none;font-size:14px;padding:6px 0;transition:color .2s;cursor:none}
.contacto-col a:hover{color:var(--accent)}

.footer{max-width:1400px;margin:80px auto 0;padding-top:40px;border-top:1px solid rgba(255,255,255,.06);display:flex;justify-content:space-between;font-size:12px;color:var(--dim);font-family:Consolas,monospace;flex-wrap:wrap;gap:16px}

/* ═══════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════ */
@media (max-width:900px){
  .nav{padding:16px 20px}
  .nav-links,.nav-info{display:none}
  .hero{padding:100px 20px 40px}
  .hero-footer{grid-template-columns:1fr;gap:40px}
  .hero-stats{justify-content:flex-start;gap:32px}
  .hero-stats b{font-size:28px}
  .casos,.servicios{padding:80px 20px}
  .section-head{grid-template-columns:1fr;gap:16px;margin-bottom:48px}
  .caso{grid-template-columns:1fr auto;gap:16px;padding:28px 12px}
  .caso-num{display:none}
  .caso-tags{grid-column:1/-1;padding-top:8px}
  .caso-arrow{font-size:22px}
  .nosotros{padding:80px 20px}
  .contacto{padding:80px 20px 30px}
  .contacto-footer{gap:32px}
  .footer{flex-direction:column;text-align:center}
}`,
      "script.js": `// ═══════════════════════════════════════════════════════════
//  AGENCY - Animaciones premium
// ═══════════════════════════════════════════════════════════

gsap.registerPlugin(ScrollTrigger);

// ─── 1. Lenis scroll suave ────────────────────────────
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true
});
function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
requestAnimationFrame(raf);
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

// ─── 2. Cursor custom ─────────────────────────────────
const dot = document.getElementById("cursorDot");
let mx = 0, my = 0;

document.addEventListener("mousemove", (e) => {
  mx = e.clientX; my = e.clientY;
  gsap.to(dot, { x: mx, y: my, duration: 0.15, ease: "power2.out" });
});

document.querySelectorAll("[data-cursor='view']").forEach(el => {
  el.addEventListener("mouseenter", () => {
    dot.classList.add("view");
    setTimeout(() => dot.classList.add("on"), 80);
  });
  el.addEventListener("mouseleave", () => {
    dot.classList.remove("view");
    dot.classList.remove("on");
  });
});

// ─── 3. Hero reveal con mask ─────────────────────────
const tl = gsap.timeline({ delay: 0.4 });
tl.from(".hero-num", { opacity: 0, x: -20, duration: 0.8 })
  .from(".hero-title", { opacity: 0, y: 80, duration: 1.4, ease: "expo.out" }, "-=0.4")
  .from(".hero-desc", { opacity: 0, y: 30, duration: 1 }, "-=0.9")
  .from(".hero-stats > div", { opacity: 0, y: 20, duration: 0.8, stagger: 0.15 }, "-=0.6")
  .from(".hero-bg-text", { opacity: 0, scale: 1.2, duration: 2, ease: "expo.out" }, "-=1.4");

// ─── 4. Casos stagger ─────────────────────────────────
gsap.utils.toArray(".caso").forEach((caso, i) => {
  gsap.from(caso, {
    scrollTrigger: { trigger: caso, start: "top 85%" },
    y: 60,
    opacity: 0,
    duration: 1,
    delay: i * 0.08,
    ease: "power3.out"
  });
});

// ─── 5. Servicios stagger ─────────────────────────────
gsap.utils.toArray(".servicio").forEach((s, i) => {
  gsap.from(s, {
    scrollTrigger: { trigger: s, start: "top 88%" },
    y: 40,
    opacity: 0,
    duration: 0.9,
    delay: i * 0.1,
    ease: "power2.out"
  });
});

// ─── 6. Nosotros text reveal ──────────────────────────
gsap.from(".nosotros-text", {
  scrollTrigger: { trigger: ".nosotros-text", start: "top 80%" },
  y: 60, opacity: 0, duration: 1.4, ease: "expo.out"
});

// ─── 7. Contacto title ────────────────────────────────
gsap.from(".contacto-title", {
  scrollTrigger: { trigger: ".contacto-title", start: "top 85%" },
  y: 80, opacity: 0, duration: 1.4, ease: "expo.out"
});

gsap.from(".contacto-link", {
  scrollTrigger: { trigger: ".contacto-link", start: "top 90%" },
  y: 40, opacity: 0, duration: 1, delay: 0.3, ease: "power2.out"
});

// ─── 8. Smooth anchors ────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.onclick = (e) => {
    const target = document.querySelector(a.getAttribute("href"));
    if (target) {
      e.preventDefault();
      lenis.scrollTo(target, { duration: 1.6 });
    }
  };
});`
    }
  }
};