// ============================================================
//  GafCoreAI - Shell real (comandos + PTY + resize)
// ============================================================

use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

pub struct TerminalSession {
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    master: Arc<Mutex<Box<dyn portable_pty::MasterPty + Send>>>,
    child: Arc<Mutex<Box<dyn portable_pty::Child + Send>>>,
}

pub struct TerminalState {
    sessions: Arc<Mutex<HashMap<String, TerminalSession>>>,
}

impl TerminalState {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

fn lock_sessions(
    state: &TerminalState,
) -> Result<std::sync::MutexGuard<'_, HashMap<String, TerminalSession>>, String> {
    state
        .sessions
        .lock()
        .map_err(|e| format!("Error lock terminal: {}", e))
}

#[derive(serde::Serialize)]
pub struct ShellResult {
    pub code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
}

fn exec_shell(cmd: &str, cwd: Option<String>) -> Result<ShellResult, String> {
    let dir = cwd.unwrap_or_else(|| ".".to_string());
    let output = if cfg!(target_os = "windows") {
        std::process::Command::new("cmd")
            .args(["/C", cmd])
            .current_dir(dir)
            .output()
    } else {
        std::process::Command::new("bash")
            .args(["-c", cmd])
            .current_dir(dir)
            .output()
    };
    let out = output.map_err(|e| format!("Error: {}", e))?;
    Ok(ShellResult {
        code: out.status.code(),
        stdout: String::from_utf8_lossy(&out.stdout).to_string(),
        stderr: String::from_utf8_lossy(&out.stderr).to_string(),
    })
}

#[tauri::command]
pub async fn run_shell(cmd: String, cwd: Option<String>) -> Result<String, String> {
    let r = exec_shell(&cmd, cwd)?;
    let mut result = r.stdout;
    if !r.stderr.is_empty() {
        if !result.is_empty() {
            result.push_str("\n");
        }
        result.push_str("[stderr]\n");
        result.push_str(&r.stderr);
    }
    if r.code != Some(0) {
        if !result.is_empty() {
            result.push_str("\n");
        }
        result.push_str(&format!("[exit code: {:?}]", r.code));
    } else if result.is_empty() {
        result = "(exit: 0)".to_string();
    }
    Ok(result)
}

#[tauri::command]
pub async fn run_shell_ex(cmd: String, cwd: Option<String>) -> Result<ShellResult, String> {
    exec_shell(&cmd, cwd)
}

#[tauri::command]
pub fn spawn_terminal(
    app: AppHandle,
    state: State<'_, TerminalState>,
    id: String,
    cwd: Option<String>,
) -> Result<(), String> {
    if let Some(prev) = lock_sessions(&state)?.remove(&id) {
        if let Ok(mut child) = prev.child.lock() {
            let _ = child.kill();
        }
    }

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: 30,
            cols: 100,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Error PTY: {}", e))?;

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

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Error spawn: {}", e))?;

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Error reader: {}", e))?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Error writer: {}", e))?;

    lock_sessions(&state)?.insert(
        id.clone(),
        TerminalSession {
            writer: Arc::new(Mutex::new(writer)),
            master: Arc::new(Mutex::new(pair.master)),
            child: Arc::new(Mutex::new(child)),
        },
    );

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
    let sessions = lock_sessions(&state)?;
    if let Some(session) = sessions.get(&id) {
        let mut guard = session
            .writer
            .lock()
            .map_err(|e| format!("Error lock writer: {}", e))?;
        guard
            .write_all(data.as_bytes())
            .map_err(|e| format!("Error: {}", e))?;
        guard.flush().ok();
        Ok(())
    } else {
        Err(format!("Terminal {} no existe", id))
    }
}

#[tauri::command]
pub fn resize_terminal(
    state: State<'_, TerminalState>,
    id: String,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    let sessions = lock_sessions(&state)?;
    if let Some(session) = sessions.get(&id) {
        let guard = session
            .master
            .lock()
            .map_err(|e| format!("Error lock master: {}", e))?;
        guard
            .resize(PtySize {
                rows: rows.max(1),
                cols: cols.max(1),
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Error resize: {}", e))?;
        Ok(())
    } else {
        Err(format!("Terminal {} no existe", id))
    }
}

#[tauri::command]
pub fn close_terminal(state: State<'_, TerminalState>, id: String) -> Result<(), String> {
    if let Some(session) = lock_sessions(&state)?.remove(&id) {
        if let Ok(mut child) = session.child.lock() {
            let _ = child.kill();
        }
    }
    Ok(())
}
