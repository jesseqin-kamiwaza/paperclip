use std::sync::{Arc, Mutex};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, RunEvent, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_shell::{process::CommandChild, ShellExt};

/// Maximum number of seconds to wait for the server to become healthy.
const HEALTH_CHECK_TIMEOUT_SECS: u64 = 120;
/// Interval between health check polls in milliseconds.
const HEALTH_CHECK_INTERVAL_MS: u64 = 500;
/// The port the Paperclip server listens on.
const SERVER_PORT: u16 = 3100;

/// Shared handle to the sidecar child process so we can kill it on exit.
struct ServerChild(Arc<Mutex<Option<CommandChild>>>);

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let app_handle = app.handle().clone();

            // ── Spawn the server sidecar ───────────────────────────────
            let shell = app_handle.shell();
            let (mut rx, child) = shell
                .sidecar("binaries/solounicorn-server")
                .expect("failed to locate solounicorn-server sidecar binary")
                .env("SERVE_UI", "true")
                .env("PORT", SERVER_PORT.to_string())
                .spawn()
                .expect("failed to spawn solounicorn-server sidecar");

            // Store the child handle for graceful shutdown.
            app.manage(ServerChild(Arc::new(Mutex::new(Some(child)))));

            // Forward sidecar stdout/stderr to the Tauri log.
            let emit_handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_shell::process::CommandEvent;
                while let Some(event) = rx.recv().await {
                    match &event {
                        CommandEvent::Stdout(line) => {
                            let text = String::from_utf8_lossy(line);
                            log::info!("[server:stdout] {}", text);
                        }
                        CommandEvent::Stderr(line) => {
                            let text = String::from_utf8_lossy(line);
                            log::warn!("[server:stderr] {}", text);
                        }
                        CommandEvent::Terminated(payload) => {
                            log::error!(
                                "Server process terminated with code {:?}, signal {:?}",
                                payload.code,
                                payload.signal
                            );
                            let _ = emit_handle.emit("server-terminated", &payload.code);
                            break;
                        }
                        CommandEvent::Error(err) => {
                            log::error!("Server process error: {err}");
                        }
                        _ => {}
                    }
                }
            });

            // ── Wait for server readiness, then navigate WebView ───────
            let nav_handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                // Emit a "loading" event to the frontend
                let _ = nav_handle.emit("server-starting", ());

                match wait_for_server_ready().await {
                    Ok(()) => {
                        let _ = nav_handle.emit("server-ready", ());
                        // Navigate the main window to the server URL
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

            // ── System tray ────────────────────────────────────────────
            let open_item = MenuItem::with_id(app, "open", "Open Solo Unicorn", true, None::<&str>)?;
            let restart_item = MenuItem::with_id(app, "restart", "Restart Server", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&open_item, &restart_item, &separator, &quit_item])?;

            let tray_handle = app_handle.clone();
            TrayIconBuilder::with_id("main-tray")
                .menu(&menu)
                .on_menu_event(move |app_handle, event| {
                    match event.id().as_ref() {
                        "open" => {
                            if let Some(window) = app_handle.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            } else {
                                // Re-create the window if it was closed
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
                            // Kill existing server and respawn
                            let state = app_handle.state::<ServerChild>();
                            let mut guard = state.0.lock().unwrap();
                            if let Some(child) = guard.take() {
                                let _ = child.kill();
                            }

                            let shell = app_handle.shell();
                            let (mut rx, new_child) = shell
                                .sidecar("binaries/solounicorn-server")
                                .expect("failed to locate sidecar")
                                .env("SERVE_UI", "true")
                                .env("PORT", SERVER_PORT.to_string())
                                .spawn()
                                .expect("failed to respawn sidecar");

                            *guard = Some(new_child);

                            let emit = app_handle.clone();
                            tauri::async_runtime::spawn(async move {
                                use tauri_plugin_shell::process::CommandEvent;
                                while let Some(event) = rx.recv().await {
                                    match &event {
                                        CommandEvent::Stdout(line) => {
                                            let text = String::from_utf8_lossy(line);
                                            log::info!("[server:stdout] {}", text);
                                        }
                                        CommandEvent::Stderr(line) => {
                                            let text = String::from_utf8_lossy(line);
                                            log::warn!("[server:stderr] {}", text);
                                        }
                                        CommandEvent::Terminated(payload) => {
                                            let _ = emit.emit("server-terminated", &payload.code);
                                            break;
                                        }
                                        _ => {}
                                    }
                                }
                            });

                            // Wait for readiness and navigate
                            let nav = app_handle.clone();
                            tauri::async_runtime::spawn(async move {
                                let _ = nav.emit("server-starting", ());
                                if wait_for_server_ready().await.is_ok() {
                                    let _ = nav.emit("server-ready", ());
                                    if let Some(window) = nav.get_webview_window("main") {
                                        let url = format!("http://localhost:{}", SERVER_PORT);
                                        let _ = window.navigate(url.parse().unwrap());
                                    }
                                }
                            });
                        }
                        "quit" => {
                            app_handle.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(&tray_handle)?;

            Ok(())
        })
        .on_event(|app_handle, event| {
            if let RunEvent::ExitRequested { .. } = &event {
                // Gracefully kill the server sidecar on app exit.
                if let Some(state) = app_handle.try_state::<ServerChild>() {
                    let mut guard = state.0.lock().unwrap();
                    if let Some(child) = guard.take() {
                        log::info!("Shutting down server sidecar...");
                        let _ = child.kill();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Solo Unicorn");
}
