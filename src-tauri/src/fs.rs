use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Component, Path, PathBuf};

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub is_file: bool,
    pub size: u64,
    pub modified: u64,
    pub extension: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DirEntry {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub is_file: bool,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchHit {
    pub file: String,
    pub line: usize,
    pub text: String,
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Error leyendo {}: {}", path, e))
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if let Some(parent) = p.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Error creando dir: {}", e))?;
        }
    }
    fs::write(&path, content).map_err(|e| format!("Error escribiendo {}: {}", path, e))
}

#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<DirEntry>, String> {
    let entries = fs::read_dir(&path).map_err(|e| format!("Error leyendo dir {}: {}", path, e))?;
    let mut result: Vec<DirEntry> = Vec::new();
    for entry in entries.flatten() {
        let meta = entry.metadata().ok();
        let p = entry.path();
        result.push(DirEntry {
            path: p.to_string_lossy().to_string(),
            name: entry.file_name().to_string_lossy().to_string(),
            is_dir: meta.as_ref().map(|m| m.is_dir()).unwrap_or(false),
            is_file: meta.as_ref().map(|m| m.is_file()).unwrap_or(false),
            size: meta.as_ref().map(|m| m.len()).unwrap_or(0),
        });
    }
    result.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.to_lowercase().cmp(&b.name.to_lowercase())));
    Ok(result)
}

#[tauri::command]
pub fn file_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
pub fn create_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("Error creando dir: {}", e))
}

// Raices de disco, carpetas de primer nivel (ej. D:\PROGRAMAS IA), el home y sus ancestros.
fn is_protected_path(p: &Path) -> bool {
    let canon = p.canonicalize().unwrap_or_else(|_| p.to_path_buf());
    let depth = canon
        .components()
        .filter(|c| matches!(c, Component::Normal(_)))
        .count();
    if depth < 2 {
        return true;
    }
    if let Some(home) = dirs::home_dir() {
        let home = home.canonicalize().unwrap_or(home);
        if home.starts_with(&canon) {
            return true;
        }
    }
    false
}

#[tauri::command]
pub fn delete_path(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("No existe: {}", path));
    }
    if is_protected_path(p) {
        return Err(format!("Ruta protegida, no se puede borrar: {}", path));
    }
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| format!("Error borrando dir: {}", e))
    } else {
        fs::remove_file(p).map_err(|e| format!("Error borrando archivo: {}", e))
    }
}

#[tauri::command]
pub fn rename_path(from: String, to: String) -> Result<(), String> {
    fs::rename(&from, &to).map_err(|e| format!("Error renombrando: {}", e))
}

#[tauri::command]
pub fn get_file_info(path: String) -> Result<FileInfo, String> {
    let p = PathBuf::from(&path);
    let meta = fs::metadata(&p).map_err(|e| format!("Error metadata: {}", e))?;
    let modified = meta.modified().ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs()).unwrap_or(0);
    Ok(FileInfo {
        path: p.to_string_lossy().to_string(),
        name: p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default(),
        is_dir: meta.is_dir(),
        is_file: meta.is_file(),
        size: meta.len(),
        modified,
        extension: p.extension().map(|e| e.to_string_lossy().to_string()).unwrap_or_default(),
    })
}

#[tauri::command]
pub fn search_in_files(dir: String, query: String, max_results: usize) -> Result<Vec<SearchHit>, String> {
    let mut results: Vec<SearchHit> = Vec::new();
    search_recursive(Path::new(&dir), &query, &mut results, max_results, 0)?;
    Ok(results)
}

fn search_recursive(dir: &Path, query: &str, results: &mut Vec<SearchHit>, max: usize, depth: usize) -> Result<(), String> {
    if depth > 10 || results.len() >= max { return Ok(()); }
    let entries = match fs::read_dir(dir) { Ok(e) => e, Err(_) => return Ok(()) };
    for entry in entries.flatten() {
        if results.len() >= max { break; }
        let p = entry.path();
        if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
            if matches!(name, "node_modules" | ".git" | "target" | "dist" | "build" | ".next") { continue; }
        }
        if p.is_dir() {
            let _ = search_recursive(&p, query, results, max, depth + 1);
        } else if p.is_file() {
            if let Ok(meta) = fs::metadata(&p) {
                if meta.len() > 1_000_000 { continue; }
            }
            if let Ok(content) = fs::read_to_string(&p) {
                for (i, line) in content.lines().enumerate() {
                    if line.contains(query) {
                        results.push(SearchHit {
                            file: p.to_string_lossy().to_string(),
                            line: i + 1,
                            text: line.trim().to_string(),
                        });
                        if results.len() >= max { break; }
                    }
                }
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub fn get_project_root() -> Result<String, String> {
    std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| format!("Error cwd: {}", e))
}

#[tauri::command]
pub fn open_in_explorer(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer").arg(&path).spawn()
            .map_err(|e| format!("Error: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open").arg(&path).spawn()
            .map_err(|e| format!("Error: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open").arg(&path).spawn()
            .map_err(|e| format!("Error: {}", e))?;
    }
    Ok(())
}
