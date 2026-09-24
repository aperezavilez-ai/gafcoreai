// ============================================================
//  GafCoreAI - LSP Manager (Language Server Protocol)
//  Spawnea language servers y hace de puente con el frontend
// ============================================================

use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

pub struct LspProcess {
    stdin: Arc<Mutex<ChildStdin>>,
    child: Arc<Mutex<Child>>,
}

pub struct LspState {
    processes: Arc<Mutex<HashMap<String, Arc<LspProcess>>>>,
}

impl LspState {
    pub fn new() -> Self {
        Self {
            processes: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[tauri::command]
pub fn lsp_spawn(
    app: AppHandle,
    state: State<'_, LspState>,
    id: String,
    command: String,
    args: Vec<String>,
    cwd: Option<String>,
) -> Result<(), String> {
    // Si ya existe, matarlo primero
    {
        let processes = state.processes.lock().unwrap();
        if let Some(p) = processes.get(&id) {
            let mut child = p.child.lock().unwrap();
            let _ = child.kill();
        }
    }
    {
        let mut processes = state.processes.lock().unwrap();
        processes.remove(&id);
    }

    let is_windows = cfg!(target_os = "windows");

    // En Windows, los .cmd necesitan shell
    let mut cmd = if is_windows {
        let mut c = Command::new("cmd");
        let mut all_args = vec!["/C".to_string(), command.clone()];
        all_args.extend(args.clone());
        c.args(&all_args);
        c
    } else {
        let mut c = Command::new(&command);
        c.args(&args);
        c
    };

    if let Some(dir) = &cwd {
        cmd.current_dir(dir);
    }

    cmd.stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Error iniciando LSP '{}': {}", command, e))?;

    let stdin = child.stdin.take().ok_or("No se pudo obtener stdin del LSP")?;
    let stdout = child.stdout.take().ok_or("No se pudo obtener stdout del LSP")?;
    let stderr = child.stderr.take().ok_or("No se pudo obtener stderr del LSP")?;

    let stdin_arc = Arc::new(Mutex::new(stdin));
    let child_arc = Arc::new(Mutex::new(child));

    // Guardar
    {
        let mut processes = state.processes.lock().unwrap();
        processes.insert(id.clone(), Arc::new(LspProcess {
            stdin: stdin_arc.clone(),
            child: child_arc.clone(),
        }));
    }

    // Hilo para stdout
    let id_out = id.clone();
    let app_out = app.clone();
    std::thread::spawn(move || {
        let mut reader = BufReader::new(stdout);
        let mut buf = Vec::new();
        loop {
            buf.clear();
            // Leer headers hasta linea vacia
            loop {
                let mut line = Vec::new();
                match reader.read_until(b'\n', &mut line) {
                    Ok(0) => return, // EOF
                    Ok(_) => {
                        buf.extend_from_slice(&line);
                        // Detectar fin de headers (linea vacia = \r\n o \n)
                        if line == b"\r\n" || line == b"\n" {
                            break;
                        }
                    }
                    Err(_) => return,
                }
            }

            // Buscar Content-Length en headers
            let headers = String::from_utf8_lossy(&buf).to_lowercase();
            let content_length = headers
                .lines()
                .find(|l| l.starts_with("content-length:"))
                .and_then(|l| l.split(':').nth(1))
                .and_then(|v| v.trim().parse::<usize>().ok());

            if let Some(len) = content_length {
                let mut body = vec![0u8; len];
                if reader.read_exact(&mut body).is_err() {
                    return;
                }
                let msg = String::from_utf8_lossy(&body).to_string();
                let _ = app_out.emit(&format!("lsp-stdout-{}", id_out), msg);
            }
        }
    });

    // Hilo para stderr (log)
    let id_err = id.clone();
    let app_err = app.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().flatten() {
            let _ = app_err.emit(&format!("lsp-stderr-{}", id_err), line);
        }
    });

    Ok(())
}

#[tauri::command]
pub fn lsp_send(state: State<'_, LspState>, id: String, data: String) -> Result<(), String> {
    let processes = state.processes.lock().unwrap();
    let p = processes.get(&id).ok_or(format!("LSP {} no existe", id))?;
    let mut stdin = p.stdin.lock().unwrap();

    // Formato LSP: Content-Length: N\r\n\r\n<json>
    let content = data.as_bytes();
    let header = format!("Content-Length: {}\r\n\r\n", content.len());
    stdin.write_all(header.as_bytes()).map_err(|e| e.to_string())?;
    stdin.write_all(content).map_err(|e| e.to_string())?;
    stdin.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn lsp_kill(state: State<'_, LspState>, id: String) -> Result<(), String> {
    let mut processes = state.processes.lock().unwrap();
    if let Some(p) = processes.remove(&id) {
        let mut child = p.child.lock().unwrap();
        let _ = child.kill();
    }
    Ok(())
}

#[tauri::command]
pub fn lsp_kill_all(state: State<'_, LspState>) -> Result<(), String> {
    let mut processes = state.processes.lock().unwrap();
    for (_, p) in processes.iter() {
        if let Ok(mut child) = p.child.lock() {
            let _ = child.kill();
        }
    }
    processes.clear();
    Ok(())
}