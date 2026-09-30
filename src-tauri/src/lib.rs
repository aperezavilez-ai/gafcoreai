pub mod fs;
pub mod shell;
pub mod git;
pub mod ssh;
pub mod lsp;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            fs::read_file,
            fs::write_file,
            fs::list_dir,
            fs::file_exists,
            fs::create_dir,
            fs::delete_path,
            fs::rename_path,
            fs::get_file_info,
            fs::search_in_files,
            fs::get_project_root,
            fs::open_in_explorer,
            shell::run_shell,
            shell::run_shell_ex,
            shell::spawn_terminal,
            shell::write_terminal,
            shell::resize_terminal,
            shell::close_terminal,
            git::git_status,
            git::git_init,
            git::git_commit,
            git::git_push,
            git::git_pull,
            git::git_clone,
            git::git_log,
            git::git_diff,
            ssh::ssh_exec,
            ssh::ssh_test,
            lsp::lsp_spawn,
            lsp::lsp_send,
            lsp::lsp_kill,
            lsp::lsp_kill_all,
        ])
        .manage(shell::TerminalState::new())
        .manage(lsp::LspState::new())
                .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .run(tauri::generate_context!())
        .expect("Error al ejecutar GafCoreAI");
}
