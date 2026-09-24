// ============================================================
//  GafCoreAI - Templates Extra (batch 4/4)
//  Backend + Herramientas
// ============================================================

export const TEMPLATES_EXTRA4 = {

  // ═══════════════════════════════════════════════════════════
  //  13. NODE.JS API REST
  // ═══════════════════════════════════════════════════════════
  "node-api-rest": {
    name: "API REST Node.js",
    icon: "&#128268;",
    description: "API REST con Express, JWT auth, CRUD y validacion",
    files: {
      "package.json": `{
  "name": "mi-api",
  "version": "1.0.0",
  "type": "module",
  "main": "src/server.js",
  "scripts": {
    "dev": "node --watch src/server.js",
    "start": "node src/server.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.4.5"
  }
}`,
      "src/server.js": `import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import { errorHandler } from "./middleware/error.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, ts: Date.now(), version: "1.0.0" });
});

// Rutas
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("API corriendo en http://localhost:" + PORT);
});`,
      "src/routes/auth.js": `import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { users, findUserByEmail } from "../data/users.js";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Faltan campos" });
    }
    if (findUserByEmail(email)) {
      return res.status(409).json({ error: "Usuario ya existe" });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = { id: users.length + 1, email, name, password: hash };
    users.push(user);
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "7d" });
    res.status(201).json({ token, user: { id: user.id, email, name } });
  } catch (e) { next(e); }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = findUserByEmail(email);
    if (!user) return res.status(401).json({ error: "Credenciales invalidas" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Credenciales invalidas" });
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "dev-secret", { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) { next(e); }
});

export default router;`,
      "src/routes/users.js": `import { Router } from "express";
import { users } from "../data/users.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// GET /api/users - listar
router.get("/", authMiddleware, (req, res) => {
  res.json(users.map(u => ({ id: u.id, email: u.email, name: u.name })));
});

// GET /api/users/:id
router.get("/:id", authMiddleware, (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: "No encontrado" });
  res.json({ id: user.id, email: user.email, name: user.name });
});

// DELETE /api/users/:id
router.delete("/:id", authMiddleware, (req, res) => {
  const idx = users.findIndex(u => u.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "No encontrado" });
  users.splice(idx, 1);
  res.status(204).end();
});

export default router;`,
      "src/middleware/auth.js": `import jwt from "jsonwebtoken";

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.replace(/^Bearer\\s+/, "");
  if (!token) return res.status(401).json({ error: "Sin token" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    req.userId = payload.id;
    next();
  } catch (e) {
    res.status(401).json({ error: "Token invalido" });
  }
}`,
      "src/middleware/error.js": `export function errorHandler(err, req, res, next) {
  console.error("[error]", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Error interno",
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {})
  });
}`,
      "src/data/users.js": `// En produccion: usar base de datos real (Postgres, Mongo, etc)
export const users = [
  { id: 1, email: "demo@demo.com", name: "Demo", password: "$2a$10$xxx" }
];

export function findUserByEmail(email) {
  return users.find(u => u.email === email);
}`,
      ".env.example": `PORT=3000
JWT_SECRET=cambia-esto-en-produccion
NODE_ENV=development`,
      "README.md": `# API REST

API REST con Node.js + Express + JWT.

## Instalacion

    npm install
    cp .env.example .env

## Correr

    npm run dev

## Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login

### Users
- GET /api/users
- GET /api/users/:id
- DELETE /api/users/:id`
    }
  },

  // ═══════════════════════════════════════════════════════════
  //  14. PYTHON FASTAPI
  // ═══════════════════════════════════════════════════════════
  "python-fastapi": {
    name: "API Python FastAPI",
    icon: "&#128013;",
    description: "API REST moderna con FastAPI, SQLModel y auth JWT",
    files: {
      "requirements.txt": `fastapi==0.115.0
uvicorn[standard]==0.32.0
sqlmodel==0.0.22
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.12
pydantic[email]==2.9.2`,
      "app/main.py": `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import auth, users

app = FastAPI(
    title="Mi API",
    description="API REST con FastAPI",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True, "version": "1.0.0"}

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])`,
      "app/routes/auth.py": `from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel import Session, select
from datetime import datetime, timedelta

from app.database import get_session
from app.models import User
from app.schemas import UserCreate, UserRead, Token
from app.security import hash_password, verify_password, create_access_token

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

@router.post("/register", response_model=UserRead)
def register(data: UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == data.email)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Usuario ya existe")
    user = User(
        email=data.email,
        name=data.name,
        hashed_password=hash_password(data.password)
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == form.username)).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales invalidas")
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}`,
      "app/routes/users.py": `from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from app.database import get_session
from app.models import User
from app.schemas import UserRead
from app.security import get_current_user

router = APIRouter()

@router.get("/", response_model=List[UserRead])
def list_users(session: Session = Depends(get_session), current: User = Depends(get_current_user)):
    return session.exec(select(User)).all()

@router.get("/me", response_model=UserRead)
def me(current: User = Depends(get_current_user)):
    return current

@router.delete("/{user_id}")
def delete_user(user_id: int, session: Session = Depends(get_session), current: User = Depends(get_current_user)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="No encontrado")
    session.delete(user)
    session.commit()
    return {"ok": True}`,
      "app/models.py": `from sqlmodel import SQLModel, Field
from datetime import datetime

class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    name: str
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)`,
      "app/schemas.py": `from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserRead(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str`,
      "app/database.py": `from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = "sqlite:///./app.db"
engine = create_engine(DATABASE_URL, echo=False)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session`,
      "app/security.py": `from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session

from app.database import get_session
from app.models import User

SECRET_KEY = "cambia-esto-en-produccion"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError):
        raise HTTPException(status_code=401, detail="Token invalido")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no existe")
    return user`,
      "app/__init__.py": "",
      "app/routes/__init__.py": "",
      "README.md": `# API FastAPI

## Instalacion

    pip install -r requirements.txt

## Correr

    uvicorn app.main:app --reload

Docs interactivas: http://localhost:8000/docs`
    }
  },

  // ═══════════════════════════════════════════════════════════
  //  15. CHROME EXTENSION
  // ═══════════════════════════════════════════════════════════
  "chrome-extension": {
    name: "Chrome Extension",
    icon: "&#127760;",
    description: "Extension de Chrome con popup, content script y background",
    files: {
      "manifest.json": `{
  "manifest_version": 3,
  "name": "Mi Extension",
  "version": "1.0.0",
  "description": "Extension de ejemplo",
  "permissions": ["activeTab", "storage", "scripting"],
  "host_permissions": ["<all_urls>"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/16.png",
      "48": "icons/48.png",
      "128": "icons/128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/16.png",
    "48": "icons/48.png",
    "128": "icons/128.png"
  }
}`,
      "popup.html": `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Mi Extension</title>
<link rel="stylesheet" href="popup.css">
</head>
<body>
<div class="popup">
  <header class="popup-header">
    <span class="logo">&#9670;</span>
    <h1>Mi Extension</h1>
    <button class="toggle" id="toggle">&#9881;</button>
  </header>
  <main class="popup-body">
    <div class="stat">
      <span class="stat-label">Pagina actual</span>
      <div class="stat-value" id="pageTitle">Cargando...</div>
    </div>
    <div class="stat">
      <span class="stat-label">Elementos encontrados</span>
      <div class="stat-value" id="count">-</div>
    </div>
    <div class="actions">
      <button class="btn-primary" id="scanBtn">Escanear pagina</button>
      <button class="btn-ghost" id="copyBtn">Copiar datos</button>
    </div>
  </main>
  <footer class="popup-footer">
    <span id="status">Listo</span>
  </footer>
</div>
<script src="popup.js"></script>
</body>
</html>`,
      "popup.css": `* { margin:0; padding:0; box-sizing:border-box; }
body {
  width:360px; min-height:280px;
  font-family:-apple-system,"Inter",sans-serif;
  background:#0a0a0c; color:#f0f0f5;
}
.popup { display:flex; flex-direction:column; height:100%; }
.popup-header {
  display:flex; align-items:center; gap:10px;
  padding:16px; border-bottom:1px solid rgba(255,255,255,.06);
}
.logo { color:#5b7cfa; font-size:18px; }
.popup-header h1 { font-size:14px; font-weight:700; flex:1; }
.toggle { background:transparent; border:none; color:#8a8a96; font-size:16px; cursor:pointer; }
.popup-body { padding:16px; display:flex; flex-direction:column; gap:12px; flex:1; }
.stat { background:#15151a; border-radius:10px; padding:14px; }
.stat-label { font-size:11px; color:#8a8a96; text-transform:uppercase; letter-spacing:.5px; font-weight:600; margin-bottom:6px; display:block; }
.stat-value { font-size:14px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.actions { display:flex; gap:8px; margin-top:8px; }
.btn-primary {
  flex:1; background:#5b7cfa; color:#fff; border:none;
  padding:10px 16px; border-radius:8px; cursor:pointer;
  font-weight:600; font-size:13px;
}
.btn-primary:hover { background:#6d8cff; }
.btn-ghost {
  background:transparent; color:#f0f0f5;
  border:1px solid rgba(255,255,255,.15);
  padding:10px 16px; border-radius:8px; cursor:pointer;
  font-size:13px; font-weight:500;
}
.btn-ghost:hover { background:rgba(255,255,255,.05); }
.popup-footer {
  padding:10px 16px; border-top:1px solid rgba(255,255,255,.06);
  font-size:11px; color:#8a8a96; text-align:center;
}`,
      "popup.js": `// Popup de la extension
document.getElementById("scanBtn").onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  document.getElementById("status").textContent = "Escaneando...";
  chrome.tabs.sendMessage(tab.id, { action: "scan" }, (response) => {
    if (chrome.runtime.lastError) {
      document.getElementById("status").textContent = "Recarga la pagina primero";
      return;
    }
    document.getElementById("count").textContent = response?.count || 0;
    document.getElementById("status").textContent = "Escaneo completo";
  });
};

document.getElementById("copyBtn").onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  chrome.tabs.sendMessage(tab.id, { action: "getData" }, async (response) => {
    if (chrome.runtime.lastError) return;
    const text = JSON.stringify(response?.data || {}, null, 2);
    await navigator.clipboard.writeText(text);
    document.getElementById("status").textContent = "Copiado!";
    setTimeout(() => { document.getElementById("status").textContent = "Listo"; }, 1500);
  });
};

// Info de la pagina actual
(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    document.getElementById("pageTitle").textContent = tab.title || tab.url;
  }
})();

// Cargar estado guardado
chrome.storage.local.get(["count"], (data) => {
  if (data.count !== undefined) document.getElementById("count").textContent = data.count;
});`,
      "background.js": `// Service worker de la extension
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("Extension instalada");
    chrome.storage.local.set({ installDate: Date.now() });
  }
});

// Escuchar mensajes de content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "log") {
    console.log("[from content]", msg.data);
  }
  sendResponse({ ok: true });
  return true;
});`,
      "content.js": `// Content script - se ejecuta en cada pagina
console.log("[Mi Extension] content script cargado");

let lastScan = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "scan") {
    lastScan = scanPage();
    chrome.storage.local.set({ count: lastScan.count });
    sendResponse(lastScan);
    return true;
  }
  if (msg.action === "getData") {
    sendResponse({ data: lastScan || scanPage() });
    return true;
  }
});

function scanPage() {
  const links = document.querySelectorAll("a[href]").length;
  const images = document.querySelectorAll("img").length;
  const inputs = document.querySelectorAll("input, textarea, select").length;
  const headings = document.querySelectorAll("h1, h2, h3").length;

  return {
    count: links + images + inputs + headings,
    links,
    images,
    inputs,
    headings,
    title: document.title,
    url: location.href
  };
}`,
      "content.css": `/* Estilos que se inyectan en la pagina */
.__mi-extension-highlight {
  outline: 2px solid #5b7cfa !important;
  outline-offset: 2px !important;
  transition: outline .2s !important;
}`,
      "icons/README.md": `Coloca aqui los iconos:
- 16.png (16x16)
- 48.png (48x48)
- 128.png (128x128)

Puedes generarlos desde https://favicon.io/`,
      "README.md": `# Chrome Extension

## Como instalar (modo desarrollador)

1. Abre chrome://extensions/
2. Activa "Modo de desarrollador" (arriba a la derecha)
3. Click en "Cargar descomprimida"
4. Selecciona esta carpeta

## Estructura

- manifest.json  - Configuracion
- popup.html/js  - UI al click en el icono
- background.js  - Service worker
- content.js     - Script que corre en cada pagina`
    }
  },

  // ═══════════════════════════════════════════════════════════
  //  16. TELEGRAM BOT
  // ═══════════════════════════════════════════════════════════
  "telegram-bot": {
    name: "Bot de Telegram",
    icon: "&#129302;",
    description: "Bot de Telegram con comandos, botones e integracion con IA",
    files: {
      "package.json": `{
  "name": "mi-telegram-bot",
  "version": "1.0.0",
  "type": "module",
  "main": "src/bot.js",
  "scripts": {
    "start": "node src/bot.js",
    "dev": "node --watch src/bot.js"
  },
  "dependencies": {
    "node-telegram-bot-api": "^0.66.0",
    "dotenv": "^16.4.5"
  }
}`,
      "src/bot.js": `import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { handleCommand } from "./commands.js";
import { handleMessage } from "./messages.js";
import { mainKeyboard } from "./keyboards.js";

dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("Falta TELEGRAM_BOT_TOKEN en .env");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

console.log("Bot iniciado. Usuario: @" + (await bot.getMe()).username);

// Comando /start
bot.onText(/\\/start/, (msg) => {
  const name = msg.from.first_name || "amigo";
  bot.sendMessage(
    msg.chat.id,
    "Hola " + name + "! Soy tu bot. ¿Qué necesitas?",
    { reply_markup: mainKeyboard }
  );
});

// Comando /help
bot.onText(/\\/help/, (msg) => {
  const help = [
    "**Comandos disponibles:**",
    "/start - Iniciar",
    "/help - Esta ayuda",
    "/info - Tu informacion",
    "/echo <texto> - Repetir texto"
  ].join("\\n");
  bot.sendMessage(msg.chat.id, help, { parse_mode: "Markdown" });
});

// Comando /info
bot.onText(/\\/info/, (msg) => {
  const u = msg.from;
  const text = [
    "**Tu informacion:**",
    "ID: " + u.id,
    "Nombre: " + u.first_name + " " + (u.last_name || ""),
    "Username: @" + (u.username || "(sin username)"),
    "Idioma: " + u.language_code
  ].join("\\n");
  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

// Comando /echo
bot.onText(/\\/echo (.+)/, (msg, match) => {
  bot.sendMessage(msg.chat.id, match[1]);
});

// Callback queries (botones inline)
bot.on("callback_query", async (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;

  if (data === "btn_hello") {
    await bot.answerCallbackQuery(query.id, { text: "Hola!" });
    await bot.sendMessage(chatId, "Hola desde el boton!");
  }

  if (data === "btn_help") {
    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(chatId, "Selecciona /help para ver comandos");
  }
});

// Mensajes normales
bot.on("message", (msg) => {
  if (msg.text && msg.text.startsWith("/")) return;
  handleMessage(bot, msg);
});

// Manejo de errores
bot.on("polling_error", (err) => {
  console.error("[polling]", err.message);
});

process.on("SIGINT", async () => {
  console.log("Deteniendo bot...");
  await bot.stopPolling();
  process.exit(0);
});`,
      "src/commands.js": `export async function handleCommand(bot, msg, command, args) {
  switch (command) {
    case "ping":
      return bot.sendMessage(msg.chat.id, "pong 🏓");
    case "time":
      return bot.sendMessage(msg.chat.id, "Hora: " + new Date().toLocaleString());
    default:
      return bot.sendMessage(msg.chat.id, "Comando desconocido: /" + command);
  }
}`,
      "src/messages.js": `// Respuestas a mensajes normales
const RESPONSES = {
  "hola": "Hola! ¿Como estas?",
  "buenos dias": "Buenos dias!",
  "buenas tardes": "Buenas tardes!",
  "buenas noches": "Buenas noches!",
  "gracias": "De nada!",
  "adios": "Hasta luego!",
  "quien eres": "Soy un bot de Telegram creado con Node.js"
};

export async function handleMessage(bot, msg) {
  const text = (msg.text || "").toLowerCase().trim();
  if (!text) return;

  // Respuesta predefinida
  for (const key in RESPONSES) {
    if (text.includes(key)) {
      return bot.sendMessage(msg.chat.id, RESPONSES[key]);
    }
  }

  // Respuesta por defecto
  bot.sendMessage(msg.chat.id, "Entendi: \\"" + msg.text + "\\"");
}`,
      "src/keyboards.js": `export const mainKeyboard = {
  keyboard: [
    [{ text: "Saludar" }, { text: "Ayuda" }],
    [{ text: "Hora actual" }],
    [{ text: "Info" }]
  ],
  resize_keyboard: true,
  one_time_keyboard: false
};

export const inlineMenu = {
  inline_keyboard: [
    [
      { text: "Boton 1", callback_data: "btn_hello" },
      { text: "Boton 2", callback_data: "btn_help" }
    ],
    [
      { text: "Abrir sitio", url: "https://telegram.org" }
    ]
  ]
};`,
      ".env.example": `TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`,
      "README.md": `# Telegram Bot

## Como obtener el token

1. Habla con @BotFather en Telegram
2. Envia /newbot
3. Sigue las instrucciones
4. Copia el token

## Instalacion

    npm install
    cp .env.example .env
    # Edita .env con tu token

## Correr

    npm start

## Comandos

- /start - Iniciar
- /help  - Ayuda
- /info  - Tu info
- /echo <texto> - Repetir

## Deploy gratis

- Railway: https://railway.app
- Render: https://render.com
- Fly.io: https://fly.io`
    }
  }
};