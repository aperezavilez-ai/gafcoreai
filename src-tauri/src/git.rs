use std::process::Command;

fn git_run(args: &[&str], cwd: &str) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("Error git: {} (¿esta Git instalado?)", e))?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    if output.status.success() { Ok(stdout) }
    else { Err(format!("{}\n{}", stdout, stderr)) }
}

// Un valor que empieza con '-' seria interpretado por git como opcion (ej. --upload-pack=...).
fn reject_option_like(value: &str, what: &str) -> Result<(), String> {
    if value.starts_with('-') {
        return Err(format!("{} invalido: {}", what, value));
    }
    Ok(())
}

#[tauri::command]
pub async fn git_status(cwd: String) -> Result<String, String> {
    git_run(&["status", "--short"], &cwd)
}

#[tauri::command]
pub async fn git_init(cwd: String) -> Result<String, String> {
    git_run(&["init"], &cwd)
}

#[tauri::command]
pub async fn git_commit(cwd: String, message: String, files: Vec<String>) -> Result<String, String> {
    if files.is_empty() {
        git_run(&["add", "-A"], &cwd)?;
    } else {
        let mut args = vec!["add", "--"];
        let refs: Vec<&str> = files.iter().map(|s| s.as_str()).collect();
        args.extend(refs);
        git_run(&args, &cwd)?;
    }
    git_run(&["commit", "-m", &message], &cwd)
}

#[tauri::command]
pub async fn git_push(cwd: String, remote: Option<String>, branch: Option<String>) -> Result<String, String> {
    let remote = remote.unwrap_or_else(|| "origin".to_string());
    reject_option_like(&remote, "Remoto")?;
    match branch {
        Some(b) => {
            reject_option_like(&b, "Rama")?;
            git_run(&["push", &remote, &b], &cwd)
        }
        None => git_run(&["push"], &cwd),
    }
}

#[tauri::command]
pub async fn git_pull(cwd: String, remote: Option<String>, branch: Option<String>) -> Result<String, String> {
    match (remote, branch) {
        (Some(r), Some(b)) => {
            reject_option_like(&r, "Remoto")?;
            reject_option_like(&b, "Rama")?;
            git_run(&["pull", &r, &b], &cwd)
        }
        _ => git_run(&["pull"], &cwd),
    }
}

#[tauri::command]
pub async fn git_clone(url: String, dest: String) -> Result<String, String> {
    reject_option_like(&url, "URL")?;
    reject_option_like(&dest, "Destino")?;
    git_run(&["clone", "--", &url, &dest], ".")
}

#[tauri::command]
pub async fn git_log(cwd: String, limit: Option<usize>) -> Result<String, String> {
    let n = limit.unwrap_or(20);
    git_run(&["log", "--oneline", "-n", &n.to_string()], &cwd)
}

#[tauri::command]
pub async fn git_diff(cwd: String, staged: Option<bool>, file: Option<String>) -> Result<String, String> {
    let mut args = vec!["diff"];
    if staged.unwrap_or(false) {
        args.push("--cached");
    }
    if let Some(f) = file.as_deref() {
        args.push("--");
        args.push(f);
    }
    git_run(&args, &cwd)
}
