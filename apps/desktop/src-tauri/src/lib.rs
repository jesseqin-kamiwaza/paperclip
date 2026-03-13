use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, RunEvent, WebviewUrl, WebviewWindowBuilder,
};

/// Maximum number of seconds to wait for the server to become healthy.
const HEALTH_CHECK_TIMEOUT_SECS: u64 = 120;
/// Interval between health check polls in milliseconds.
const HEALTH_CHECK_INTERVAL_MS: u64 = 500;
/// The port the Paperclip server listens on.
const SERVER_PORT: u16 = 3100;

/// Shared handle to the server child process so we can kill it on exit.
struct ServerChild(Arc<Mutex<Option<Child>>>);

/// Poll the server health endpoint until it responds with 200.
async fn wait_for_server_ready() -> Result<(), String> {
    let url = format!("http://localhost:{}/api/health", SERVER_PORT);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {e}"))?;

    let deadline =
        tokio::time::Instant::now() + std::time::Duration::from_secs(HEALTH_CHECK_TIMEOUT_SECS);

    loop {
        match client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                log::info!("Server is ready on port {}", SERVER_PORT);
                return Ok(());
            }
            Ok(resp) => {
                log::debug!("Health check returned status {}", resp.status());
            }
            Err(e) => {
                log::debug!("Health check failed: {e}");
            }
        }

        if tokio::time::Instant::now() >= deadline {
            return Err(format!(
                "Server did not become ready within {} seconds",
                HEALTH_CHECK_TIMEOUT_SECS
            ));
        }

        tokio::time::sleep(std::time::Duration::from_millis(HEALTH_CHECK_INTERVAL_MS)).await;
    }
}

/// Find the solounicorn/paperclipai CLI command.
/// GUI apps on macOS have a minimal PATH, so we check common install locations.
fn find_cli_command() -> Option<String> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/default".to_string());

    // Common paths where npm/nvm/homebrew install global binaries
    let search_paths = vec![
        format!("{}/.local/bin", home),
        format!("{}/.npm-global/bin", home),
        format!("{}/.nvm/versions/node/v22.19.0/bin", home), // common nvm path
        "/usr/local/bin".to_string(),
        "/opt/homebrew/bin".to_string(),
        format!("{}/.cargo/bin", home),
    ];

    // Also try to detect nvm current version
    let nvm_dir = std::env::var("NVM_DIR")
        .unwrap_or_else(|_| format!("{}/.nvm", home));
    if let Ok(entries) = std::fs::read_dir(format!("{}/versions/node", nvm_dir)) {
        for entry in entries.flatten() {
            let bin_dir = entry.path().join("bin");
            if bin_dir.exists() {
                let path_str = bin_dir.to_string_lossy().to_string();
                if !search_paths.contains(&path_str) {
                    // Check this nvm version too
                    for cmd in &["solounicorn", "paperclipai"] {
                        let full = bin_dir.join(cmd);
                        if full.exists() {
                            return Some(full.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
    }

    for dir in &search_paths {
        for cmd in &["solounicorn", "paperclipai"] {
            let full_path = format!("{}/{}", dir, cmd);
            if std::path::Path::new(&full_path).exists() {
                return Some(full_path);
            }
        }
    }

    // Last resort: try bare command names (uses system PATH)
    for cmd in &["solounicorn", "paperclipai"] {
        if Command::new(cmd)
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
        {
            return Some(cmd.to_string());
        }
    }

    None
}

fn spawn_server() -> Result<Child, String> {
    let cli = find_cli_command().ok_or_else(|| {
        "Could not find 'solounicorn' or 'paperclipai' command. \
         Please install first: npm install -g solo-unicorn"
            .to_string()
    })?;

    log::info!("Starting server via: {} run", cli);

    Command::new(&cli)
        .arg("run")
        .env("SERVE_UI", "true")
        .env("PORT", SERVER_PORT.to_string())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn {} run: {}", cli, e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let app_handle = app.handle().clone();

            // ── Spawn the server ─────────────────────────────────────
            match spawn_server() {
                Ok(child) => {
                    app.manage(ServerChild(Arc::new(Mutex::new(Some(child)))));
                }
                Err(err) => {
                    log::error!("{}", err);
                    let _ = app_handle.emit("server-error", err);
                    // Still launch the app so user sees the error in UI
                    app.manage(ServerChild(Arc::new(Mutex::new(None))));
                }
            }

            // ── Wait for server readiness, then navigate WebView ─────
            let nav_handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                let _ = nav_handle.emit("server-starting", ());

                match wait_for_server_ready().await {
                    Ok(()) => {
                        let _ = nav_handle.emit("server-ready", ());
                        if let Some(window) = nav_handle.get_webview_window("main") {
                            let url = format!("http://localhost:{}", SERVER_PORT);
                            let _ = window.navigate(url.parse().unwrap());
                        }
                    }
                    Err(err) => {
                        log::error!("Server failed to start: {err}");
                        let _ = nav_handle.emit("server-error", err);
                    }
                }
            });

            // ── System tray ──────────────────────────────────────────
            let open_item =
                MenuItem::with_id(app, "open", "Open Solo Unicorn", true, None::<&str>)?;
            let restart_item =
                MenuItem::with_id(app, "restart", "Restart Server", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu =
                Menu::with_items(app, &[&open_item, &restart_item, &separator, &quit_item])?;

            let tray_handle = app_handle.clone();
            TrayIconBuilder::with_id("main-tray")
                .menu(&menu)
                .on_menu_event(move |app_handle, event| match event.id().as_ref() {
                    "open" => {
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        } else {
                            let url = format!("http://localhost:{}", SERVER_PORT);
                            let _ = WebviewWindowBuilder::new(
                                app_handle,
                                "main",
                                WebviewUrl::External(url.parse().unwrap()),
                            )
                            .title("Solo Unicorn")
                            .inner_size(1400.0, 900.0)
                            .center()
                            .build();
                        }
                    }
                    "restart" => {
                        let state = app_handle.state::<ServerChild>();
                        let mut guard = state.0.lock().unwrap();
                        if let Some(mut child) = guard.take() {
                            let _ = child.kill();
                            let _ = child.wait();
                        }

                        match spawn_server() {
                            Ok(new_child) => {
                                *guard = Some(new_child);
                                let nav = app_handle.clone();
                                tauri::async_runtime::spawn(async move {
                                    let _ = nav.emit("server-starting", ());
                                    if wait_for_server_ready().await.is_ok() {
                                        let _ = nav.emit("server-ready", ());
                                        if let Some(window) = nav.get_webview_window("main") {
                                            let url =
                                                format!("http://localhost:{}", SERVER_PORT);
                                            let _ = window.navigate(url.parse().unwrap());
                                        }
                                    }
                                });
                            }
                            Err(err) => {
                                log::error!("Failed to restart server: {err}");
                            }
                        }
                    }
                    "quit" => {
                        app_handle.exit(0);
                    }
                    _ => {}
                })
                .build(&tray_handle)?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Solo Unicorn")
        .run(|app_handle, event| {
            if let RunEvent::ExitRequested { .. } = &event {
                if let Some(state) = app_handle.try_state::<ServerChild>() {
                    let mut guard = state.0.lock().unwrap();
                    if let Some(mut child) = guard.take() {
                        log::info!("Shutting down server...");
                        let _ = child.kill();
                        let _ = child.wait();
                    }
                }
            }
        });
}
