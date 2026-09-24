// ============================================================
//  GafCoreAI - MCP Catalog (servidores populares)
//  Instalacion en 1 clic
// ============================================================

export const MCP_CATALOG = [
  {
    id: "filesystem",
    name: "Filesystem",
    icon: "📁",
    description: "Lee y escribe archivos en directorios especificos",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "."],
    requiresArg: "directorio",
    popular: true
  },
  {
    id: "github",
    name: "GitHub",
    icon: "🐙",
    description: "Opera en tus repos: issues, PRs, commits, busqueda",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    requiresEnv: ["GITHUB_PERSONAL_ACCESS_TOKEN"],
    popular: true
  },
  {
    id: "gitlab",
    name: "GitLab",
    icon: "🦊",
    description: "Opera en repos de GitLab",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-gitlab"],
    requiresEnv: ["GITLAB_PERSONAL_ACCESS_TOKEN"]
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    icon: "🐘",
    description: "Consultas SQL en bases PostgreSQL",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres"],
    requiresArg: "connection string",
    popular: true
  },
  {
    id: "sqlite",
    name: "SQLite",
    icon: "🪶",
    description: "Consultas y esquema en bases SQLite",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sqlite", "database.db"]
  },
  {
    id: "fetch",
    name: "Fetch",
    icon: "🌐",
    description: "Descarga paginas web y las convierte a markdown",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-fetch"],
    popular: true
  },
  {
    id: "memory",
    name: "Memory",
    icon: "🧠",
    description: "Grafo de conocimiento persistente para el agente",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    popular: true
  },
  {
    id: "puppeteer",
    name: "Puppeteer",
    icon: "🎭",
    description: "Navega la web con un browser headless real",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-puppeteer"]
  },
  {
    id: "brave-search",
    name: "Brave Search",
    icon: "🔍",
    description: "Busca en internet via Brave Search API",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    requiresEnv: ["BRAVE_API_KEY"]
  },
  {
    id: "slack",
    name: "Slack",
    icon: "💬",
    description: "Lee y envia mensajes a Slack",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    requiresEnv: ["SLACK_BOT_TOKEN", "SLACK_TEAM_ID"]
  },
  {
    id: "google-maps",
    name: "Google Maps",
    icon: "🗺️",
    description: "Geocodifica, rutas y lugares",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-google-maps"],
    requiresEnv: ["GOOGLE_MAPS_API_KEY"]
  },
  {
    id: "everything",
    name: "Everything (test)",
    icon: "🧪",
    description: "Servidor de ejemplo con todas las features de MCP",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-everything"]
  }
];

export function getMcpById(id) {
  return MCP_CATALOG.find(m => m.id === id);
}

export function getPopularMcp() {
  return MCP_CATALOG.filter(m => m.popular);
}