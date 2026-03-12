/**
 * Minimal frontend entry point for the Solo Unicorn desktop app.
 *
 * This script runs in the initial loading page (index.html). It listens for
 * Tauri events emitted by the Rust backend and updates the loading UI
 * accordingly. Once the server sidecar is healthy the Rust side navigates
 * the WebView to http://localhost:3100 automatically, so this script only
 * needs to handle the transient loading / error states.
 */

const statusEl = document.getElementById("status") as HTMLParagraphElement;
const errorEl = document.getElementById("error") as HTMLParagraphElement;
const spinnerEl = document.getElementById("spinner") as HTMLDivElement;

async function init() {
	// Dynamically import Tauri event API — this will only resolve inside a
	// Tauri WebView context. During plain browser development the import
	// will fail gracefully.
	try {
		const { listen } = await import("@tauri-apps/api/event");

		await listen("server-starting", () => {
			statusEl.textContent = "Starting server...";
			errorEl.classList.remove("visible");
			spinnerEl.style.display = "block";
		});

		await listen("server-ready", () => {
			statusEl.textContent = "Server is ready. Loading application...";
		});

		await listen<string>("server-error", (event) => {
			spinnerEl.style.display = "none";
			statusEl.textContent = "Failed to start server";
			errorEl.textContent = String(event.payload);
			errorEl.classList.add("visible");
		});

		await listen("server-terminated", () => {
			spinnerEl.style.display = "none";
			statusEl.textContent = "Server process terminated unexpectedly";
			errorEl.textContent =
				"The server process exited. Use the tray icon to restart.";
			errorEl.classList.add("visible");
		});
	} catch {
		// Not running inside Tauri — ignore.
		statusEl.textContent = "Waiting for Tauri runtime...";
	}
}

init();
