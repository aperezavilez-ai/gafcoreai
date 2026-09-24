// ============================================================
//  GafCoreAI - Shell real (comandos + PTY + resize)
// ============================================================

use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

pub struct TerminalState {
    writers: Arc<Mutex<HashMap<String, Arc<Mutex<Box<dyn Write + Send>>>>>>,
    master: Arc<Mutex<HashMap<String, Arc<Mutex<Box<dyn portable_pty::MasterPty + Send>>>>>>,
}

impl TerminalState {
    pub fn new() -> Self {
        Self {
            writers: Arc::new(Mutex::new(HashMap::new())),
            master: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[tauri::command]
pub async fn run_shell(cmd: String, cwd: Option<String>) -> Result<String, String> {
    let is_windows = cfg!(target_os = "windows");
    let dir = cwd.unwrap_or_else(|| ".".to_string());
    let output = if is_windows {
        std::process::Command::new("cmd").args(["/C", &cmd]).current_dir(dir).output()
    } else {
        std::process::Command::new("bash").args(["-c", &cmd]).current_dir(dir).output()
    };
    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            let mut result = stdout;
            if !stderr.is_empty() {
                if !result.is_empty() { result.push_str("\n"); }
                result.push_str("[stderr]\n");
                result.push_str(&stderr);
            }
            if result.is_empty() { result = format!("(exit: {:?})", out.status.code()); }
            Ok(result)
        }
        Err(e) => Err(format!("Error: {}", e)),
    }
}

#[tauri::command]
pub fn spawn_terminal(
    app: AppHandle,
    state: State<'_, TerminalState>,
    id: String,
    cwd: Option<String>,
) -> Result<(), String> {
    // Si ya existe, cerrar el anterior
    {
        let mut writers = state.writers.lock().unwrap();
        writers.remove(&id);
        let mut master = state.master.lock().unwrap();
        master.remove(&id);
    }

    let pty_system = native_pty_system();
    let pair = pty_system.openpty(PtySize {
        rows: 30,
        cols: 100,
        pixel_width: 0,
        pixel_height: 0,
    }).map_err(|e| format!("Error PTY: {}", e))?;

    let shell = if cfg!(target_os = "windows") {
        "powershell.exe"
    } else {
        "bash"
    };

    let mut cmd = CommandBuilder::new(shell);
    cmd.env("TERM", "xterm-256color");
    if let Some(dir) = &cwd {
        cmd.cwd(dir);
    }

    let _child = pair.slave.spawn_command(cmd).map_err(|e| format!("Error spawn: {}", e))?;

    let mut reader = pair.master.try_clone_reader().map_err(|e| format!("Error reader: {}", e))?;
    let writer = pair.master.take_writer().map_err(|e| format!("Error writer: {}", e))?;

    let writer_arc: Arc<Mutex<Box<dyn Write + Send>>> = Arc::new(Mutex::new(writer));

    {
        let mut map = state.writers.lock().unwrap();
        map.insert(id.clone(), writer_arc);
    }
    {
        let mut map = state.master.lock().unwrap();
        map.insert(id.clone(), Arc::new(Mutex::new(pair.master)));
    }

    let id_clone = id.clone();
    let app_clone = app.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let chunk = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_clone.emit(&format!("term-output-{}", id_clone), chunk);
                }
                Err(_) => break,
            }
        }
        let _ = app_clone.emit(&format!("term-exit-{}", id_clone), "exit");
    });

    Ok(())
}

#[tauri::command]
pub fn write_terminal(state: State<'_, TerminalState>, id: String, data: String) -> Result<(), String> {
    let writers = state.writers.lock().unwrap();
    if let Some(w) = writers.get(&id) {
        let mut guard = w.lock().unwrap();
        guard.write_all(data.as_bytes()).map_err(|e| format!("Error: {}", e))?;
        guard.flush().ok();
        Ok(())
    } else {
        Err(format!("Terminal {} no existe", id))
    }
}

#[tauri::command]
pub fn resize_terminal(state: State<'_, TerminalState>, id: String, rows: u16, cols: u16) -> Result<(), String> {
    let master = state.master.lock().unwrap();
    if let Some(m) = master.get(&id) {
        let guard = m.lock().unwrap();
        guard.resize(PtySize {
            rows: rows.max(1),
            cols: cols.max(1),
            pixel_width: 0,
            pixel_height: 0,
        }).map_err(|e| format!("Error resize: {}", e))?;
        Ok(())
    } else {
        Err(format!("Terminal {} no existe", id))
    }
}

#[tauri::command]
pub fn close_terminal(state: State<'_, TerminalState>, id: String) -> Result<(), String> {
    {
        let mut writers = state.writers.lock().unwrap();
        writers.remove(&id);
    }
    {
        let mut master = state.master.lock().unwrap();
        master.remove(&id);
    }
    Ok(())
}