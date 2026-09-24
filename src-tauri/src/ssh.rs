use std::process::Command;

#[tauri::command]
pub async fn ssh_exec(
    host: String,
    user: String,
    cmd: String,
    port: Option<u16>,
    key_path: Option<String>,
) -> Result<String, String> {
    let mut args: Vec<String> = Vec::new();
    args.push("-o".to_string());
    args.push("StrictHostKeyChecking=no".to_string());
    args.push("-o".to_string());
    args.push("BatchMode=yes".to_string());
    if let Some(p) = port {
        args.push("-p".to_string());
        args.push(p.to_string());
    }
    if let Some(k) = key_path {
        args.push("-i".to_string());
        args.push(k);
    }
    args.push(format!("{}@{}", user, host));
    args.push(cmd);
    let output = Command::new("ssh")
        .args(&args)
        .output()
        .map_err(|e| format!("Error ssh: {} (¿OpenSSH instalado?)", e))?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    if output.status.success() { Ok(stdout) }
    else { Err(format!("{}\n{}", stdout, stderr)) }
}

#[tauri::command]
pub async fn ssh_test(
    host: String,
    user: String,
    port: Option<u16>,
    key_path: Option<String>,
) -> Result<String, String> {
    ssh_exec(host, user, "echo GafCoreAI-OK".to_string(), port, key_path).await
}
